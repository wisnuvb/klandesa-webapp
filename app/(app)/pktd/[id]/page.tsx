import { PktdDetail } from "../_components/PktdDetail";

export const metadata = { title: "Kegiatan Padat Karya Tunai Desa" };

export default async function PktdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PktdDetail id={Number(id)} />;
}
