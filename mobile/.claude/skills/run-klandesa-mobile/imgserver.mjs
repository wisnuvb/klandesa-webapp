// Server gambar uji: foto1..4.png di http://localhost:8099 (seed.ts menunjuk ke sini). PNG gradien dibuat sendiri, tanpa dependensi.
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';

const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(w, h, rgb) {
  const row = 1 + w * 3, raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * row + 1 + x * 3, t = y / h;
    raw[o] = rgb[0] * (1 - t * 0.5); raw[o + 1] = rgb[1] * (1 - t * 0.5); raw[o + 2] = rgb[2] * (1 - t * 0.5);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const imgs = { 1: [60, 140, 90], 2: [200, 150, 60], 3: [70, 110, 190], 4: [170, 80, 110] };
createServer((req, res) => {
  const m = /^\/foto([1-4])\.png/.exec(req.url ?? '');
  if (!m) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': 'image/png' }).end(png(480, 600, imgs[m[1]]));
}).listen(8099, () => console.log('imgserver :8099'));
