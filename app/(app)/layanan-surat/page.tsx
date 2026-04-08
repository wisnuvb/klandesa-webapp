"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, FileText, Clock, FileEdit, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiPageTemplateBuilder } from "@/components/template-builder/MultiPageTemplateBuilder";
import type { TemplateData, ContentBlock } from "@/components/template-builder/types";
import type { TemplateBody } from "./types";
import { useLayananSuratData } from "./_hooks/useLayananSuratData";
import { useDesaSettings } from "./_hooks/useDesaSettings";
import { useLetterForm } from "./_hooks/useLetterForm";
import { useLetterExport } from "./_hooks/useLetterExport";
import { convertToTemplateData } from "./_utils/templateConverter";
import { TemplateGrid } from "./_components/TemplateGrid";
import { CreateLetterDialog } from "./_components/CreateLetterDialog";
import { TemplatePreviewDialog } from "./_components/TemplatePreviewDialog";
import { LetterHistoryTab } from "./_components/LetterHistoryTab";

export function LayananSurat() {
  const { templates, history, isLoading, refetch } = useLayananSuratData();
  const { desaSettings } = useDesaSettings();
  const {
    formData,
    selectedResident,
    selectedTemplate,
    showCreateDialog,
    activeTab,
    setActiveTab,
    setShowCreateDialog,
    handleCreateSurat,
    handleFormChange,
    handleResidentSelect,
    handleDuplicateLetter,
    resetForm,
  } = useLetterForm(desaSettings);
  const {
    createLetterPreviewRef,
    templatePreviewRef,
    historyLetterPreviewRef,
    downloadPreviewAsPdf,
    printPreview,
  } = useLetterExport();

  const [searchQuery, setSearchQuery] = useState("");
  const [pageTab, setPageTab] = useState<"templates" | "history">("templates");
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateBody | null>(null);
  const [templateBuilderSession, setTemplateBuilderSession] = useState(0);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateBody | null>(null);

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
  const activeTemplates = templates.filter((template) => template.is_active).length;
  const totalUsage = templates.reduce((sum, template) => sum + template.usage_count, 0);

  const handleSaveLetter = async (status: "draft" | "completed") => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch("/api/mail-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          letterNumber: formData.NOMOR_SURAT,
          letterDate: new Date().toISOString(),
          applicantName: formData.NAMA || selectedResident?.name || "",
          applicantNik: formData.NIK || selectedResident?.nik || "",
          signerRole: "kepala_desa",
          formData,
          status,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gagal menyimpan surat");
      }

      setShowCreateDialog(false);
      resetForm();
      await refetch();
    } catch (error) {
      console.error("Error saving letter:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan surat.");
    }
  };

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
          method: isEditMode ? "PUT" : "POST",
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
        alert(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan template.");
      }
    },
    [refetch],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Kop surat dan variabel desa mengikuti{" "}
          <strong className="font-medium text-foreground">Pengaturan Desa</strong>. Sesuaikan
          alamat, logo, dan penandatangan di sana.
        </p>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
          <Link href="/pengaturan-desa">
            <Settings2 className="h-4 w-4" />
            Pengaturan Desa
          </Link>
        </Button>
      </div>

      <Tabs value={pageTab} onValueChange={(value) => setPageTab(value as "templates" | "history")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates" className="gap-2">
            <FileEdit className="h-4 w-4" />
            Template Surat
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Riwayat Surat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileEdit className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Template</p>
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
                    <p className="text-sm text-muted-foreground">Template Aktif</p>
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
                    <p className="text-sm text-muted-foreground">Total Penggunaan</p>
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
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateBuilderSession((s) => s + 1);
                    setShowTemplateBuilder(true);
                  }}
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
              onCreateSurat={handleCreateSurat}
              onPreviewTemplate={(template) => {
                setPreviewTemplate(template);
                setShowPreviewDialog(true);
              }}
              onEditTemplate={(template) => {
                setEditingTemplate(template);
                setTemplateBuilderSession((s) => s + 1);
                setShowTemplateBuilder(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <LetterHistoryTab
            history={history}
            templates={templates}
            historyLetterPreviewRef={historyLetterPreviewRef}
            downloadPreviewAsPdf={downloadPreviewAsPdf}
            printPreview={printPreview}
            onDuplicateLetter={(templateId, letterFormData, allTemplates) => {
              handleDuplicateLetter(templateId, letterFormData, allTemplates);
              setPageTab("templates");
            }}
          />
        </TabsContent>
      </Tabs>

      <CreateLetterDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        template={selectedTemplate}
        formData={formData}
        selectedResident={selectedResident}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFormChange={handleFormChange}
        onResidentSelect={handleResidentSelect}
        onSaveLetter={handleSaveLetter}
        previewRef={createLetterPreviewRef}
        onDownloadPDF={() =>
          downloadPreviewAsPdf(
            createLetterPreviewRef,
            `Surat_${selectedTemplate?.name || "Baru"}`,
          )
        }
        onPrint={() =>
          printPreview(createLetterPreviewRef, `Cetak Surat - ${selectedTemplate?.name || ""}`)
        }
        desaSettings={desaSettings}
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
    </div>
  );
}

export default LayananSurat;
