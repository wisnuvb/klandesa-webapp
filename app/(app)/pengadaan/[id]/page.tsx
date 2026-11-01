import { DetailView } from "../_components/DetailView";

export const metadata = { title: "Paket Pengadaan" };

export default async function PengadaanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetailView id={Number(id)} />;
}
