"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LetterPaper } from "@/components/letters/LetterPaper";
import type { LetterDocument } from "@/lib/letters/document/schema";
import { validateDocument } from "@/lib/letters/document/validate";
import { PAPER_SIZES } from "@/lib/letters/paper";
import { sampleLetterValues, type LetterValues } from "@/lib/letters/values";
import { printPaperElement } from "@/components/letters/print-paper";

/** Kertas dengan skala agar muat lebar kontainer (pratinjau), tetap tajam saat dicetak lewat iframe. */
function ScaledPaper({
  doc,
  values,
  mode,
  paperRef,
}: {
  doc: LetterDocument;
  values: LetterValues;
  mode: "preview" | "print";
  paperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const size = PAPER_SIZES[doc.page.size];
  const paperWidthMm = doc.page.orientation === "portrait" ? size.widthMm : size.heightMm;

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const px = (paperWidthMm / 25.4) * 96;
    const update = () => setScale(Math.min(1, Math.max(0.3, (el.clientWidth - 8) / px)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paperWidthMm]);

  return (
    <div ref={boxRef} className="w-full overflow-x-auto rounded-md bg-muted/40 p-2">
      {/* `zoom` ikut mengubah tinggi tata letak, tidak seperti transform: scale. */}
      <div style={{ width: `${paperWidthMm}mm`, zoom: scale, margin: "0 auto" }}>
        <div ref={paperRef} id="letter-paper-view">
          <LetterPaper doc={doc} values={values} mode={mode} />
        </div>
      </div>
    </div>
  );
}

type Loaded =
  | { id: number; state: "ready"; detail: { status: string; letterNumber: string; templateName: string; document: LetterDocument; values: LetterValues } }
  | { id: number; state: "error"; message: string };

/** Surat v2 di riwayat: lihat, cetak ulang, dan (untuk draf) lanjutkan mengedit. */
export function V2LetterDialog({ letterId, open, onOpenChange }: { letterId: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [printError, setPrintError] = useState(false);

  useEffect(() => {
    if (!open || letterId == null) return;
    let cancelled = false;
    fetch(`/api/letters/${letterId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || "Gagal memuat surat");
        return data;
      })
      .then((d) => {
        if (!cancelled) setLoaded({ id: letterId, state: "ready", detail: d });
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoaded({ id: letterId, state: "error", message: e instanceof Error ? e.message : "Gagal memuat surat" });
      });
    return () => {
      cancelled = true;
    };
  }, [open, letterId]);

  const current = loaded && loaded.id === letterId ? loaded : null;
  const ready = current?.state === "ready" ? current.detail : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[96vw] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{ready ? ready.templateName : "Surat"}</DialogTitle>
          <DialogDescription>
            {ready
              ? ready.status === "draft"
                ? "Draf — belum bernomor dan belum diterbitkan."
                : `Nomor ${ready.letterNumber || "—"}`
              : "Memuat surat…"}
          </DialogDescription>
        </DialogHeader>

        {!current && (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat surat…
          </div>
        )}
        {current?.state === "error" && (
          <p role="alert" className="py-6 text-sm text-destructive">{current.message}</p>
        )}
        {ready && (
          <>
            <ScaledPaper doc={ready.document} values={ready.values} mode="print" paperRef={paperRef} />
            {printError && (
              <p role="alert" className="text-sm text-destructive">
                Pencetakan tidak dapat dimulai. Izinkan jendela cetak pada peramban lalu coba lagi.
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                className="min-h-11 gap-2"
                onClick={() => void printPaperElement(paperRef.current, ready.document, ready.templateName).then((ok) => setPrintError(!ok))}
              >
                <Printer className="h-4 w-4" aria-hidden /> Cetak
              </Button>
              {ready.status === "draft" && letterId != null && (
                <Button variant="outline" className="min-h-11 gap-2" asChild>
                  <Link href={`/layanan-surat/buat?surat=${letterId}`}>
                    <Pencil className="h-4 w-4" aria-hidden /> Lanjutkan mengedit
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Tutup</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pratinjau jenis surat v2 dengan data contoh. Dua cara memberi dokumen:
 * - `document`: dokumen yang sudah dipegang pemanggil (editor, termasuk yang belum tersimpan);
 * - hanya `id`: diambil dari server saat dibuka (daftar jenis surat sengaja tidak membawa dokumen).
 */
export function V2TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: {
  template: { id?: number; name: string; document?: unknown } | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<{ id: number; doc: LetterDocument | null } | null>(null);
  const hasDocument = template?.document !== undefined;
  const templateId = hasDocument ? null : (template?.id ?? null);

  useEffect(() => {
    if (!open || templateId == null) return;
    let cancelled = false;
    fetch(`/api/mail-templates/${templateId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("gagal");
        return (await res.json()) as { templateStructure?: unknown };
      })
      .then((row) => {
        const v = validateDocument(row.templateStructure);
        if (!cancelled) setLoaded({ id: templateId, doc: v.ok ? v.doc : null });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id: templateId, doc: null });
      });
    return () => {
      cancelled = true;
    };
  }, [open, templateId]);

  const fetched = loaded && loaded.id === templateId ? loaded : null;
  const given = useMemo(() => {
    if (!hasDocument) return null;
    const v = validateDocument(template?.document);
    return { doc: v.ok ? v.doc : null };
  }, [hasDocument, template?.document]);
  const current = given ?? fetched;
  const doc = current?.doc ?? null;
  const values = useMemo(() => (doc ? sampleLetterValues(doc) : null), [doc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[96vw] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Pratinjau — {template?.name}</DialogTitle>
          <DialogDescription>Tampilan dengan data contoh. Data asli terisi saat surat dibuat.</DialogDescription>
        </DialogHeader>
        {!current ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat jenis surat…
          </div>
        ) : doc && values ? (
          <ScaledPaper doc={doc} values={values} mode="print" paperRef={paperRef} />
        ) : (
          <p role="alert" className="py-6 text-sm text-destructive">Jenis surat ini belum bisa ditampilkan.</p>
        )}
        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
