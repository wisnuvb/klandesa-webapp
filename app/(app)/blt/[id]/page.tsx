import { BltDetail } from "../_components/BltDetail";

export const metadata = { title: "Program BLT Desa" };

export default async function BltDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BltDetail id={Number(id)} />;
}
