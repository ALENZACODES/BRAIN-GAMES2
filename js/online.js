// Live 2-player rooms. Two phones connect directly (WebRTC) using PeerJS; the public PeerJS server only introduces them.
// Messages are small JSON objects: { t: type, ...data }.
import { CONFIG } from './config.js';

const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const prefix = () => `prismind-${CONFIG.key}-`;
export const newCode = () => Array.from({ length: 5 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

let lib = null;
function loadLib() {
  if (window.Peer) return Promise.resolve();
  return (lib ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js';
    s.onload = res; s.onerror = () => { lib = null; rej(new Error('offline')); }; document.head.append(s);
  }));
}
function peerOpts() { // test hook: ?peerhost=127.0.0.1&peerport=9000 uses a local PeerJS server
  const q = new URLSearchParams(location.search), host = q.get('peerhost');
  return host ? { host, port: +q.get('peerport') || 9000, path: '/', secure: false, debug: 0 } : { debug: 0 };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Room extends EventTarget {
  constructor(role) { super(); this.role = role; this.peer = null; this.conn = null; this.code = ''; this.lastSeen = 0; this.closed = false; this.oppName = ''; this.inbox = []; this.onmsg = null; }
  /** Game messages wait in a queue until the app attaches its handler, so none are lost while joining. */
  listen(fn) { this.onmsg = fn; this.inbox.splice(0).forEach((d) => fn(d)); }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /** Host: claim a free 5-letter code and wait for a friend. */
  static async create(name) {
    await loadLib();
    const room = new Room('host'); room.myName = name;
    for (let i = 0; i < 4; i++) {
      const code = newCode();
      const ok = await new Promise((resolve) => {
        const peer = new window.Peer(prefix() + code, peerOpts());
        const t = setTimeout(() => { peer.destroy(); resolve('timeout'); }, 15000);
        let opened = false;
        peer.on('open', () => { opened = true; clearTimeout(t); room.peer = peer; room.code = code; resolve('ok'); });
        // Errors after the room is open (e.g. a stray notice from the connection server) must not close a working room.
        peer.on('error', (e) => { if (opened) return; clearTimeout(t); peer.destroy(); resolve(e.type === 'unavailable-id' ? 'taken' : 'error:' + e.type); });
      });
      if (ok === 'ok') break;
      if (ok !== 'taken') throw new Error(ok);
    }
    if (!room.peer) throw new Error('no-code');
    room.peer.on('connection', (conn) => {
      if (room.conn && room.conn.open) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 400); }); return; }
      room.attach(conn);
    });
    room.watchPeer();
    return room;
  }

  /** Guest: connect to a friend's code. */
  static async join(code, name) {
    await loadLib();
    const room = new Room('guest'); room.myName = name; room.code = code;
    room.peer = await new Promise((resolve, reject) => {
      const peer = new window.Peer(undefined, peerOpts());
      const t = setTimeout(() => { peer.destroy(); reject(new Error('timeout')); }, 15000);
      let opened = false;
      peer.on('open', () => { opened = true; clearTimeout(t); resolve(peer); });
      peer.on('error', (e) => { if (opened) return; clearTimeout(t); peer.destroy(); reject(new Error(e.type)); });
    });
    await new Promise((resolve, reject) => {
      const conn = room.peer.connect(prefix() + code, { reliable: true, serialization: 'json' });
      const t = setTimeout(() => reject(new Error('not-found')), 15000);
      // "peer-unavailable" can also arrive late for a connection that is already working, so wait briefly before giving up.
      room.peer.on('error', (e) => {
        if (room.oppName) return;
        if (e.type === 'peer-unavailable') setTimeout(() => { if (!room.oppName) { clearTimeout(t); reject(new Error('not-found')); } }, 3000);
        else { clearTimeout(t); reject(new Error(e.type)); }
      });
      room.addEventListener('peer', () => { clearTimeout(t); resolve(); }, { once: true });
      room.addEventListener('full', () => { clearTimeout(t); reject(new Error('full')); }, { once: true });
      room.attach(conn);
    }).catch((e) => { room.close(true); throw e; });
    room.watchPeer();
    return room;
  }

  attach(conn) {
    this.conn = conn;
    const hello = () => { this.lastSeen = Date.now(); conn.send({ t: 'hello', name: this.myName, v: 1 }); };
    if (conn.open) hello(); else conn.on('open', hello);
    conn.on('data', (d) => {
      if (!d || typeof d !== 'object') return;
      this.lastSeen = Date.now();
      if (d.t === 'ping') return;
      if (d.t === 'full') return this.emit('full');
      if (d.t === 'hello') { this.oppName = String(d.name || 'Friend').slice(0, 14); return this.emit('peer', this.oppName); }
      if (d.t === 'bye') return this.lost('left');
      if (this.onmsg) this.onmsg(d); else this.inbox.push(d);
    });
    conn.on('close', () => this.lost('closed'));
    conn.on('error', () => this.lost('error'));
    clearInterval(this.hb);
    this.hb = setInterval(() => {
      if (!this.conn?.open) return;
      try { this.conn.send({ t: 'ping' }); } catch {}
      if (Date.now() - this.lastSeen > 20000) this.lost('timeout');
    }, 4000);
  }
  watchPeer() { this.peer.on('disconnected', () => { if (!this.closed) try { this.peer.reconnect(); } catch {} }); }
  lost(reason) {
    if (this.closed || !this.conn) return;
    const had = this.conn; this.conn = null; clearInterval(this.hb);
    try { had.close(); } catch {}
    this.emit('lost', reason);
  }
  get connected() { return !!this.conn?.open; }
  send(t, data = {}) { try { if (this.conn?.open) this.conn.send({ t, ...data }); } catch {} }
  async close(silent) {
    if (this.closed) return; this.closed = true; clearInterval(this.hb);
    if (!silent) { this.send('bye'); await wait(150); }
    try { this.conn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
  }
}
