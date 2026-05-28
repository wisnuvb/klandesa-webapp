"use client";

import { RefObject, useState } from "react";
import {
  Search,
  Eye,
  Copy,
  Download,
  FileText,
  Clock,
  CheckCircle,
  FileArchive,
  Grid3x3,
  List,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TemplateBody, LetterHistory } from "../types";
import { templateFooters } from "../constants";
import {
  generateLetterPreviewHtml,
  renderHistoryLetterContent,
} from "../_utils/templateConverter";
import { useDesaSettings } from "../_hooks/useDesaSettings";

interface LetterHistoryTabProps {
  history: LetterHistory[];
  templates: TemplateBody[];
  historyLetterPreviewRef: RefObject<HTMLDivElement | null>;
  downloadPreviewAsPdf: (
    ref: { current: HTMLDivElement | null },
    filename: string,
  ) => Promise<void>;
  printPreview: (
    ref: { current: HTMLDivElement | null },
    title?: string,
  ) => void;
  onDuplicateLetter: (
    templateId: number,
    formData: Record<string, string>,
    templates: TemplateBody[],
  ) => void;
  onEditLetter?: (letter: LetterHistory) => void;
}

function statusMeta(status: LetterHistory["status"]) {
  switch (status) {
    case "completed": return { variant: "default" as const, label: "Selesai" };
    case "draft": return { variant: "secondary" as const, label: "Draft" };
    default: return { variant: "outline" as const, label: "Arsip" };
  }
}

export function LetterHistoryTab({
  history,
  templates,
  historyLetterPreviewRef,
  downloadPreviewAsPdf,
  printPreview,
  onDuplicateLetter,
  onEditLetter,
}: LetterHistoryTabProps) {
  const { desaSettings } = useDesaSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedLetter, setSelectedLetter] = useState<LetterHistory | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreviewLetter = (letter: LetterHistory) => {
    setSelectedLetter(letter);
    setShowPreview(true);
  };

  const filteredHistory = history.filter((letter) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      letter.applicant_name.toLowerCase().includes(q) ||
      letter.letter_number.toLowerCase().includes(q) ||
      letter.template_name.toLowerCase().includes(q) ||
      letter.applicant_nik.includes(q);
    const matchesStatus = statusFilter === "all" || letter.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || letter.template_category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(history.map((l) => l.template_category)));
  const totalLetters = history.length;
  const completedLetters = history.filter((l) => l.status === "completed").length;
  const draftLetters = history.filter((l) => l.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Surat</p>
                <p className="text-2xl font-semibold">{totalLetters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Surat Selesai</p>
                <p className="text-2xl font-semibold">{completedLetters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Surat Draft</p>
                <p className="text-2xl font-semibold">{draftLetters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari surat..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status Surat">
                    {statusFilter === "all" ? "Semua Status" : statusFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Arsip</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Kategori Surat">
                    {categoryFilter === "all" ? "Semua Kategori" : categoryFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex gap-1 border rounded-lg p-1">
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="gap-2">
                  <Grid3x3 className="h-4 w-4" />Grid
                </Button>
                <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("table")} className="gap-2">
                  <List className="h-4 w-4" />Table
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredHistory.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileArchive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Tidak ada surat ditemukan</h3>
            <p className="text-sm text-muted-foreground">
              Coba ubah filter atau kata kunci pencarian Anda
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === "grid" && filteredHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHistory.map((letter) => {
            const template = templates.find((t) => t.id === letter.template_id);
            const formattedDate = new Date(letter.created_at).toLocaleDateString("id-ID", {
              day: "2-digit", month: "short", year: "numeric",
            });
            const { variant, label } = statusMeta(letter.status);

            return (
              <Card key={letter.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{letter.template_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{template?.description}</p>
                    </div>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Nomor:</span>
                      <span className="font-mono text-xs">{letter.letter_number}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pemohon:</span>
                      <span className="font-medium truncate ml-2">{letter.applicant_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Kategori:</span>
                      <Badge variant="outline">{letter.template_category}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tanggal:</span>
                      <span className="text-xs">{formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Dibuat oleh:</span>
                      <span className="text-xs">{letter.created_by}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" className="flex-1 gap-2" onClick={() => handlePreviewLetter(letter)}>
                      <Eye className="h-4 w-4" />Preview
                    </Button>
                    {onEditLetter && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 shrink-0"
                        onClick={() => onEditLetter(letter)}
                        title="Edit surat"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onDuplicateLetter(letter.template_id, letter.form_data, templates)} title="Buat dari surat ini">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePreviewLetter(letter)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && filteredHistory.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-45">Nomor Surat</TableHead>
                  <TableHead>Jenis Surat</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((letter) => {
                  const template = templates.find((t) => t.id === letter.template_id);
                  const formattedDate = new Date(letter.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  const { variant, label } = statusMeta(letter.status);

                  return (
                    <TableRow key={letter.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{letter.letter_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{letter.template_name}</div>
                        <div className="text-xs text-muted-foreground">{template?.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{letter.applicant_name}</div>
                        <div className="text-xs text-muted-foreground">{letter.applicant_nik}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{letter.template_category}</Badge></TableCell>
                      <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                      <TableCell className="text-sm">{formattedDate}</TableCell>
                      <TableCell className="text-sm">{letter.created_by}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handlePreviewLetter(letter)}><Eye className="h-4 w-4" /></Button>
                          {onEditLetter && (
                            <Button variant="ghost" size="sm" title="Edit" onClick={() => onEditLetter(letter)}><Pencil className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => onDuplicateLetter(letter.template_id, letter.form_data, templates)}><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePreviewLetter(letter)}><Download className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Letter Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Preview Surat — {selectedLetter?.template_name}
            </DialogTitle>
            <DialogDescription>
              Preview surat dengan data yang telah diisi.
            </DialogDescription>
          </DialogHeader>

          {selectedLetter && (
            <div
              ref={historyLetterPreviewRef}
              className="p-8 bg-white min-h-175 font-serif"
            >
              {selectedLetter.templateData
                ? renderHistoryLetterContent(selectedLetter, desaSettings)
                : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateLetterPreviewHtml(
                        selectedLetter,
                        templates,
                        templateFooters,
                      ),
                    }}
                    style={{ fontFamily: "Literata, Times New Roman, serif", lineHeight: "1.8" }}
                  />
                )}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button className="flex-1 gap-2 bg-primary" onClick={() =>
              downloadPreviewAsPdf(
                historyLetterPreviewRef,
                `Surat_${selectedLetter?.letter_number || "History"}`,
              )
            }>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() =>
              printPreview(
                historyLetterPreviewRef,
                `Cetak Surat - ${selectedLetter?.template_name || ""}`,
              )
            }>
              <FileText className="h-4 w-4" />
              Cetak
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
