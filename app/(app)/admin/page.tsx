"use client";

import { OwnerDashboard } from "@/components/admin/metrics/OwnerDashboard";

/** Dasbor Owner (Paket C). Rute lama /api/admin/stats tetap ada untuk pemanggil lain. */
export default function AdminDashboardPage() {
  return <OwnerDashboard />;
}
