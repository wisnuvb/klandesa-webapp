import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { loadCoopApiContextWithCooperative, requireManage } from "@/lib/coop/api-context";
import { toCsv } from "@/lib/custom-data/schema";

/**
 * Unduh daftar anggota koperasi (CSV umum; format impor Simkopdes belum diketahui). Memuat NIK, jadi hanya pengelola
 * koperasi dan setiap unduhan tercatat di jejak audit.
 */
export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;
  const { cooperative, village, userId } = loaded.ctx;
  const members = await prisma.cooperativeMember.findMany({
    where: { cooperativeId: cooperative.id },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    include: { resident: { select: { nik: true, address: true, rt: true, rw: true, hamlet: true } } },
  });
  await auditWeb(req, { userId, village }, "export", "cooperative_members", cooperative.id, { rows: members.length });
  const rows = members.map((m, i) => [
    i + 1,
    m.membershipNumber ?? "",
    m.name,
    m.resident?.nik ?? m.nik ?? "",
    m.resident ? [m.resident.address, m.resident.rt ? `RT ${m.resident.rt}` : "", m.resident.rw ? `RW ${m.resident.rw}` : "", m.resident.hamlet ?? ""].filter(Boolean).join(", ") : "",
    m.joinedAt.toISOString().slice(0, 10),
    m.status === "active" ? "Aktif" : "Tidak aktif",
    m.boardTitle ?? "",
  ]);
  const csv = toCsv(["No", "Nomor Anggota", "Nama", "NIK", "Alamat", "Tanggal Masuk", "Status", "Jabatan Pengurus"], rows);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="anggota-koperasi.csv"`, "Cache-Control": "no-store" } });
}
