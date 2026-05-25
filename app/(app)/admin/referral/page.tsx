import { redirect } from "next/navigation";

/** Rute mengarahkan ke gabungan kelola mitra & referral. */
export default function LegacyAdminReferralRedirect() {
  redirect("/admin/mitra?tab=referral");
}
