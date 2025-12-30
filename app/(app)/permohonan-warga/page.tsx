"use client";

import { useState } from "react";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  FileText,
  Paperclip,
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
}

const mockData: Permohonan[] = [
  {
    id: 1,
    pemohon_name: "AHMAD FAUZI",
    pemohon_nik: "7312071504851001",
    pemohon_phone: "081234567890",
    jenis_surat: "Surat Keterangan Usaha",
    keperluan: "Mengajukan pinjaman ke bank untuk modal usaha",
    status: "PENDING",
    created_at: "2024-12-19 08:30:00",
    lampiran: ["KTP.pdf", "Foto_Usaha.jpg"],
  },
  {
    id: 2,
    pemohon_name: "SITI AMINAH",
    pemohon_nik: "7312074209901002",
    pemohon_phone: "081234567891",
    jenis_surat: "Surat Keterangan Domisili",
    keperluan: "Persyaratan pendaftaran sekolah anak",
    status: "DIPROSES",
    created_at: "2024-12-18 14:15:00",
    lampiran: ["KTP.pdf", "KK.pdf"],
    catatan: "Sedang diproses oleh staf",
  },
  {
    id: 3,
    pemohon_name: "BUDI SANTOSO",
    pemohon_nik: "7312071203881003",
    pemohon_phone: "081234567892",
    jenis_surat: "Surat Keterangan Tidak Mampu",
    keperluan: "Pengajuan beasiswa pendidikan",
    status: "SELESAI",
    created_at: "2024-12-17 10:20:00",
    lampiran: ["KTP.pdf", "KK.pdf", "Slip_Gaji.pdf"],
  },
  {
    id: 4,
    pemohon_name: "DEWI LESTARI",
    pemohon_nik: "7312074506951004",
    pemohon_phone: "081234567893",
    jenis_surat: "Surat Pengantar Nikah",
    keperluan: "Persyaratan pernikahan di KUA",
    status: "SELESAI",
    created_at: "2024-12-16 09:00:00",
    lampiran: ["KTP.pdf", "KK.pdf", "Akta_Lahir.pdf"],
  },
  {
    id: 5,
    pemohon_name: "AGUS WIJAYA",
    pemohon_nik: "7312072108921005",
    pemohon_phone: "081234567894",
    jenis_surat: "Surat Keterangan Penghasilan",
    keperluan: "Data tidak lengkap",
    status: "DITOLAK",
    created_at: "2024-12-15 16:45:00",
    lampiran: ["KTP.pdf"],
    catatan: "Harap melengkapi lampiran Kartu Keluarga dan Slip Gaji",
  },
  {
    id: 6,
    pemohon_name: "RINA KUSUMA",
    pemohon_nik: "7312075203871006",
    pemohon_phone: "081234567895",
    jenis_surat: "Surat Keterangan Ahli Waris",
    keperluan: "Pengurusan warisan tanah",
    status: "PENDING",
    created_at: "2024-12-19 11:00:00",
    lampiran: ["KTP.pdf", "KK.pdf", "Akta_Kematian.pdf", "Surat_Tanah.pdf"],
  },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPermohonan, setSelectedPermohonan] =
    useState<Permohonan | null>(null);

  const filteredData = mockData.filter((item) => {
    const matchesSearch =
      item.pemohon_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pemohon_nik.includes(searchQuery) ||
      item.jenis_surat.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalPermohonan = mockData.length;
  const pendingCount = mockData.filter((p) => p.status === "PENDING").length;
  const diprosesCount = mockData.filter((p) => p.status === "DIPROSES").length;
  const selesaiCount = mockData.filter((p) => p.status === "SELESAI").length;

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
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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

              <Button variant="outline" className="gap-2">
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
            Menampilkan {filteredData.length} dari {mockData.length} permohonan
          </p>
        </CardHeader>
        <CardContent>
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
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Tidak ada data yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.pemohon_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.pemohon_phone}
                          </p>
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
            <p className="text-sm text-muted-foreground">Halaman 1 dari 1</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedPermohonan}
        onOpenChange={() => setSelectedPermohonan(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Permohonan Surat</DialogTitle>
            <DialogDescription>
              ID Permohonan: #{selectedPermohonan?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedPermohonan && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Status Permohonan</span>
                {getStatusBadge(selectedPermohonan.status)}
              </div>

              {/* Pemohon Info */}
              <div className="space-y-3">
                <h4 className="font-semibold">Informasi Pemohon</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Nama Lengkap
                    </label>
                    <p className="font-medium">
                      {selectedPermohonan.pemohon_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">NIK</label>
                    <p className="font-mono text-sm">
                      {selectedPermohonan.pemohon_nik}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      No. Telepon
                    </label>
                    <p className="font-medium">
                      {selectedPermohonan.pemohon_phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Tanggal Pengajuan
                    </label>
                    <p className="font-medium">
                      {formatDate(selectedPermohonan.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Surat Info */}
              <div className="space-y-3">
                <h4 className="font-semibold">Informasi Surat</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Jenis Surat
                    </label>
                    <p className="font-medium">
                      {selectedPermohonan.jenis_surat}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Keperluan
                    </label>
                    <p className="text-sm">{selectedPermohonan.keperluan}</p>
                  </div>
                </div>
              </div>

              {/* Lampiran */}
              <div className="space-y-3">
                <h4 className="font-semibold">Lampiran</h4>
                <div className="space-y-2">
                  {selectedPermohonan.lampiran.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{file}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan */}
              {selectedPermohonan.catatan && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Catatan</h4>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      {selectedPermohonan.catatan}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1 bg-primary"
                  onClick={() => setSelectedPermohonan(null)}
                >
                  Proses Permohonan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedPermohonan(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PermohonanWarga;
