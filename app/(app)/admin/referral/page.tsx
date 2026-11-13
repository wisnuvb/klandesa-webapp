import { redirect } from "next/navigation";
import type { Metadata } from "next";

/** Rute mengarahkan ke gabungan kelola mitra & referral. */
export const metadata: Metadata = { title: "Referral Platform" };

export default function LegacyAdminReferralRedirect() {
  redirect("/admin/mitra?tab=referral");
}
