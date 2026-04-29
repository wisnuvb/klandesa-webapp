"use client";

import { Edit, Eye, FileEdit, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TemplateBody } from "../types";

interface TemplateGridProps {
  templates: TemplateBody[];
  onCreateSurat: (template: TemplateBody) => void;
  onPreviewTemplate: (template: TemplateBody) => void;
  onEditTemplate: (template: TemplateBody) => void;
  onDeleteTemplate: (template: TemplateBody) => void;
  /** Buka modal salin / editor untuk template katalog bawaan. */
  onCustomizeCatalogTemplate?: (template: TemplateBody) => void;
}

export function TemplateGrid({
  templates,
  onCreateSurat,
  onPreviewTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCustomizeCatalogTemplate,
}: TemplateGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => {
        const signerRole =
          template.footer?.signers?.[0]?.role ||
          template.footer?.footer_type ||
          "N/A";

        return (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[140px]">
                  <Badge variant={template.is_active ? "default" : "secondary"}>
                    {template.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Badge
                    variant={template.is_catalog ? "secondary" : "outline"}
                  >
                    {template.is_catalog ? "Katalog bawaan" : "Desa"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kategori:</span>
                <Badge variant="outline">{template.category}</Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Penandatangan:</span>
                <span className="text-xs font-medium">{signerRole}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Penggunaan:</span>
                <span className="font-medium">{template.usage_count}x</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Field Input:</span>
                <span className="font-medium">
                  {template.variables.length} field
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t">
                {template.is_catalog ? (
                  onCustomizeCatalogTemplate ? (
                    <div className="flex w-full">
                      <Button
                        size="sm"
                        className="min-w-0 flex-1 gap-2 rounded-r-none border-r-0"
                        onClick={() => onCustomizeCatalogTemplate(template)}
                      >
                        <FileEdit className="h-4 w-4 shrink-0" />
                        Gunakan
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => onCreateSurat(template)}
                    >
                      <FileEdit className="h-4 w-4" />
                      Gunakan
                    </Button>
                  )
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="min-w-0 flex-1 gap-2"
                      onClick={() => onCreateSurat(template)}
                    >
                      <FileEdit className="h-4 w-4" />
                      Buat Surat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => onPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0 text-destructive hover:text-destructive"
                      title="Hapus template milik desa"
                      onClick={() => onDeleteTemplate(template)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">Hapus</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      title="Ubah template"
                      onClick={() => onEditTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">Ubah</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
