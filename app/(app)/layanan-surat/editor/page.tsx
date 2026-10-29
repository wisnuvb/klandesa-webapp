import { Suspense } from "react";
import { EditorClient } from "./_components/EditorClient";

export const metadata = { title: "Editor Jenis Surat" };

export default function EditorSuratPage() {
  return (
    <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-muted-foreground">Memuat editor…</p>}>
      <EditorClient />
    </Suspense>
  );
}
