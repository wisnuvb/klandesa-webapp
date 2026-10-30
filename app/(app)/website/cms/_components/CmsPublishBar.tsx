"use client";

import { memo } from "react";
import { CheckCircle2, CircleDot, History, Rocket, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CmsHistoryItem = { id: string; published_at: string };

type Props = {
  hasDraft: boolean;
  /** Ada isian di formulir yang belum disimpan ke draf */
  isDirty: boolean;
  busy: boolean;
  history: CmsHistoryItem[];
  onPublish: () => void;
  onDiscard: () => void;
  onRestore: (id: string) => void;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const CmsPublishBar = memo(function CmsPublishBar({
  hasDraft,
  isDirty,
  busy,
  history,
  onPublish,
  onDiscard,
  onRestore,
}: Props) {
  const pending = hasDraft || isDirty;

  return (
    <Card className={pending ? "border-amber-300 bg-amber-50/60" : undefined}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-start gap-3">
          {pending ? (
            <CircleDot className="mt-0.5 size-5 text-amber-600" aria-hidden />
          ) : (
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" aria-hidden />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {isDirty
                ? "Ada perubahan yang belum disimpan"
                : hasDraft
                  ? "Draf belum diterbitkan"
                  : "Semua perubahan sudah tayang"}
              {pending ? <Badge variant="secondary">Draf</Badge> : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {pending
                ? "Pengunjung masih melihat versi sebelumnya sampai Anda menekan Terbitkan."
                : "Website yang dilihat pengunjung sama dengan yang tampil di sini."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={busy || history.length === 0}>
                <History className="size-4" />
                Riwayat
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Versi yang pernah tayang</DropdownMenuLabel>
              {history.map((h) => (
                <DropdownMenuItem key={h.id} onSelect={() => onRestore(h.id)}>
                  <div className="flex flex-col">
                    <span className="text-sm">{formatWhen(h.published_at)}</span>
                    <span className="text-muted-foreground text-xs">
                      Pulihkan sebagai draf
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={busy || !hasDraft}>
                <Undo2 className="size-4" />
                Buang draf
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Buang semua perubahan draf?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tampilan kembali ke versi yang sedang tayang. Perubahan yang
                  belum diterbitkan akan hilang dan tidak bisa dikembalikan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={onDiscard}>Buang draf</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button type="button" onClick={onPublish} disabled={busy || !pending}>
            <Rocket className="size-4" />
            Terbitkan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
