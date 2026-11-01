import { BankSampahView } from "./BankSampahView";

export const metadata = { title: "Bank Sampah" };

export default async function BankSampahPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BankSampahView bankId={id} />;
}
