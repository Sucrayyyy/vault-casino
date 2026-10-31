// Provably fair RNG, same scheme as crypto casinos:
// float_i = bytes of HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}:${round}`), 4 bytes per float.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const W = new Uint32Array(64);

export function sha256(msg) {
  const len = msg.length;
  const total = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[len] = 0x80;
  const bits = len * 8;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, bits >>> 0);
  dv.setUint32(total - 8, Math.floor(bits / 0x100000000));
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15], b = W[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => odv.setUint32(i * 4, v >>> 0));
  return out;
}

const enc = new TextEncoder();

export function hmac(key, msg) {
  let k = typeof key === 'string' ? enc.encode(key) : key;
  if (k.length > 64) k = sha256(k);
  const ipad = new Uint8Array(64 + msg.length), opad = new Uint8Array(96);
  for (let i = 0; i < 64; i++) {
    const b = k[i] || 0;
    ipad[i] = b ^ 0x36;
    opad[i] = b ^ 0x5c;
  }
  ipad.set(typeof msg === 'string' ? enc.encode(msg) : msg, 64);
  opad.set(sha256(ipad), 64);
  return sha256(opad);
}

export const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const sha256Hex = (str) => toHex(sha256(enc.encode(str)));

export function randomHex(n = 32) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return toHex(b);
}

export function floatsFor(server, client, nonce, count) {
  const out = [];
  for (let round = 0; out.length < count; round++) {
    const bytes = hmac(server, `${client}:${nonce}:${round}`);
    for (let i = 0; i < 32 && out.length < count; i += 4) {
      out.push(bytes[i] / 256 + bytes[i + 1] / 65536 + bytes[i + 2] / 16777216 + bytes[i + 3] / 4294967296);
    }
  }
  return out;
}

// state = { server, client, nonce, prev: [{server, client, nonce}] }
export class Fair {
  constructor(state) {
    this.s = state;
    if (!this.s.server) this.reset();
  }
  reset() {
    this.s.server = randomHex(32);
    this.s.client = randomHex(8);
    this.s.nonce = 0;
    this.s.prev = this.s.prev || [];
  }
  get hashed() { return sha256Hex(this.s.server); }
  // One bet = one nonce. Returns `count` uniform floats in [0,1).
  bet(count = 1) {
    const f = floatsFor(this.s.server, this.s.client, this.s.nonce, count);
    this.s.nonce++;
    return f;
  }
  rotate(client) {
    this.s.prev.unshift({ server: this.s.server, client: this.s.client, nonce: this.s.nonce });
    this.s.prev = this.s.prev.slice(0, 5);
    this.s.server = randomHex(32);
    this.s.client = client || randomHex(8);
    this.s.nonce = 0;
  }
}

// Helpers working on a float stream
export function stream(floats) {
  let i = 0;
  return () => floats[i++ % floats.length];
}

// Fisher–Yates style pick of k distinct indices out of n (casino "mines" method)
export function pickDistinct(floats, n, k) {
  const pool = Array.from({ length: n }, (_, i) => i);
  const res = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(floats[i] * pool.length);
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}

// Weighted pick: items [{w}] with float f
export function weighted(items, f, key = 'w') {
  const total = items.reduce((s, it) => s + it[key], 0);
  let x = f * total;
  for (const it of items) {
    x -= it[key];
    if (x < 0) return it;
  }
  return items[items.length - 1];
}

// "Crash style" multiplier with 1% edge: P(result >= x) = 0.99 / x
export function crashPoint(f) {
  const v = Math.floor((99 / (1 - f)) ) / 100;
  return Math.max(1, Math.min(v, 1e6));
}
