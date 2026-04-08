/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import {
  Eye,
  Save,
  FileText,
  Settings,
  AlignLeft,
  AlignJustify,
  Hash,
  Layers,
  Users,
  Sparkles,
} from "lucide-react";
import { HeaderCustomizer } from "./HeaderCustomizer";
import { FooterBuilder } from "./FooterBuilder";
import { LetterNumberBuilder } from "./LetterNumberBuilder";
import { ContentBlockEditor } from "./ContentBlockEditor";
import { MultiPagePreview } from "./MultiPagePreview";
import { PageManager } from "./PageManager";
import { VariableGroupManager } from "./VariableGroupManager";
import { TemplateLibraryModal } from "./TemplateLibraryModal";
import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_LETTER_NUMBER_CONFIG,
} from "./types";
import type {
  ContentBlock,
  FooterConfig,
  HeaderConfig,
  LetterNumberConfig,
  TemplateData,
  TemplatePage,
  VariableGroup,
} from "./types";

function createEmptyTemplate(): TemplateData {
  return {
    name: "",
    description: "",
    category: "Keterangan",
    is_multi_page: false,
    header: DEFAULT_HEADER_CONFIG,
    letterNumber: DEFAULT_LETTER_NUMBER_CONFIG,
    blocks: [],
    footer: DEFAULT_FOOTER_CONFIG,
    variables: [],
    is_active: true,
    pages: [
      {
        id: "page_1",
        page_number: 1,
        title: "Halaman 1",
        blocks: [],
      },
    ],
    variable_groups: [],
    shared_header: DEFAULT_HEADER_CONFIG,
    shared_footer: DEFAULT_FOOTER_CONFIG,
  };
}

interface MultiPageTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: TemplateData) => void;
  desaSettings: any;
  editTemplate?: TemplateData | null;
}

export function MultiPageTemplateBuilder({
  open,
  onOpenChange,
  onSave,
  desaSettings,
  editTemplate,
}: MultiPageTemplateBuilderProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  // Template mode
  const [isMultiPage, setIsMultiPage] = useState(
    editTemplate?.is_multi_page || false,
  );

  // Current page being edited (for multi-page mode)
  const [currentPageId, setCurrentPageId] = useState<string>("page_1");

  const [templateData, setTemplateData] = useState<TemplateData>(
    editTemplate || createEmptyTemplate(),
  );

  const toggleMultiPageMode = useCallback((enabled: boolean) => {
    setIsMultiPage(enabled);
    setTemplateData((prev) => {
      if (enabled) {
        const firstPage: TemplatePage = {
          id: "page_1",
          page_number: 1,
          title: prev.name || "Halaman 1",
          blocks: prev.blocks,
          show_header: true,
          show_footer: true,
          header: {
            show_letterhead: true,
            show_title: true,
          },
          letterNumber: prev.letterNumber,
          footer: {
            show_signatures: true,
            footer_config: prev.footer,
          },
        };

        return {
          ...prev,
          is_multi_page: true,
          pages: [firstPage],
          shared_header: prev.header,
          shared_footer: prev.footer,
          variable_groups: [],
        };
      }

      const firstPage = prev.pages?.[0];
      return {
        ...prev,
        is_multi_page: false,
        blocks: firstPage?.blocks || [],
        letterNumber:
          firstPage?.letterNumber || DEFAULT_LETTER_NUMBER_CONFIG,
      };
    });
  }, []);

  const currentPage = useMemo((): TemplatePage | null => {
    if (!isMultiPage) return null;
    return (
      templateData.pages?.find((p) => p.id === currentPageId) ||
      templateData.pages?.[0] ||
      null
    );
  }, [isMultiPage, templateData.pages, currentPageId]);

  const updateTemplateData = useCallback((updates: Partial<TemplateData>) => {
    setTemplateData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateCurrentPage = useCallback(
    (updates: Partial<TemplatePage>) => {
      if (!isMultiPage) return;
      setTemplateData((prev) => {
        const pages = prev.pages || [];
        const target = pages.find((p) => p.id === currentPageId);
        if (!target) return prev;
        const updatedPages = pages.map((p) =>
          p.id === currentPageId ? { ...p, ...updates } : p,
        );
        return { ...prev, pages: updatedPages };
      });
    },
    [isMultiPage, currentPageId],
  );

  const handleAddPage = useCallback(() => {
    const newPageId = `page_${Date.now()}`;
    setTemplateData((prev) => {
      const pages = prev.pages || [];
      const newPageNumber = pages.length + 1;
      const newPage: TemplatePage = {
        id: newPageId,
        page_number: newPageNumber,
        title: `Halaman ${newPageNumber}`,
        blocks: [],
        show_header: true,
        show_footer: true,
        header: {
          show_letterhead: true,
          show_title: true,
        },
        footer: {
          show_signatures: true,
        },
      };
      return { ...prev, pages: [...pages, newPage] };
    });
    setCurrentPageId(newPageId);
  }, []);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      const updatedPages =
        templateData.pages?.filter((p) => p.id !== pageId) || [];
      const renumberedPages = updatedPages.map((p, index) => ({
        ...p,
        page_number: index + 1,
      }));
      updateTemplateData({ pages: renumberedPages });

      if (currentPageId === pageId && renumberedPages.length > 0) {
        setCurrentPageId(renumberedPages[0].id);
      }
    },
    [templateData.pages, currentPageId, updateTemplateData],
  );

  const handleUpdatePage = useCallback(
    (pageId: string, updates: Partial<TemplatePage>) => {
      setTemplateData((prev) => ({
        ...prev,
        pages:
          prev.pages?.map((p) =>
            p.id === pageId ? { ...p, ...updates } : p,
          ) || [],
      }));
    },
    [],
  );

  const handleReorderPages = useCallback(
    (pages: TemplatePage[]) => {
      updateTemplateData({ pages });
    },
    [updateTemplateData],
  );

  const handleHeaderConfigChange = useCallback(
    (config: HeaderConfig) => {
      if (isMultiPage) {
        updateTemplateData({ shared_header: config });
      } else {
        updateTemplateData({ header: config });
      }
    },
    [isMultiPage, updateTemplateData],
  );

  const handleLetterNumberChange = useCallback(
    (config: LetterNumberConfig) => {
      if (isMultiPage) {
        updateCurrentPage({ letterNumber: config });
      } else {
        updateTemplateData({ letterNumber: config });
      }
    },
    [isMultiPage, updateCurrentPage, updateTemplateData],
  );

  const handleFooterConfigChange = useCallback(
    (config: FooterConfig) => {
      if (isMultiPage) {
        updateTemplateData({ shared_footer: config });
      } else {
        updateTemplateData({ footer: config });
      }
    },
    [isMultiPage, updateTemplateData],
  );

  const handleContentBlocksChange = useCallback(
    (blocks: ContentBlock[]) => {
      if (isMultiPage) {
        updateCurrentPage({ blocks });
      } else {
        updateTemplateData({ blocks });
      }
    },
    [isMultiPage, updateCurrentPage, updateTemplateData],
  );

  const handleVariableGroupsUpdate = useCallback(
    (groups: VariableGroup[]) => {
      updateTemplateData({ variable_groups: groups });
    },
    [updateTemplateData],
  );

  const handleInsertVariable = useCallback((_id: string) => {
    void _id;
  }, []);

  const openTemplateLibrary = useCallback(() => {
    setShowTemplateLibrary(true);
  }, []);

  const openPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleLibrarySelect = useCallback((template: TemplateData) => {
    setTemplateData(template);
    setIsMultiPage(template.is_multi_page || false);
  }, []);

  const handleToggleShowHeader = useCallback(
    (show: boolean) => updateTemplateData({ show_header: show }),
    [updateTemplateData],
  );

  const handleToggleShowHeaderDefault = useCallback(
    (show: boolean) => updateTemplateData({ show_header_default: show }),
    [updateTemplateData],
  );

  const handleToggleShowFooter = useCallback(
    (show: boolean) => updateTemplateData({ show_footer: show }),
    [updateTemplateData],
  );

  const handleToggleShowFooterDefault = useCallback(
    (show: boolean) => updateTemplateData({ show_footer_default: show }),
    [updateTemplateData],
  );

  const handleSave = useCallback(() => {
    const variableSet = new Set<string>();
    const blocksToScan = isMultiPage
      ? templateData.pages?.flatMap((p) => p.blocks) || []
      : templateData.blocks;

    blocksToScan.forEach((block) => {
      const content =
        typeof block.content === "string"
          ? block.content
          : JSON.stringify(block.content);

      const matches = content.match(/{([A-Z_]+)}/g);
      if (matches) {
        matches.forEach((match) => {
          const varName = match.replace(/[{}]/g, "");
          variableSet.add(varName);
        });
      }
    });

    onSave({
      ...templateData,
      variables: Array.from(variableSet),
      is_multi_page: isMultiPage,
    });
    onOpenChange(false);
  }, [templateData, isMultiPage, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-full h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {editTemplate
                  ? "Edit Template Surat"
                  : "Buat Template Surat Baru"}
              </DialogTitle>
              <DialogDescription>
                {isMultiPage
                  ? "Template multi-halaman dengan sistem block editor"
                  : "Template single-page dengan block editor"}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={openTemplateLibrary}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Ambil Template
              </Button>
              <Button
                variant="outline"
                onClick={openPreview}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2"
                disabled={!templateData.name}
              >
                <Save className="h-4 w-4" />
                Simpan Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar for Multi-Page Mode */}
          {isMultiPage && (
            <div className="w-80 border-r bg-muted/10 p-4 overflow-y-auto">
              <PageManager
                pages={templateData.pages || []}
                currentPageId={currentPageId}
                onPageChange={setCurrentPageId}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onUpdatePage={handleUpdatePage}
                onReorderPages={handleReorderPages}
              />
            </div>
          )}

          {/* Main Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="border-b px-6 shrink-0">
                <TabsList
                  className={`grid w-full ${
                    isMultiPage ? "grid-cols-6" : "grid-cols-5"
                  }`}
                >
                  <TabsTrigger value="info" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="header" className="gap-2">
                    <AlignLeft className="h-4 w-4" />
                    Header
                  </TabsTrigger>
                  <TabsTrigger value="letter" className="gap-2">
                    <Hash className="h-4 w-4" />
                    Nomor
                  </TabsTrigger>
                  <TabsTrigger value="content" className="gap-2">
                    <AlignJustify className="h-4 w-4" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="footer" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Footer
                  </TabsTrigger>
                  {isMultiPage && (
                    <TabsTrigger value="variables" className="gap-2">
                      <Users className="h-4 w-4" />
                      Variables
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Info Tab */}
                <TabsContent value="info" className="p-6 space-y-4 mt-0">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nama Template *</Label>
                      <Input
                        value={templateData.name}
                        onChange={(e) =>
                          updateTemplateData({ name: e.target.value })
                        }
                        placeholder="Contoh: Surat Pengantar Nikah"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Deskripsi</Label>
                      <Textarea
                        value={templateData.description}
                        onChange={(e) =>
                          updateTemplateData({ description: e.target.value })
                        }
                        placeholder="Deskripsi singkat tentang template ini..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <Select
                        value={templateData.category}
                        onValueChange={(value) =>
                          updateTemplateData({ category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Keterangan">
                            Surat Keterangan
                          </SelectItem>
                          <SelectItem value="Pengantar">
                            Surat Pengantar
                          </SelectItem>
                          <SelectItem value="Kependudukan">
                            Kependudukan
                          </SelectItem>
                          <SelectItem value="Keterangan Usaha">
                            Keterangan Usaha
                          </SelectItem>
                          <SelectItem value="Domisili">Domisili</SelectItem>
                          <SelectItem value="Kuasa">Surat Kuasa</SelectItem>
                          <SelectItem value="Izin">Surat Izin</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Multi-Page Toggle */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <Label
                              htmlFor="multi-page"
                              className="font-semibold"
                            >
                              Template Multi-Halaman
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Aktifkan untuk surat yang memiliki lebih dari 1
                            halaman (misal: N1-N6)
                          </p>
                        </div>
                        <Switch
                          id="multi-page"
                          checked={isMultiPage}
                          onCheckedChange={toggleMultiPageMode}
                        />
                      </div>

                      {isMultiPage && (
                        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded text-sm">
                          <p className="text-primary font-medium mb-1">
                            Mode Multi-Halaman Aktif
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Gunakan sidebar kiri untuk mengelola halaman. Setiap
                            halaman bisa punya header, content, dan footer
                            sendiri.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Header Tab */}
                <TabsContent value="header" className="mt-0">
                  <HeaderCustomizer
                    config={
                      isMultiPage
                        ? templateData.shared_header || DEFAULT_HEADER_CONFIG
                        : templateData.header
                    }
                    onChange={handleHeaderConfigChange}
                    desaSettings={desaSettings}
                    isMultiPage={isMultiPage}
                    currentPage={currentPage || undefined}
                    onUpdatePage={updateCurrentPage}
                    showHeader={templateData.show_header}
                    onToggleShowHeader={handleToggleShowHeader}
                    showHeaderDefault={templateData.show_header_default}
                    onToggleShowHeaderDefault={handleToggleShowHeaderDefault}
                  />
                </TabsContent>

                {/* Letter Number Tab */}
                <TabsContent value="letter" className="p-6 mt-0">
                  <LetterNumberBuilder
                    config={
                      isMultiPage
                        ? currentPage?.letterNumber ||
                          DEFAULT_LETTER_NUMBER_CONFIG
                        : templateData.letterNumber ||
                          DEFAULT_LETTER_NUMBER_CONFIG
                    }
                    onChange={handleLetterNumberChange}
                    isMultiPage={isMultiPage}
                    currentPage={currentPage || undefined}
                    onUpdatePage={updateCurrentPage}
                  />
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="p-6 mt-0">
                  {isMultiPage && currentPage && (
                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded">
                      <p className="text-sm font-medium">
                        Editing:{" "}
                        <span className="text-primary">
                          Halaman {currentPage.page_number}
                        </span>{" "}
                        - {currentPage.title}
                      </p>
                    </div>
                  )}
                  <ContentBlockEditor
                    blocks={
                      isMultiPage
                        ? currentPage?.blocks || []
                        : templateData.blocks
                    }
                    onChange={handleContentBlocksChange}
                    onInsertVariable={handleInsertVariable}
                  />
                </TabsContent>

                {/* Footer Tab */}
                <TabsContent value="footer" className="mt-0">
                  <FooterBuilder
                    config={
                      isMultiPage
                        ? templateData.shared_footer || DEFAULT_FOOTER_CONFIG
                        : templateData.footer
                    }
                    onChange={handleFooterConfigChange}
                    isMultiPage={isMultiPage}
                    currentPage={currentPage || undefined}
                    onUpdatePage={updateCurrentPage}
                    showFooter={templateData.show_footer}
                    onToggleShowFooter={handleToggleShowFooter}
                    showFooterDefault={templateData.show_footer_default}
                    onToggleShowFooterDefault={handleToggleShowFooterDefault}
                  />
                </TabsContent>

                {/* Variable Groups Tab (Multi-Page Only) */}
                {isMultiPage && (
                  <TabsContent value="variables" className="p-6 mt-0">
                    <VariableGroupManager
                      variableGroups={templateData.variable_groups || []}
                      onUpdateGroups={handleVariableGroupsUpdate}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Preview Dialog */}
      {showPreview && (
        <MultiPagePreview
          template={templateData}
          desaSettings={desaSettings}
          onClose={closePreview}
        />
      )}

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <TemplateLibraryModal
          open={showTemplateLibrary}
          onOpenChange={setShowTemplateLibrary}
          onSelectTemplate={handleLibrarySelect}
        />
      )}
    </Dialog>
  );
}
