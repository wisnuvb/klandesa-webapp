import { RkpdesDetail } from "../_components/RkpdesDetail";

export const metadata = { title: "Rincian RKP Desa" };

export default async function RkpdesDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RkpdesDetail id={Number(id)} />;
}
