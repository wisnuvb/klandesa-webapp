import { RpjmDetail } from "../_components/RpjmDetail";

export const metadata = { title: "Rincian RPJM Desa" };

export default async function RpjmPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RpjmDetail id={Number(id)} />;
}
