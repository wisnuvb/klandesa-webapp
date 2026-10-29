"use client";

import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTemplateDocument } from "../_hooks/useTemplateDocument";
import { NoticeBanner, TopBar } from "./TopBar";
import { EditorWorkspace } from "./EditorWorkspace";

const toId = (v: string | null) => {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Membaca URL (`templateId` / `forkFromId` / `start`) lalu memuat dokumen sebelum editor dipasang. */
export function EditorClient() {
  const params = useSearchParams();
  const tpl = useTemplateDocument({
    templateId: toId(params.get("templateId")),
    forkFromId: toId(params.get("forkFromId")),
    start: params.get("start") ?? undefined,
  });

  if (tpl.status === "unsupported" || tpl.status === "needsFork") {
    return (
      <div className="-m-6 min-h-[50vh]">
        <NoticeBanner kind={tpl.status} message={tpl.message} onFork={tpl.forkFromCatalog} />
      </div>
    );
  }

  if (!tpl.initialDoc) {
    return (
      <div className="-m-6">
        <TopBar name="" onNameChange={() => {}} nameDisabled status="loading" />
        <p role="status" className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> Memuat editor…
        </p>
      </div>
    );
  }

  // `docKey` berganti saat dokumen dimuat ulang, sehingga state editor (undo/redo, pilihan) dimulai bersih.
  return <EditorWorkspace key={tpl.docKey} tpl={tpl} initialDoc={tpl.initialDoc} />;
}
