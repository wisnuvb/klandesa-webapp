import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth";
import { ensurePartnerCommissionRule } from "@/lib/partner/commission";
import type { DbTx } from "@/lib/partner/commission";

function normalizeOwnerEmail(email: unknown): string | null {
  const raw = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return raw.slice(0, 254);
}

/**
 * Tautkan `ReferralCode` ke rekaman `Partner` (buat jika belum ada), dan pastikan `PartnerCommissionRule` ada.
 * Wajib `ownerEmail` valid supaya akses portal mitra bisa lewat akun desa dengan email sama.
 *
 * Satu Partner hanya boleh punya satu ReferralCode (unique `partnerId` pada kode referral).
 */
export async function provisionPartnerFromReferralCodeTx(
  tx: DbTx,
  referralCodeId: number,
): Promise<{ partnerId: number }> {
  const ref = await tx.referralCode.findUnique({
    where: { id: referralCodeId },
    select: {
      id: true,
      code: true,
      label: true,
      ownerName: true,
      ownerPhone: true,
      ownerEmail: true,
      partnerId: true,
      status: true,
    },
  });
  if (!ref) throw new Error("Kode referral tidak ditemukan");

  if (ref.partnerId != null) {
    await ensurePartnerCommissionRule(tx, ref.partnerId);
    return { partnerId: ref.partnerId };
  }

  const email = normalizeOwnerEmail(ref.ownerEmail);
  if (!email) {
    throw new Error("Email pemilik referral wajib diisi untuk menautkan ke mitra");
  }

  const displayName =
    ref.ownerName?.trim() ||
    ref.label?.trim() ||
    ref.code;

  let partner =
    (await tx.partner.findUnique({
      where: { email },
      select: {
        id: true,
      },
    })) ?? null;

  if (!partner) {
    const hashed = await hashPassword(randomBytes(32).toString("base64url"));
    partner = await tx.partner.create({
      data: {
        email,
        password: hashed,
        name: displayName.slice(0, 255),
        phone: ref.ownerPhone?.trim()?.slice(0, 40) || null,
        region: null,
        status: "active",
      },
      select: { id: true },
    });
  } else {
    const otherRefWithSamePartner = await tx.referralCode.findFirst({
      where: {
        partnerId: partner.id,
        NOT: { id: referralCodeId },
      },
      select: { code: true },
    });
    if (otherRefWithSamePartner) {
      throw new Error(
        `Mitra untuk email ini sudah punya kode referral (${otherRefWithSamePartner.code}).`,
      );
    }

    await tx.partner.update({
      where: { id: partner.id },
      data: {
        name: displayName.slice(0, 255),
        ...(ref.ownerPhone?.trim()
          ? { phone: ref.ownerPhone.trim().slice(0, 40) }
          : {}),
        status: "active",
      },
    });
  }

  await tx.referralCode.update({
    where: { id: referralCodeId },
    data: { partnerId: partner.id },
  });

  await ensurePartnerCommissionRule(tx, partner.id);

  return { partnerId: partner.id };
}
