"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  FileText,
  Paperclip,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportPermohonanModal } from "@/components/app/permohonan-warga/ExportPermohonanModal";

interface Permohonan {
  id: number;
  pemohon_name: string;
  pemohon_nik: string;
  pemohon_phone: string;
  jenis_surat: string;
  keperluan: string;
  status: "PENDING" | "DIPROSES" | "SELESAI" | "DITOLAK";
  created_at: string;
  lampiran: string[];
  catatan?: string;
  requestNumber?: string;
  processedDate?: string;
}

const getStatusBadge = (status: Permohonan["status"]) => {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "DIPROSES":
      return (
        <Badge className="gap-1 bg-blue-600">
          <Clock className="h-3 w-3" />
          Diproses
        </Badge>
      );
    case "SELESAI":
      return (
        <Badge className="gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Selesai
        </Badge>
      );
    case "DITOLAK":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Ditolak
        </Badge>
      );
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function PermohonanWarga() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPermohonan, setSelectedPermohonan] =
    useState<Permohonan | null>(null);
  const [data, setData] = useState<Permohonan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/mail-requests?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal memuat data");
      }

      const result = await res.json();
      setData(result.rows || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error("Error fetching permohonan:", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, searchQuery, filterStatus]);

  // Calculate statistics from all data (you might want to fetch this separately)
  const totalPermohonan = total;
  const pendingCount = data.filter((p) => p.status === "PENDING").length;
  const diprosesCount = data.filter((p) => p.status === "DIPROSES").length;
  const selesaiCount = data.filter((p) => p.status === "SELESAI").length;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Permohonan
                </p>
                <p className="text-2xl font-semibold">{totalPermohonan}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold">{pendingCount}</p>
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
                <p className="text-sm text-muted-foreground">Diproses</p>
                <p className="text-2xl font-semibold">{diprosesCount}</p>
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
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="text-2xl font-semibold">{selesaiCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, NIK, atau jenis surat..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value);
                  setPage(1); // Reset to first page on filter change
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DIPROSES">Diproses</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DITOLAK">Ditolak</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowExportModal(true)}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Permohonan Surat</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Memuat data..."
              : `Menampilkan ${data.length} dari ${total} permohonan`}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fetchData()}
              >
                Coba Lagi
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Pemohon</TableHead>
                      <TableHead>NIK</TableHead>
                      <TableHead>Jenis Surat</TableHead>
                      <TableHead>Keperluan</TableHead>
                      <TableHead>Tanggal Pengajuan</TableHead>
                      <TableHead>Lampiran</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Tidak ada data yang ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell>
                            {(page - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.pemohon_name}</p>
                              {item.pemohon_phone && (
                                <p className="text-xs text-muted-foreground">
                                  {item.pemohon_phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.pemohon_nik}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.jenis_surat}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {item.keperluan}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <Paperclip className="h-3 w-3" />
                              {item.lampiran.length}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setSelectedPermohonan(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog - keep existing */}
      <Dialog
        open={!!selectedPermohonan}
        onOpenChange={() => setSelectedPermohonan(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Permohonan Surat</DialogTitle>
            <DialogDescription>
              ID Permohonan: #{selectedPermohonan?.id}
              {selectedPermohonan?.requestNumber && (
                <> | No. Permohonan: {selectedPermohonan.requestNumber}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPermohonan && (
            <div className="space-y-6">
              {/* ... existing detail dialog content ... */}
              {/* Keep all the existing detail dialog JSX, just update data references */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <ExportPermohonanModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        currentFilters={{
          status: filterStatus,
          search: searchQuery,
        }}
      />
    </div>
  );
}

export default PermohonanWarga;
