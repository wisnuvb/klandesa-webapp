"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  FileText,
  Clock,
  FileEdit,
  Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiPageTemplateBuilder } from "@/components/template-builder/MultiPageTemplateBuilder";
import type {
  TemplateData,
  ContentBlock,
} from "@/components/template-builder/types";
import type { TemplateBody } from "./types";
import { useLayananSuratData } from "./_hooks/useLayananSuratData";
import { useDesaSettings } from "./_hooks/useDesaSettings";
import { useLetterForm } from "./_hooks/useLetterForm";
import { useLetterExport } from "./_hooks/useLetterExport";
import { convertToTemplateData } from "./_utils/templateConverter";
import { mapApiMailTemplateToBody } from "./_utils/mapMailTemplate";
import { TemplateGrid } from "./_components/TemplateGrid";
import { CreateLetterDialog } from "./_components/CreateLetterDialog";
import { TemplatePreviewDialog } from "./_components/TemplatePreviewDialog";
import { LetterHistoryTab } from "./_components/LetterHistoryTab";
import { V2TemplatePreviewDialog } from "./_components/V2Views";
import { TemplatePicker } from "./buat/_components/TemplatePicker";
import { NewTemplateDialog } from "./editor/_components/NewTemplateDialog";
import {
  parseSignerRoleFromForm,
  signerDisplayName,
} from "./_utils/signerPreset";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

const LAYANAN_SURAT_PAGE_TABS = ["buat", "riwayat", "template"] as const;
type PageTab = (typeof LAYANAN_SURAT_PAGE_TABS)[number];

function LayananSuratContent() {
  const router = useRouter();
  const { appAlert, appConfirm } = useAppDialogs();
  const { templates, history, isLoading, refetch } = useLayananSuratData();
  const { desaSettings } = useDesaSettings();
  const {
    formData,
    letterDate,
    setLetterDate,
    selectedResident,
    selectedTemplate,
    showCreateDialog,
    editingLetterId,
    activeTab,
    setActiveTab,
    setShowCreateDialog,
    autoFillWilayahDesa,
    setAutoFillWilayahDesa,
    handleCreateSurat,
    handleFormChange,
    handleResidentSelect,
    handleDuplicateLetter,
    handleEditLetter,
    resetForm,
    handleSignerSlotRoleChange,
    refreshSignerPresetFromDesa,
  } = useLetterForm(desaSettings);
  const {
    createLetterPreviewRef,
    templatePreviewRef,
    historyLetterPreviewRef,
    downloadPreviewAsPdf,
    printPreview,
  } = useLetterExport();

  const [searchQuery, setSearchQuery] = useState("");
  // Tab disimpan di URL (?tab=riwayat|template) agar bisa dibagikan dan tombol Kembali berfungsi.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const pageTab: PageTab = (LAYANAN_SURAT_PAGE_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as PageTab)
    : "buat";
  const setPageTab = useCallback(
    (next: string) => {
      if (!(LAYANAN_SURAT_PAGE_TABS as readonly string[]).includes(next)) return;
      router.replace(next === "buat" ? "/layanan-surat" : `/layanan-surat?tab=${next}`, { scroll: false });
    },
    [router],
  );
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateBody | null>(
    null,
  );
  const [templateBuilderSession, setTemplateBuilderSession] = useState(0);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateBody | null>(
    null,
  );
  const [catalogCustomizeTarget, setCatalogCustomizeTarget] =
    useState<TemplateBody | null>(null);

  const [v2Preview, setV2Preview] = useState<TemplateBody | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  /** Jenis surat berformat dokumen v2 dibuat lewat halaman komposer; format lama lewat dialog lama. */
  const startLetter = useCallback(
    (template: TemplateBody) => {
      if (template.schema_version === 2) {
        router.push(`/layanan-surat/buat?templateId=${template.id}`);
        return;
      }
      handleCreateSurat(template);
    },
    [router, handleCreateSurat],
  );

  const openTemplateEditor = useCallback((template: TemplateBody) => {
    setEditingTemplate(template);
    setTemplateBuilderSession((s) => s + 1);
    setShowTemplateBuilder(true);
  }, []);

  const catalogForkForCustomize = useMemo(() => {
    if (
      !catalogCustomizeTarget?.is_catalog ||
      !catalogCustomizeTarget.catalog_key
    ) {
      return null;
    }
    return (
      templates.find(
        (t) =>
          !t.is_catalog &&
          t.inherits_catalog_key === catalogCustomizeTarget.catalog_key,
      ) ?? null
    );
  }, [catalogCustomizeTarget, templates]);

  const handleConfirmCatalogCustomize = useCallback(async () => {
    if (!catalogCustomizeTarget?.is_catalog) return;

    if (catalogForkForCustomize) {
      openTemplateEditor(catalogForkForCustomize);
      setCatalogCustomizeTarget(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/mail-templates/${catalogCustomizeTarget.id}/duplicate`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyalin template ke desa");
      }
      setEditingTemplate(mapApiMailTemplateToBody(data));
      setTemplateBuilderSession((s) => s + 1);
      setShowTemplateBuilder(true);
      setCatalogCustomizeTarget(null);
      await refetch();
    } catch (error) {
      console.error(error);
      void appAlert(
        error instanceof Error
          ? error.message
          : "Gagal membuka template untuk diedit.",
      );
    }
  }, [
    catalogCustomizeTarget,
    catalogForkForCustomize,
    openTemplateEditor,
    refetch,
    appAlert,
  ]);

  const handleEditTemplateClick = useCallback(
    (template: TemplateBody) => {
      if (template.is_catalog) return;
      if (template.schema_version === 2) {
        router.push(`/layanan-surat/editor?templateId=${template.id}`);
        return;
      }
      openTemplateEditor(template);
    },
    [openTemplateEditor, router],
  );

  const handleDeleteTemplate = useCallback(
    async (template: TemplateBody) => {
      if (template.is_catalog) return;

      const suratNote =
        template.usage_count > 0
          ? `\n\n${template.usage_count} surat di riwayat yang memakai template ini tetap tersimpan. Template hanya disembunyikan dari daftar.`
          : "\n\nTemplate ini belum dipakai, sehingga akan dihapus permanen.";

      const okDelete = await appConfirm({
        title: "Hapus template?",
        description: `Hapus template "${template.name}"?${suratNote}`,
        confirmLabel: "Hapus",
        tone: "destructive",
      });
      if (!okDelete) return;

      try {
        const res = await fetch(`/api/mail-templates/${template.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal menghapus template");
        }

        if (editingTemplate?.id === template.id) {
          setShowTemplateBuilder(false);
          setEditingTemplate(null);
        }
        if (previewTemplate?.id === template.id) {
          setShowPreviewDialog(false);
          setPreviewTemplate(null);
        }
        if (selectedTemplate?.id === template.id) {
          setShowCreateDialog(false);
          resetForm();
        }

        await refetch();
      } catch (error) {
        console.error(error);
        void appAlert(
          error instanceof Error ? error.message : "Gagal menghapus template.",
        );
      }
    },
    [
      refetch,
      editingTemplate,
      previewTemplate,
      selectedTemplate,
      resetForm,
      setShowCreateDialog,
      appConfirm,
      appAlert,
    ],
  );

  const builderEditTemplate = useMemo(
    () =>
      editingTemplate
        ? convertToTemplateData(editingTemplate, desaSettings)
        : null,
    [editingTemplate, desaSettings],
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
  const activeTemplates = templates.filter(
    (template) => template.is_active,
  ).length;
  const totalUsage = templates.reduce(
    (sum, template) => sum + template.usage_count,
    0,
  );

  const editingLetter = useMemo(
    () =>
      editingLetterId != null
        ? (history.find((h) => h.id === editingLetterId) ?? null)
        : null,
    [history, editingLetterId],
  );

  const persistLetterToServer = useCallback(
    async (status: "draft" | "completed" | "archived"): Promise<boolean> => {
      if (!selectedTemplate) return false;

      const role = parseSignerRoleFromForm(formData);
      const signerName = signerDisplayName(role, desaSettings);
      const letterDateIso = new Date(
        letterDate.getFullYear(),
        letterDate.getMonth(),
        letterDate.getDate(),
        12,
        0,
        0,
      ).toISOString();

      const payload = {
        templateId: selectedTemplate.id,
        letterNumber: formData.NOMOR_SURAT,
        letterDate: letterDateIso,
        applicantName:
          formData.NAMA_LENGKAP ||
          formData.NAMA ||
          selectedResident?.name ||
          "",
        applicantNik: formData.NIK || selectedResident?.nik || "",
        signerRole: role,
        signerName: signerName || undefined,
        formData,
        status,
      };

      try {
        const uri =
          editingLetterId != null
            ? `/api/mail-services/${editingLetterId}`
            : "/api/mail-services";
        const response = await fetch(uri, {
          method: editingLetterId != null ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error || "Gagal menyimpan surat",
          );
        }

        await refetch();
        return true;
      } catch (error) {
        console.error("Error saving letter:", error);
        void appAlert(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan surat.",
        );
        return false;
      }
    },
    [
      selectedTemplate,
      formData,
      letterDate,
      selectedResident,
      editingLetterId,
      desaSettings,
      refetch,
      appAlert,
    ],
  );

  const handleSaveLetter = async (
    status: "draft" | "completed" | "archived",
  ) => {
    const ok = await persistLetterToServer(status);
    if (ok) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleSaveAndPrint = useCallback(async () => {
    const ok = await persistLetterToServer("completed");
    if (!ok) return;
    printPreview(
      createLetterPreviewRef,
      `Cetak Surat - ${selectedTemplate?.name || ""}`,
    );
    setShowCreateDialog(false);
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    persistLetterToServer,
    printPreview,
    createLetterPreviewRef,
    selectedTemplate?.name,
    resetForm,
  ]);

  const handleSaveTemplate = useCallback(
    async (template: TemplateData) => {
      try {
        const extractBlockContent = (blocks: ContentBlock[]) =>
          blocks
            .map((block) =>
              typeof block.content === "string"
                ? block.content.trim()
                : JSON.stringify(block.content),
            )
            .filter(Boolean)
            .join("\n\n");

        const generatedContentTemplate = template.is_multi_page
          ? (template.pages || [])
              .map((page) => extractBlockContent(page.blocks || []))
              .filter(Boolean)
              .join("\n\n")
          : extractBlockContent(template.blocks || []);

        const isEditMode = Boolean(template.id);

        const response = await fetch("/api/mail-templates", {
          method: isEditMode ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isEditMode ? { id: Number(template.id) } : {}),
            name: template.name,
            description: template.description || "",
            category: template.category,
            templateStructure: {
              variables: template.variables,
              blocks: template.blocks,
              pages: template.pages,
              is_multi_page: template.is_multi_page,
              header: template.header,
              footer: template.footer,
              shared_header: template.shared_header,
              shared_footer: template.shared_footer,
              letterNumber: template.letterNumber,
              show_header: template.show_header,
              show_footer: template.show_footer,
              show_header_default: template.show_header_default,
              show_footer_default: template.show_footer_default,
              variable_groups: template.variable_groups,
            },
            contentTemplate:
              generatedContentTemplate || template.description || template.name,
            isGlobal: false,
            isActive: template.is_active,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Gagal menyimpan template");
        }

        setShowTemplateBuilder(false);
        setEditingTemplate(null);
        await refetch();
      } catch (error) {
        console.error("Error saving template:", error);
        void appAlert(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan template.",
        );
      }
    },
    [refetch, appAlert],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Kop surat dan variabel desa mengikuti{" "}
          <strong className="font-medium text-foreground">
            Pengaturan Desa
          </strong>
          . Sesuaikan alamat, logo, dan penandatangan di sana.
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
            Kelola Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buat" className="mt-6">
          <TemplatePicker embedded />
        </TabsContent>

        <TabsContent value="template" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileEdit className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Template
                    </p>
                    <p className="text-2xl font-semibold">{totalTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Template Aktif
                    </p>
                    <p className="text-2xl font-semibold">{activeTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Penggunaan
                    </p>
                    <p className="text-2xl font-semibold">{totalUsage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-3 justify-between">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari template..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  className="gap-2"
                  onClick={() => setShowNewTemplate(true)}
                >
                  <Plus className="h-4 w-4" />
                  Template Baru
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Memuat data template...
              </CardContent>
            </Card>
          ) : (
            <TemplateGrid
              templates={filteredTemplates}
              onCreateSurat={startLetter}
              onPreviewTemplate={(template) => {
                if (template.schema_version === 2) {
                  setV2Preview(template);
                  return;
                }
                setPreviewTemplate(template);
                setShowPreviewDialog(true);
              }}
              onEditTemplate={handleEditTemplateClick}
              onDeleteTemplate={handleDeleteTemplate}
              onSesuaikanTemplate={(template) =>
                router.push(`/layanan-surat/editor?forkFromId=${template.id}`)
              }
              onCustomizeCatalogTemplate={(template) =>
                template.schema_version === 2
                  ? startLetter(template)
                  : setCatalogCustomizeTarget(template)
              }
            />
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-6">
          <LetterHistoryTab
            history={history}
            templates={templates}
            historyLetterPreviewRef={historyLetterPreviewRef}
            downloadPreviewAsPdf={downloadPreviewAsPdf}
            printPreview={printPreview}
            onEditLetter={(letter) => handleEditLetter(letter, templates)}
            onDuplicateLetter={(templateId, letterFormData, allTemplates) => {
              handleDuplicateLetter(templateId, letterFormData, allTemplates);
              setPageTab("template");
            }}
          />
        </TabsContent>
      </Tabs>

      <CreateLetterDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open && editingLetterId != null) {
            resetForm();
          }
        }}
        editingLetterId={editingLetterId}
        editingLetterStatus={editingLetter?.status ?? null}
        template={selectedTemplate}
        formData={formData}
        letterDate={letterDate}
        onLetterDateChange={setLetterDate}
        autoFillWilayahDesa={autoFillWilayahDesa}
        onAutoFillWilayahDesaChange={setAutoFillWilayahDesa}
        selectedResident={selectedResident}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFormChange={handleFormChange}
        onResidentSelect={handleResidentSelect}
        onSaveLetter={handleSaveLetter}
        onSaveAndPrint={handleSaveAndPrint}
        previewRef={createLetterPreviewRef}
        onDownloadPDF={() =>
          downloadPreviewAsPdf(
            createLetterPreviewRef,
            `Surat_${selectedTemplate?.name || "Baru"}`,
          )
        }
        desaSettings={desaSettings}
        onSignerSlotRoleChange={handleSignerSlotRoleChange}
        onRefreshSignerPresetFromDesa={refreshSignerPresetFromDesa}
      />

      <V2TemplatePreviewDialog
        template={
          v2Preview
            ? { name: v2Preview.name, document: v2Preview.document }
            : null
        }
        open={v2Preview !== null}
        onOpenChange={(open) => {
          if (!open) setV2Preview(null);
        }}
      />

      <TemplatePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        template={previewTemplate}
        formData={formData}
        selectedTemplate={selectedTemplate}
        selectedResident={selectedResident}
        previewRef={templatePreviewRef}
        onDownload={() =>
          downloadPreviewAsPdf(
            templatePreviewRef,
            `Template_${previewTemplate?.name || "Preview"}`,
          )
        }
        onPrint={() =>
          printPreview(
            templatePreviewRef,
            `Preview Template - ${previewTemplate?.name || ""}`,
          )
        }
        desaSettings={desaSettings}
      />

      <NewTemplateDialog
        open={showNewTemplate}
        onOpenChange={setShowNewTemplate}
        onChoose={(startId) =>
          router.push(`/layanan-surat/editor?start=${encodeURIComponent(startId)}`)
        }
      />

      <MultiPageTemplateBuilder
        key={
          showTemplateBuilder
            ? `${templateBuilderSession}-${editingTemplate?.id ?? "new"}`
            : "closed"
        }
        open={showTemplateBuilder}
        onOpenChange={(open) => {
          setShowTemplateBuilder(open);
          if (!open) setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        desaSettings={desaSettings}
        editTemplate={builderEditTemplate}
      />

      <Dialog
        open={catalogCustomizeTarget != null}
        onOpenChange={(open) => {
          if (!open) setCatalogCustomizeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan template surat desa</DialogTitle>
            <DialogDescription>
              Template bertanda <strong>Katalog bawaan</strong> tidak dapat
              diubah langsung. Perubahan dilakukan pada salinan template milik
              desa Anda.
            </DialogDescription>
          </DialogHeader>
          {catalogForkForCustomize ? (
            <p className="text-sm text-muted-foreground">
              Salinan desa untuk template ini sudah ada. Lanjutkan untuk membuka
              editor.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada salinan. Sistem akan menyalin dari katalog ke template
              desa lalu membuka editor — Anda bisa menyimpan penyesuaian seperti
              biasa.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCatalogCustomizeTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmCatalogCustomize()}
            >
              {catalogForkForCustomize
                ? "Buka editor"
                : "Salin ke desa & buka editor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
