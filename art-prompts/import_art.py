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
    repository = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GH_TOKEN"]
    ART.mkdir(parents=True, exist_ok=True)
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
        if destination.exists() and game_id in manifest[kind]:
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
        if game_id not in manifest[kind]:
            manifest[kind].append(game_id)
        imported.append({"file": name, "bytes": len(encoded)})
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"imported": imported, "total": len(manifest["poster"]) + len(manifest["banner"])}))

if __name__ == "__main__":
    main()
