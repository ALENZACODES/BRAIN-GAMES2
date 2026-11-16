"""Import queued image blobs as validated WebP artwork."""
import base64
import io
import json
import os
import re
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets" / "art"
QUEUE = ROOT / "art-prompts" / "render-queue.json"

def main():
    queue = json.loads(QUEUE.read_text(encoding="utf-8"))
    manifest_path = ART / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    aliases = {"plan-do-review":"plandoreview","if-then-builder":"ifthen-builder"}
    for entry in queue:
        entry["id"] = aliases.get(entry["id"], entry["id"])
    for kind in ("poster", "banner"):
        suffix = ("-banner" if kind == "banner" else "") + ".webp"
        for old_id, new_id in aliases.items():
            old_path, new_path = ART / (old_id + suffix), ART / (new_id + suffix)
            if old_path.exists():
                if not new_path.exists():
                    old_path.rename(new_path)
                else:
                    old_path.unlink()
        manifest[kind] = list(dict.fromkeys(aliases.get(game_id, game_id) for game_id in manifest[kind]))
    repository = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GH_TOKEN"]
    ART.mkdir(parents=True, exist_ok=True)
    receipt_path = ART / "import-receipts.json"
    receipts = json.loads(receipt_path.read_text(encoding="utf-8")) if receipt_path.exists() else {}
    imported = []
    for entry in queue:
        game_id, kind, blob_sha = entry["id"], entry["kind"], entry["blob_sha"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", game_id):
            raise ValueError("Invalid game id")
        if kind not in ("poster", "banner") or not re.fullmatch(r"[0-9a-f]{40}", blob_sha):
            raise ValueError("Invalid art entry")
        expected = (1024, 1536) if kind == "poster" else (1536, 1024)
        name = game_id + ("-banner" if kind == "banner" else "") + ".webp"
        destination = ART / name
        replace_needed = entry.get("replace", False) and receipts.get(name) != blob_sha
        if destination.exists() and game_id in manifest[kind] and not replace_needed:
            with Image.open(destination) as existing:
                if existing.format == "WEBP" and existing.size == expected and destination.stat().st_size < 250000:
                    continue
        request = urllib.request.Request(
            "https://api.github.com/repos/" + repository + "/git/blobs/" + blob_sha,
            headers={"Authorization": "Bearer " + token,
                     "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28"})
        with urllib.request.urlopen(request, timeout=60) as response:
            blob = json.load(response)
        if blob.get("encoding") != "base64":
            raise ValueError("Unexpected blob encoding")
        source = base64.b64decode(blob["content"])
        with Image.open(io.BytesIO(source)) as original:
            if original.size != expected:
                raise ValueError("Wrong dimensions for " + name + ": " + str(original.size))
            image = original.convert("RGB")
            for quality in range(80, 19, -5):
                output = io.BytesIO()
                image.save(output, format="WEBP", quality=quality, method=6)
                if output.tell() < 250000:
                    break
            else:
                raise ValueError("Image exceeds size limit: " + name)
        encoded = output.getvalue()
        with Image.open(io.BytesIO(encoded)) as verified:
            if verified.format != "WEBP" or verified.size != expected:
                raise ValueError("WebP validation failed")
            verified.load()
        destination.write_bytes(encoded)
        receipts[name] = blob_sha
        if game_id not in manifest[kind]:
            manifest[kind].append(game_id)
        imported.append({"file": name, "bytes": len(encoded)})
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    receipt_path.write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")
    expected_ids = {game["id"] for game in json.loads((ROOT / "art-prompts" / "prompts.json").read_text(encoding="utf-8"))}
    audited = []
    missing = {}
    for kind in ("poster", "banner"):
        listed = manifest[kind]
        if len(listed) != len(set(listed)) or not set(listed).issubset(expected_ids):
            raise ValueError("Invalid manifest ids for " + kind)
        missing[kind] = sorted(expected_ids - set(listed))
        for game_id in listed:
            name = game_id + ("-banner" if kind == "banner" else "") + ".webp"
            path = ART / name
            expected = (1024, 1536) if kind == "poster" else (1536, 1024)
            with Image.open(path) as checked:
                if checked.format != "WEBP" or checked.size != expected or path.stat().st_size >= 250000:
                    raise ValueError("Art audit failed: " + name)
                checked.load()
            audited.append({"file": name, "bytes": path.stat().st_size, "width": expected[0], "height": expected[1]})
    report = {"complete": not any(missing.values()), "expected_images": len(expected_ids) * 2, "validated_images": len(audited), "missing": missing, "files": audited}
    (ART / "audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"imported": imported, "total": len(manifest["poster"]) + len(manifest["banner"])}))

if __name__ == "__main__":
    main()
