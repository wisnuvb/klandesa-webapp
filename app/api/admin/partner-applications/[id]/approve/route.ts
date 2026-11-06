import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { hashPassword } from "@/lib/auth";
import { ensurePartnerCommissionRule } from "@/lib/partner/commission";
import { ensurePartnerReferralCodeTx } from "@/lib/partner/referral-code";
import { actorOf, auditBefore } from "@/lib/platform/legacy-audit";
import { auditPlatform } from "@/lib/platform/audit";
import { readRisky } from "@/lib/platform/legacy-risky";
import { findPartnerEmailConflict, type EmailConflict } from "@/lib/partner/application-email";

/** Dilempar di dalam transaksi bila pendaftaran sudah diproses permintaan lain (balapan klik ganda). */
class AlreadyProcessed extends Error {}

/** Dilempar di dalam transaksi bila email pelamar ternyata sudah dimiliki akun lain (balapan dengan pembuatan akun). */
class EmailTaken extends Error {
  constructor(readonly conflict: EmailConflict) {
    super("email_taken");
  }
}

function conflictMessage(c: EmailConflict): string {
  return c.kind === "partner"
    ? `Email pelamar sudah terdaftar sebagai mitra (#${c.partnerId}, status ${c.status}). Persetujuan DITOLAK agar kata sandi dan profil mitra itu tidak tertimpa. Tolak pendaftaran ini dan hubungi pelamar, atau kelola akun mitra yang sudah ada.`
    : "Email pelamar sudah dipakai akun lain (admin platform/pemda). Persetujuan DITOLAK. Tolak pendaftaran ini dan minta pelamar memakai email lain.";
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const appId = BigInt(id);

  // Persetujuan membuat akun login mitra (akses): wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;

  const application = await prisma.partnerApplication.findUnique({
    where: { id: appId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      region: true,
      status: true,
      meta: true,
      passwordHash: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Pendaftaran tidak ditemukan" },
      { status: 404 },
    );
  }
  if (application.status !== "NEW") {
    return NextResponse.json(
      { error: "Pendaftaran sudah diproses" },
      { status: 400 },
    );
  }

  const appRow = application;
  const adminEmail = auth.admin.email;
  const approvedAt = new Date().toISOString();

  // Anti pengambilalihan akun: formulir publik tidak membuktikan kepemilikan email. Jika email sudah milik mitra lain
  // (atau admin platform/pemda), persetujuan ditolak: tidak ada sandi/profil yang ditimpa dan pendaftaran tetap NEW.
  const conflict = await findPartnerEmailConflict(prisma, application.email);
  if (conflict) {
    await auditPlatform(req, actorOf(auth), {
      action: "partner_application.approve_blocked",
      targetType: "system",
      targetId: `partner_application:${appId}`,
      summary: `Persetujuan pendaftaran mitra "${application.name}" ditolak: email sudah dimiliki ${conflict.kind === "partner" ? `mitra #${conflict.partnerId}` : "akun lain"}`,
      metadata: { reason: risky.reason, applicationId: appId.toString(), conflict: conflict.kind, existingPartnerId: conflict.kind === "partner" ? conflict.partnerId : null },
    });
    return NextResponse.json({ error: conflictMessage(conflict), code: "PARTNER_EMAIL_EXISTS" }, { status: 409 });
  }

  // Persetujuan membuat akun login mitra baru (akses) -> jejak ketat SEBELUM efek. Tanpa sandi/hash di jejak.
  const blocked = await auditBefore(req, actorOf(auth), {
    action: "partner_application.approve",
    targetType: "system",
    targetId: `partner_application:${appId}`,
    summary: `Menyetujui pendaftaran mitra "${application.name}" (wilayah ${application.region.slice(0, 80)}), akun mitra baru`,
    metadata: {
      reason: risky.reason,
      applicationId: appId.toString(),
      applicantPasswordApplied: Boolean(application.passwordHash),
      tempPasswordIssued: !application.passwordHash,
    },
  });
  if (blocked) return blocked;

  let result: Awaited<ReturnType<typeof runApproval>>;
  try {
    result = await runApproval();
  } catch (e) {
    if (e instanceof AlreadyProcessed) {
      return NextResponse.json({ error: "Pendaftaran sudah diproses" }, { status: 400 });
    }
    if (e instanceof EmailTaken) {
      return NextResponse.json({ error: conflictMessage(e.conflict), code: "PARTNER_EMAIL_EXISTS" }, { status: 409 });
    }
    throw e;
  }
  const { partnerRow, tempPassword, approveInfo, referralCode, sharePath } = result;

  async function runApproval() {
    return prisma.$transaction(async (tx) => {
    // Klaim atomik: hanya satu permintaan yang berhasil mengubah NEW -> APPROVED (tanpa akun/komisi/sandi ganda).
    const claim = await tx.partnerApplication.updateMany({
      where: { id: appRow.id, status: "NEW" },
      data: { status: "APPROVED" },
    });
    if (claim.count !== 1) throw new AlreadyProcessed();

    /** Hanya ada jika mitra baru & pendaftar tidak punya hash (data lama). */
    let tempPassword: string | null = null;
    /** Penjelasan singkat untuk admin (tanpa menyebut password). */
    let approveInfo!: string;
    // Cek ulang di dalam transaksi (balapan): akun yang sudah ada TIDAK PERNAH ditimpa sandi/profilnya.
    const taken = await findPartnerEmailConflict(tx, appRow.email);
    if (taken) throw new EmailTaken(taken);

    let row: { id: number };

    if (appRow.passwordHash) {
      row = await tx.partner.create({
        data: {
          email: appRow.email,
          password: appRow.passwordHash,
          name: appRow.name,
          phone: appRow.phone,
          region: appRow.region,
          status: "active",
        },
        select: { id: true },
      });
      approveInfo =
        "Mitra memakai password yang dibuatnya saat mengisi formulir pendaftaran.";
    } else {
      tempPassword = generateTempPassword();
      const hashed = await hashPassword(tempPassword);
      row = await tx.partner.create({
        data: {
          email: appRow.email,
          password: hashed,
          name: appRow.name,
          phone: appRow.phone,
          region: appRow.region,
          status: "active",
        },
        select: { id: true },
      });
      approveInfo =
        "Pendaftar tidak punya kata sandi tersimpan (data lama) — gunakan password sementara di bawah.";
    }

    const prevMeta =
      appRow.meta && typeof appRow.meta === "object"
        ? appRow.meta
        : null;
    const nextMeta = {
      ...(prevMeta as Record<string, unknown> | null),
      approvedAt,
      partnerId: row.id,
      approvedBy: adminEmail,
    };

    await tx.partnerApplication.update({
      where: { id: appRow.id },
      data: { status: "APPROVED", meta: nextMeta },
      select: { id: true },
    });

    await ensurePartnerCommissionRule(tx, row.id);

    const referral = await ensurePartnerReferralCodeTx(tx, row.id, {
      name: appRow.name,
      email: appRow.email,
      phone: appRow.phone,
    });

    const referralSuffix = referral.created
      ? ` Kode referral otomatis: ${referral.code}.`
      : ` Kode referral: ${referral.code}.`;
    approveInfo = `${approveInfo}${referralSuffix}`;

    return {
      partnerRow: row,
      tempPassword,
      approveInfo,
      referralCode: referral.code,
      sharePath: referral.sharePath,
    };
    });
  }

  return NextResponse.json(
    {
      ok: true,
      partnerId: partnerRow.id,
      tempPassword,
      approveInfo,
      referralCode,
      sharePath,
    },
    { status: 200 },
  );
}
