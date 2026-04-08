"use client";

import { Edit, Eye, FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TemplateBody } from "../types";

interface TemplateGridProps {
  templates: TemplateBody[];
  onCreateSurat: (template: TemplateBody) => void;
  onPreviewTemplate: (template: TemplateBody) => void;
  onEditTemplate: (template: TemplateBody) => void;
}

export function TemplateGrid({
  templates,
  onCreateSurat,
  onPreviewTemplate,
  onEditTemplate,
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
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
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
                <span className="font-medium">{template.variables.length} field</span>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  className="flex-1 gap-2"
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
                  className="gap-2"
                  onClick={() => onEditTemplate(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
