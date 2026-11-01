import { MeetingDetail } from "../_components/MeetingDetail";

export const metadata = { title: "Rincian Musyawarah Desa" };

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDetail id={Number(id)} />;
}
