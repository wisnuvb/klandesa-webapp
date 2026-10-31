import { DashboardView } from "./DashboardView";

export const metadata = { title: "Aplikasi Desa" };

export default async function AplikasiPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  return <DashboardView id={Number.isInteger(id) && id > 0 ? id : 0} />;
}
