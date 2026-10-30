"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, FileText, Clock, FileEdit, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { TemplateBody } from "./types";
import { useLayananSuratData } from "./_hooks/useLayananSuratData";
import { TemplateGrid } from "./_components/TemplateGrid";
import { LetterHistoryTab } from "./_components/LetterHistoryTab";
import { NewTemplateDialog, V2TemplatePreviewDialog } from "./_components/LazyDialogs";
import { TemplatePicker } from "./buat/_components/TemplatePicker";

const PAGE_TABS = ["buat", "riwayat", "template"] as const;
type PageTab = (typeof PAGE_TABS)[number];

/** Tab terakhir dibuka disimpan di peramban agar kembali ke halaman ini tetap di tab yang sama. */
const LAST_TAB_KEY = "layanan-surat:tab-terakhir";

const isPageTab = (v: string | null): v is PageTab => v != null && (PAGE_TABS as readonly string[]).includes(v);

function readLastTab(): PageTab | null {
  try {
    const v = window.localStorage.getItem(LAST_TAB_KEY);
    return isPageTab(v) ? v : null;
  } catch {
    return null; // penyimpanan diblokir (mode privat, dsb.)
  }
}

function saveLastTab(tab: PageTab) {
  try {
    window.localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    /* tidak masalah: hanya kenyamanan */
  }
}

const tabUrl = (tab: PageTab) => (tab === "buat" ? "/layanan-surat" : `/layanan-surat?tab=${tab}`);

function LayananSuratContent() {
  const router = useRouter();
  const { appAlert, appConfirm } = useAppDialogs();

  const [searchQuery, setSearchQuery] = useState("");
  const [v2Preview, setV2Preview] = useState<TemplateBody | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  // Tab ada di URL (?tab=riwayat|template) agar bisa dibagikan dan tombol Kembali berfungsi.
  // Tanpa ?tab, tab terakhir yang dibuka dipulihkan dari penyimpanan peramban.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const urlTab = isPageTab(tabParam) ? tabParam : null;
  const [tabResolved, setTabResolved] = useState(false);

  useEffect(() => {
    if (urlTab) {
      saveLastTab(urlTab);
      setTabResolved(true);
      return;
    }
    const last = readLastTab();
    if (last && last !== "buat") {
      router.replace(tabUrl(last), { scroll: false });
      return;
    }
    setTabResolved(true);
  }, [urlTab, router]);

  const pageTab: PageTab = urlTab ?? "buat";
  const { templates, templatesLoading, templatesError, refetch } = useLayananSuratData();
  const setPageTab = useCallback(
    (next: string) => {
      if (!isPageTab(next)) return;
      saveLastTab(next);
      router.replace(tabUrl(next), { scroll: false });
    },
    [router],
  );

  const startLetter = useCallback((template: TemplateBody) => router.push(`/layanan-surat/buat?templateId=${template.id}`), [router]);
  const editTemplate = useCallback((template: TemplateBody) => router.push(`/layanan-surat/editor?templateId=${template.id}`), [router]);
  const customizeTemplate = useCallback((template: TemplateBody) => router.push(`/layanan-surat/editor?forkFromId=${template.id}`), [router]);

  const deleteTemplate = useCallback(
    async (template: TemplateBody) => {
      if (template.is_catalog) return;

      const suratNote =
        template.usage_count > 0
          ? `\n\n${template.usage_count} surat di riwayat yang memakai jenis surat ini tetap tersimpan. Jenis surat hanya disembunyikan dari daftar.`
          : "\n\nJenis surat ini belum dipakai, sehingga akan dihapus permanen.";

      const ok = await appConfirm({
        title: "Hapus jenis surat?",
        description: `Hapus jenis surat "${template.name}"?${suratNote}`,
        confirmLabel: "Hapus",
        tone: "destructive",
      });
      if (!ok) return;

      try {
        const res = await fetch(`/api/mail-templates/${template.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus jenis surat");
        await refetch();
      } catch (error) {
        console.error(error);
        void appAlert(error instanceof Error ? error.message : "Gagal menghapus jenis surat.");
      }
    },
    [refetch, appConfirm, appAlert],
  );

  const filteredTemplates = templates.filter((template) => {
    const q = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(q) ||
      template.description.toLowerCase().includes(q) ||
      template.category.toLowerCase().includes(q)
    );
  });

  const totalTemplates = templates.length;
  const activeTemplates = templates.filter((template) => template.is_active).length;
  const totalUsage = templates.reduce((sum, template) => sum + template.usage_count, 0);

  // Jangan tampilkan tab "Buat Surat" sekilas lalu berpindah ke tab yang tersimpan.
  if (!tabResolved) {
    return <p role="status" className="p-10 text-center text-sm text-muted-foreground">Memuat…</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Kop surat dan data desa mengikuti <strong className="font-medium text-foreground">Pengaturan Desa</strong>. Sesuaikan alamat, logo, dan penandatangan di sana.
        </p>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
          <Link href="/pengaturan-desa">
            <Settings2 className="h-4 w-4" />
            Pengaturan Desa
          </Link>
        </Button>
      </div>

      <Tabs value={pageTab} onValueChange={setPageTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="buat" className="gap-2">
            <Plus className="h-4 w-4" />
            Buat Surat
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-2">
            <Clock className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
          <TabsTrigger value="template" className="gap-2">
            <FileEdit className="h-4 w-4" />
            Atur Jenis Surat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buat" className="mt-6">
          <TemplatePicker embedded templates={templatesLoading ? null : templates} error={templatesError} onRetry={() => void refetch()} />
        </TabsContent>

        <TabsContent value="template" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileEdit className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Jenis Surat</p>
                    <p className="text-2xl font-semibold">{totalTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis Surat Aktif</p>
                    <p className="text-2xl font-semibold">{activeTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Penggunaan</p>
                    <p className="text-2xl font-semibold">{totalUsage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div className="relative max-w-xl flex-1">
                  <label htmlFor="cari-jenis-surat" className="sr-only">Cari jenis surat</label>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="cari-jenis-surat"
                    type="search"
                    placeholder="Cari jenis surat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button className="gap-2" onClick={() => setShowNewTemplate(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Jenis Surat Baru
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                <strong className="font-medium text-foreground">Bawaan</strong>: contoh dari sistem; pakai langsung, atau <strong className="font-medium text-foreground">Sesuaikan</strong> untuk menyalinnya ke desa lalu ubah tampilannya.{" "}
                <strong className="font-medium text-foreground">Milik desa</strong>: bisa diubah atau dihapus.
              </p>
            </CardContent>
          </Card>

          {templatesLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">Memuat jenis surat...</CardContent>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchQuery.trim() ? `Tidak ada jenis surat yang cocok dengan “${searchQuery.trim()}”.` : "Belum ada jenis surat."}
              </CardContent>
            </Card>
          ) : (
            <TemplateGrid
              templates={filteredTemplates}
              onUse={startLetter}
              onPreview={setV2Preview}
              onEdit={editTemplate}
              onCustomize={customizeTemplate}
              onDelete={deleteTemplate}
            />
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-6">
          <LetterHistoryTab />
        </TabsContent>
      </Tabs>

      <V2TemplatePreviewDialog
        template={v2Preview ? { id: v2Preview.id, name: v2Preview.name } : null}
        open={v2Preview !== null}
        onOpenChange={(open) => {
          if (!open) setV2Preview(null);
        }}
      />

      <NewTemplateDialog
        open={showNewTemplate}
        onOpenChange={setShowNewTemplate}
        onChoose={(startId) => router.push(`/layanan-surat/editor?start=${encodeURIComponent(startId)}`)}
      />
    </div>
  );
}

export function LayananSurat() {
  return (
    <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-muted-foreground">Memuat…</p>}>
      <LayananSuratContent />
    </Suspense>
  );
}

export default LayananSurat;
