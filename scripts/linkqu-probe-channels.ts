/**
 * Uji kanal pembayaran LinkQu dari terminal (alternatif panel admin: Admin > Kanal Pembayaran > "Uji semua kanal").
 *
 *   node --env-file=.env --import tsx scripts/linkqu-probe-channels.ts
 *
 * Membuat tagihan uji kecil per kanal; tidak pernah dibayar dan kedaluwarsa sendiri. MENOLAK jalan di produksi
 * (api.linkqu.id) kecuali memakai --allow-production. Hasilnya hanya dicetak; atur status kanal di panel admin.
 */
import { getLinkquMode, probeChannels } from "../lib/payment/channel-probe";
import { listAllLinkquChannels } from "../lib/payment/linkqu-channels";

async function main() {
  const { mode, host } = getLinkquMode();
  if (mode === "unconfigured") {
    console.error("LINKQU_URL belum diisi.");
    process.exit(1);
  }
  if (mode === "production" && !process.argv.includes("--allow-production")) {
    console.error(`Menolak probe ke produksi (${host}). Tambahkan --allow-production bila Anda yakin.`);
    process.exit(1);
  }
  console.log(`Probe ke ${host} (${mode})\n`);

  const results = await probeChannels(listAllLinkquChannels().map((c) => c.code));
  const w = Math.max(...results.map((r) => r.code.length));
  const tag = { ok: "OK   ", rejected: "TOLAK", error: "ERROR" } as const;
  for (const r of results) console.log(`${tag[r.kind]} ${r.code.padEnd(w)}  ${r.message}`);
  const rejected = results.filter((r) => r.kind === "rejected").map((r) => r.code);
  console.log(`\nDitolak: ${rejected.join(", ") || "-"}`);
  console.log("Nonaktifkan di Admin > Kanal Pembayaran, atau isi LINKQU_DISABLED_CHANNELS bila ingin dikunci lewat env.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
