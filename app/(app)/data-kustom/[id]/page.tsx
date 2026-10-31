import { TabelView } from "../_components/TabelView";

export const metadata = { title: "Data Kustom" };

export default async function TabelKustomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TabelView id={id} />;
}
