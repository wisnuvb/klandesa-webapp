import { useState, memo } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { TemplatePage } from "./types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

interface PageManagerProps {
  pages: TemplatePage[];
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<TemplatePage>) => void;
  /** Reserved — drag reorder belum diimplementasi di UI PageManager. */
  onReorderPages?: (pages: TemplatePage[]) => void;
}

function PageManagerComponent({
  pages,
  currentPageId,
  onPageChange,
  onAddPage,
  onDeletePage,
  onUpdatePage,
}: PageManagerProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(
    new Set([currentPageId]),
  );

  const toggleExpanded = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const currentPage = pages.find((p) => p.id === currentPageId);

  return (
    <div className="space-y-4">
      {/* Page List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Halaman Surat</CardTitle>
            <Button size="sm" onClick={onAddPage} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Halaman
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pages.map((page) => (
            <Collapsible
              key={page.id}
              open={expandedPages.has(page.id)}
              onOpenChange={() => toggleExpanded(page.id)}
            >
              <div
                className={`border rounded-lg p-3 ${
                  currentPageId === page.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      {expandedPages.has(page.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <FileText className="h-4 w-4 text-muted-foreground" />

                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onPageChange(page.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm shrink-0">
                        halaman {page.page_number}
                      </span>
                      {/* {page.title && (
                        <span className="text-sm text-muted-foreground">- {page.title}</span>
                      )} */}
                    </div>
                    {page.layout_type && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {page.layout_type}
                      </Badge>
                    )}
                  </div>

                  {pages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePage(page.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                    </Button>
                  )}
                </div>

                <CollapsibleContent className="pt-3 mt-3 border-t space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Judul Halaman</Label>
                    <Input
                      value={page.title}
                      onChange={(e) =>
                        onUpdatePage(page.id, {
                          title: e.target.value,
                        })
                      }
                      placeholder="e.g., Model N1 - Pengantar Nikah"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Tipe Layout</Label>
                    <Select
                      value={page.layout_type || "standard"}
                      onValueChange={(value) => {
                        const layout =
                          value === "standard" ||
                          value === "form" ||
                          value === "table" ||
                          value === "split-column"
                            ? value
                            : "standard";
                        onUpdatePage(page.id, {
                          layout_type: layout,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="form">Form</SelectItem>
                        <SelectItem value="table">Table</SelectItem>
                        <SelectItem value="split-column">
                          Split Column
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Current Page Info */}
      {currentPage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Editing: Halaman {currentPage.page_number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Judul: {currentPage.title || "Tanpa judul"}</p>
              <p>Layout: {currentPage.layout_type || "standard"}</p>
              <p>Total Blocks: {currentPage.blocks.length}</p>
              <div className="pt-2 border-t mt-2">
                <p className="text-xs font-medium mb-1">Status:</p>
                <div className="flex flex-wrap gap-1">
                  {(currentPage.show_header ?? true) && (
                    <Badge variant="outline" className="text-xs">
                      Header
                    </Badge>
                  )}
                  {(currentPage.letterNumber?.enabled ?? false) && (
                    <Badge variant="outline" className="text-xs">
                      Nomor
                    </Badge>
                  )}
                  {(currentPage.show_footer ?? true) && (
                    <Badge variant="outline" className="text-xs">
                      Footer
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const PageManager = memo(PageManagerComponent);
