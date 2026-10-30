"use client";

import { Edit, Eye, FileEdit, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TemplateBody } from "../types";

interface TemplateGridProps {
  templates: TemplateBody[];
  /** Buat surat dari jenis surat ini. */
  onUse: (template: TemplateBody) => void;
  /** Lihat contoh tampilan dengan data contoh. */
  onPreview: (template: TemplateBody) => void;
  /** Ubah jenis surat milik desa di editor kanvas. */
  onEdit: (template: TemplateBody) => void;
  /** Jenis surat bawaan: salin ke desa lalu ubah di editor kanvas. */
  onCustomize: (template: TemplateBody) => void;
  onDelete: (template: TemplateBody) => void;
}

export function TemplateGrid({ templates, onUse, onPreview, onEdit, onCustomize, onDelete }: TemplateGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <li key={template.id}>
          <Card className="h-full transition-shadow hover:shadow-lg motion-reduce:transition-none">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={template.is_catalog ? "secondary" : "default"}>
                  {template.is_catalog ? "Bawaan" : "Milik desa"}
                </Badge>
                <Badge variant="outline">{template.category}</Badge>
              </div>
              <CardTitle className="text-lg leading-snug">{template.name}</CardTitle>
              {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {template.usage_count > 0 ? `Sudah dipakai ${template.usage_count} kali` : "Belum pernah dipakai"}
              </p>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button size="sm" className="min-h-9 min-w-0 flex-1 gap-2 pointer-coarse:min-h-11" onClick={() => onUse(template)}>
                  <FileEdit className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Buat Surat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-9 gap-1.5 pointer-coarse:min-h-11"
                  title={template.is_catalog ? "Salin ke desa Anda lalu ubah tampilannya" : "Ubah tampilan jenis surat ini"}
                  onClick={() => (template.is_catalog ? onCustomize(template) : onEdit(template))}
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                  {template.is_catalog ? "Sesuaikan" : "Ubah"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-9 pointer-coarse:min-h-11"
                  aria-label={`Lihat contoh ${template.name}`}
                  title="Lihat contoh"
                  onClick={() => onPreview(template)}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Button>
                {!template.is_catalog && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9 text-destructive hover:text-destructive pointer-coarse:min-h-11"
                    aria-label={`Hapus ${template.name}`}
                    title="Hapus jenis surat milik desa"
                    onClick={() => onDelete(template)}
                  >
                    <Trash className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
