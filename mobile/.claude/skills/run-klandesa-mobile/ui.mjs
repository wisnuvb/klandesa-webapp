// Pembaca hierarki UI uiautomator (stdin = XML dump).
//   node ui.mjs texts            -> semua teks/content-desc yang terlihat, beserta pusatnya
//   node ui.mjs find "<teks>"    -> "x y" pusat elemen pertama yang teks/desc-nya memuat <teks> (huruf besar-kecil diabaikan; cocok persis diutamakan); exit 1 bila tidak ada
import { readFileSync } from 'node:fs';
const xml = readFileSync(0, 'utf8');
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, ' ');
const nodes = [...xml.matchAll(/<node [^>]*>/g)].map((m) => {
  const a = (k) => dec(new RegExp(` ${k}="([^"]*)"`).exec(m[0])?.[1] ?? '');
  const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(a('bounds'));
  if (!b) return null;
  const [x1, y1, x2, y2] = b.slice(1).map(Number);
  return { label: a('text') || a('content-desc'), x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2), w: x2 - x1, h: y2 - y1 };
}).filter((n) => n && n.label && n.w > 0 && n.h > 0);
const [cmd, arg] = process.argv.slice(2);
if (cmd === 'texts') for (const n of nodes) console.log(`${n.x},${n.y}\t${n.label.slice(0, 90)}`);
else if (cmd === 'find') {
  const q = (arg ?? '').toLowerCase();
  // peringkat: sama persis > berakhiran > diawali > memuat (tombol sering berlabel ", Masuk"; subjudul memuat kata yang sama)
  const rank = (l) => { l = l.toLowerCase(); return l === q ? 0 : l.endsWith(q) ? 1 : l.startsWith(q) ? 2 : l.includes(q) ? 3 : 9; };
  const n = nodes.map((n) => ({ n, r: rank(n.label) })).filter((x) => x.r < 9).sort((a, b) => a.r - b.r)[0]?.n;
  if (!n) process.exit(1);
  console.log(`${n.x} ${n.y}`);
} else { console.error('pakai: texts | find <teks>'); process.exit(2); }
