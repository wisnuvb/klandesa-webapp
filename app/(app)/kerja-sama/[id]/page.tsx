import { DetailView } from "../_components/DetailView";

export const metadata = { title: "Rincian Kerja Sama Desa" };

export default async function KerjaSamaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetailView id={Number(id)} />;
}
