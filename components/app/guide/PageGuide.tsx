"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, ChevronDown, CircleHelp, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FieldHelp, GuideBlock, PageGuide } from "@/lib/guides/types";

// Status "sudah dilihat" dibaca lewat useSyncExternalStore: aman SSR (server selalu "sudah", tanpa kedipan) dan
// penutupan di satu tempat langsung memperbarui tempat lain.
const keyOf = (id: string) => `klandesa:guide-seen:${id}`;
const listeners = new Set<() => void>();
const seenFallback = new Set<string>(); // mode privat: localStorage tak bisa ditulis, ingat selama sesi halaman
function isSeen(id: string): boolean {
  try { return seenFallback.has(id) || localStorage.getItem(keyOf(id)) === "1"; } catch { return seenFallback.has(id); }
}
function markSeen(id: string) {
  try { localStorage.setItem(keyOf(id), "1"); } catch { seenFallback.add(id); }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Tombol "Panduan" + modal. Taruh di header halaman, selalu di tempat yang sama agar bantuan mudah ditemukan. */
export function GuideButton({ guide, variant = "outline" }: { guide: PageGuide; variant?: "outline" | "ghost" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} className="min-h-11" onClick={() => { setOpen(true); markSeen(guide.id); }}>
        <CircleHelp aria-hidden="true" />{guide.buttonLabel ?? "Panduan"}
      </Button>
      <GuideDialog guide={guide} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Banner ajakan untuk pengunjung pertama; ditutup sekali, tidak muncul lagi. Tidak pernah membuka modal sendiri. */
export function FirstVisitBanner({ guide }: { guide: PageGuide }) {
  const show = !useSyncExternalStore(subscribe, () => isSeen(guide.id), () => true);
  const [open, setOpen] = useState(false);
  if (!show && !open) return null;
  return (
    <>
      {show ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm"><strong>Baru pertama kali di sini?</strong> {guide.bannerText ?? "Baca panduan singkat (sekitar 2 menit) sebelum mulai mengisi."}</p>
          <div className="flex items-center gap-1">
            <Button type="button" className="min-h-11" onClick={() => { setOpen(true); markSeen(guide.id); }}>Baca panduan</Button>
            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Tutup ajakan panduan" onClick={() => markSeen(guide.id)}><X aria-hidden="true" /></Button>
          </div>
        </div>
      ) : null}
      <GuideDialog guide={guide} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function GuideDialog({ guide, open, onOpenChange }: { guide: PageGuide; open: boolean; onOpenChange: (o: boolean) => void }) {
  const cols = guide.tabs.length === 1 ? "grid-cols-1" : guide.tabs.length === 2 ? "grid-cols-2" : guide.tabs.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-3 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>{guide.description}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={guide.tabs[0]?.id} className="flex min-h-0 flex-1 flex-col">
          {guide.tabs.length > 1 ? (
            <TabsList className={`grid h-auto w-full ${cols}`}>
              {guide.tabs.map((t) => <TabsTrigger key={t.id} value={t.id} className="min-h-10">{t.label}</TabsTrigger>)}
            </TabsList>
          ) : null}
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
            {guide.tabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="space-y-5">
                {t.blocks.map((b, i) => <Block key={i} block={b} />)}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function BlockTitle({ children }: { children?: string }) {
  return children ? <h3 className="mb-2 text-sm font-semibold">{children}</h3> : null;
}

function Block({ block: b }: { block: GuideBlock }) {
  switch (b.type) {
    case "steps":
      return (
        <div>
          <BlockTitle>{b.title}</BlockTitle>
          <ol className="space-y-3">
            {b.items.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                <div><p className="font-medium">{s.title}</p><p className="text-sm text-muted-foreground">{s.body}</p></div>
              </li>
            ))}
          </ol>
        </div>
      );
    case "list":
      return (
        <div>
          <BlockTitle>{b.title}</BlockTitle>
          <ul className="space-y-2 text-sm">
            {b.items.map((t) => <li key={t} className="flex gap-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" /><span>{t}</span></li>)}
          </ul>
        </div>
      );
    case "split":
      return (
        <section className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
          {[b.left, b.right].map((c) => (
            <div key={c.title}>
              <p className="text-sm font-medium">{c.title}</p>
              {c.items.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{c.items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">{c.empty ?? "Tidak ada."}</p>}
            </div>
          ))}
        </section>
      );
    case "cards":
      return (
        <div className="space-y-3">
          <BlockTitle>{b.title}</BlockTitle>
          {b.items.map((c) => (
            <div key={c.title} className={`rounded-lg border p-3 ${c.highlight ? "border-primary bg-primary/5" : ""}`}>
              <p className="font-medium">{c.title}{c.badge ? <span className="ml-2 text-xs font-normal text-primary">({c.badge})</span> : null}</p>
              <p className="mt-1 text-sm">{c.body}</p>
              {c.facts?.length ? (
                <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
                  {c.facts.map((f) => <div key={f.label} className="contents"><dt className="font-medium text-foreground">{f.label}</dt><dd>{f.value}</dd></div>)}
                </dl>
              ) : null}
            </div>
          ))}
        </div>
      );
    case "glossary":
      return (
        <div>
          <BlockTitle>{b.title ?? "Istilah yang sering muncul"}</BlockTitle>
          <dl className="space-y-2 text-sm">
            {b.items.map((g) => <div key={g.term}><dt className="inline font-medium">{g.term}</dt><dd className="inline text-muted-foreground"> — {g.meaning}</dd></div>)}
          </dl>
        </div>
      );
    case "note":
      return <p className="text-xs text-muted-foreground">{b.text}</p>;
  }
}

/**
 * Petunjuk bahasa awam + contoh yang bisa dibuka di bawah satu kolom. Contoh tidak pernah disalin ke kolom.
 * `id` = id kolom (input); tip diberi id `${id}-hint` untuk aria-describedby pada kolom.
 */
export function FieldHelpBlock({ id, help }: { id: string; help: FieldHelp }) {
  return (
    <>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">{help.tip}</p>
      {help.example ? (
        <Collapsible className="group">
          <CollapsibleTrigger className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Lihat contoh isian<ChevronDown aria-hidden="true" className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <blockquote className="rounded-md border-l-4 border-primary/40 bg-muted/50 p-3 text-sm">
              {help.example}
              <footer className="mt-2 text-xs text-muted-foreground">Hanya contoh bentuk. Isi sesuai keadaan desa Anda.{help.ref ? ` · Rujukan: ${help.ref}` : ""}</footer>
            </blockquote>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </>
  );
}
