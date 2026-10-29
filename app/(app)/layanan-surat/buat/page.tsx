import { Suspense } from "react";
import { BuatSuratClient } from "./BuatSuratClient";

export const metadata = { title: "Buat Surat" };

export default function BuatSuratPage() {
  return (
    <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-muted-foreground">Memuat…</p>}>
      <BuatSuratClient />
    </Suspense>
  );
}
