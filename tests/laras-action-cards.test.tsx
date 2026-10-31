import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { LarasActionCards } from "@/components/ai/LarasActionCards";
import type { ActionCard } from "@/lib/ai/laras-actions";

const future = new Date(Date.now() + 10 * 60_000).toISOString();
const card = (p: Partial<ActionCard> = {}): ActionCard => ({
  key: "mail_decision:1",
  type: "mail_decision",
  token: "t",
  badge: "Usulan: setujui",
  icon: "check",
  tone: "default",
  confirmLabel: "Setujui",
  doneText: "Permohonan disetujui. Warga akan diberi tahu.",
  heading: "REQ-001",
  subheading: "Surat Keterangan Domisili · Siti Aminah",
  noteLabel: "Catatan untuk warga: ",
  note: "",
  evidenceLabel: "",
  evidence: "",
  batchable: false,
  warnings: [],
  expiresAt: future,
  ...p,
});

test("kartu menampilkan usulan, pemohon, dan tombol konfirmasi dengan teks (bukan hanya warna)", () => {
  const html = renderToStaticMarkup(<LarasActionCards actions={[card()]} />);
  assert.match(html, /REQ-001/);
  assert.match(html, /Siti Aminah/);
  assert.match(html, /Usulan: setujui/);
  assert.match(html, />Setujui</);
  assert.match(html, />Lewati</);
  assert.match(html, /1 usulan menunggu konfirmasi Anda/);
});

test("penolakan memakai tombol 'Tolak' dan menampilkan catatan untuk warga", () => {
  const html = renderToStaticMarkup(
    <LarasActionCards actions={[card({ badge: "Usulan: tolak", icon: "x", tone: "destructive", confirmLabel: "Tolak", note: "Lampirkan fotokopi KK." })]} />,
  );
  assert.match(html, />Tolak</);
  assert.match(html, /Lampirkan fotokopi KK\./);
});

test("peringatan tampil dengan label untuk pembaca layar dan ikon disembunyikan dari aksesibilitas", () => {
  const html = renderToStaticMarkup(
    <LarasActionCards actions={[card({ warnings: ["NIK pemohon tidak ditemukan di data warga desa."] })]} />,
  );
  assert.match(html, /Peringatan: /);
  assert.match(html, /NIK pemohon tidak ditemukan/);
  assert.match(html, /aria-hidden="true"/);
});

test("konfirmasi massal hanya untuk >1 usulan yang ditandai server batchable DAN tanpa peringatan", () => {
  const two = renderToStaticMarkup(
    <LarasActionCards actions={[card({ key: "a", batchable: true }), card({ key: "b", heading: "REQ-002", batchable: true })]} />,
  );
  assert.match(two, /Konfirmasi 2 usulan berisiko rendah/);

  const withWarn = renderToStaticMarkup(
    <LarasActionCards actions={[card({ key: "a", batchable: true }), card({ key: "b", batchable: true, warnings: ["Sudah menunggu 20 hari."] })]} />,
  );
  assert.doesNotMatch(withWarn, /Konfirmasi \d+ usulan/);

  const one = renderToStaticMarkup(<LarasActionCards actions={[card({ batchable: true })]} />);
  assert.doesNotMatch(one, /Konfirmasi \d+ usulan/);
});

test("persetujuan/penolakan/penerbitan (batchable=false dari server) tidak pernah bisa massal", () => {
  const html = renderToStaticMarkup(<LarasActionCards actions={[card({ key: "a" }), card({ key: "b", heading: "REQ-002" })]} />);
  assert.doesNotMatch(html, /Konfirmasi \d+ usulan/);
});

test("kutipan tulisan warga (bukti) tampil di kartu sebagai teks biasa", () => {
  const html = renderToStaticMarkup(
    <LarasActionCards actions={[card({ evidenceLabel: "Keperluan (tulisan warga): ", evidence: "Untuk melamar pekerjaan di pabrik." })]} />,
  );
  assert.match(html, /Keperluan \(tulisan warga\): /);
  assert.match(html, /Untuk melamar pekerjaan di pabrik\./);
});

test("usulan kedaluwarsa tidak bisa dikonfirmasi dan memberi jalur pulih", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const html = renderToStaticMarkup(<LarasActionCards actions={[card({ expiresAt: past })]} />);
  assert.match(html, /Usulan kedaluwarsa\. Minta Laras menyusun ulang\./);
  assert.doesNotMatch(html, />Setujui</);
});

test("area hasil berupa live region sopan dan target sentuh ≥44px di layar kecil", () => {
  const html = renderToStaticMarkup(<LarasActionCards actions={[card()]} />);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /h-11/);
});

test("kartu pengaduan memakai teks dari server (badge, label tombol, label catatan)", () => {
  const html = renderToStaticMarkup(
    <LarasActionCards
      actions={[
        card({
          key: "report_action:5",
          type: "report_action",
          badge: "Usulan: kirim tanggapan",
          icon: "message",
          confirmLabel: "Kirim tanggapan",
          heading: "Laporan #5",
          subheading: "Lampu jalan · Lampu depan balai mati",
          noteLabel: "Tanggapan untuk pelapor: ",
          note: "Terima kasih, laporan Anda kami terima.",
        }),
      ]}
    />,
  );
  assert.match(html, /Usulan: kirim tanggapan/);
  assert.match(html, />Kirim tanggapan</);
  assert.match(html, /Laporan #5/);
  assert.match(html, /Tanggapan untuk pelapor: /);
});

test("kartu pengumuman menampilkan isi lengkap (baris baru dipertahankan) dan menyebut dampak tayang publik", () => {
  const html = renderToStaticMarkup(
    <LarasActionCards
      actions={[
        card({
          key: "announcement_publish:abc",
          type: "announcement_publish",
          badge: "Usulan: terbitkan pengumuman",
          icon: "message",
          confirmLabel: "Terbitkan sekarang",
          heading: "Kerja Bakti Minggu",
          subheading: "Pengumuman · Langsung tayang untuk publik setelah dikonfirmasi",
          noteLabel: "Isi pengumuman: ",
          note: "Baris satu\nBaris dua",
        }),
      ]}
    />,
  );
  assert.match(html, /Kerja Bakti Minggu/);
  assert.match(html, /Langsung tayang untuk publik/);
  assert.match(html, /whitespace-pre-wrap/);
  assert.match(html, />Terbitkan sekarang</);
});
