"use client";

import { useState } from "react";
import {
  Search,
  Download,
  Upload,
  Plus,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  calculateAge,
  getEducationLevel,
  getJob,
  getMaritalStatus,
} from "@/utils";
import {
  DataWargaTable,
  ExcelUploadDialog,
  FormDialog,
} from "@/components/app/data-warga";

interface Warga {
  id: number;
  name: string;
  id_number: string;
  family_card_number: string;
  email: string;
  gender: "Laki-laki" | "Perempuan";
  birthplace: string;
  date_of_birth: string;
  religion_id: number;
  education_id: number;
  job_id: number;
  marital_status: "Belum Menikah" | "Menikah" | "Cerai Hidup" | "Cerai Mati";
  address: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  role: string;
  status: string;
}

const mockData: Warga[] = [
  {
    id: 3,
    name: "JOKO",
    id_number: "123123123123",
    family_card_number: "321123321123",
    email: "jot@klandesa.com",
    gender: "Laki-laki",
    birthplace: "Solo",
    date_of_birth: "2004-09-03",
    religion_id: 1,
    education_id: 8,
    job_id: 51,
    marital_status: "Menikah",
    address: "Jakarta",
    rt: "001",
    rw: "002",
    hamlet: "Dusun Tengah",
    role: "VILLAGE_STAFF",
    status: "ACTIVE",
  },
  {
    id: 1,
    name: "MUNAWARA MALLA",
    id_number: "7318054506070005",
    family_card_number: "321123321125",
    email: "ci_nawa@belobengerak.com",
    gender: "Perempuan",
    birthplace: "Bone",
    date_of_birth: "1967-06-05",
    religion_id: 1,
    education_id: 6,
    job_id: 25,
    marital_status: "Menikah",
    address: "Jl. Kemerdekaan No. 88",
    rt: "003",
    rw: "001",
    hamlet: "Dusun Timur",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "HAMSAH",
    id_number: "1901015076200011",
    family_card_number: "321123321124",
    email: "xicsMcTjQRwy@belobengerak.com",
    gender: "Laki-laki",
    birthplace: "Bone",
    date_of_birth: "1961-08-10",
    religion_id: 1,
    education_id: 4,
    job_id: 10,
    marital_status: "Menikah",
    address: "Jl. Pahlawan No. 45",
    rt: "002",
    rw: "003",
    hamlet: "Dusun Barat",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 4,
    name: "HAMKA",
    id_number: "7312071039930001",
    family_card_number: "321123321127",
    email: "7uiBt4qoXx@belobengerak.com",
    gender: "Laki-laki",
    birthplace: "Bone",
    date_of_birth: "1993-09-10",
    religion_id: 1,
    education_id: 1,
    job_id: 15,
    marital_status: "Menikah",
    address: "Jl. Diponegoro No. 77",
    rt: "005",
    rw: "003",
    hamlet: "Dusun Utara",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 5,
    name: "SAHOKA",
    id_number: "7312072084900021",
    family_card_number: "321123321126",
    email: "inasiik2X9@belobengerak.com",
    gender: "Laki-laki",
    birthplace: "Bone",
    date_of_birth: "1948-04-20",
    religion_id: 1,
    education_id: 3,
    job_id: 5,
    marital_status: "Menikah",
    address: "Jl. Sudirman No. 12",
    rt: "004",
    rw: "002",
    hamlet: "Dusun Selatan",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 6,
    name: "KEISHA NUR AFIQA",
    id_number: "7312074162160001",
    family_card_number: "321123321125",
    email: "sdsSSVANqq@belobengerak.com",
    gender: "Perempuan",
    birthplace: "Bone",
    date_of_birth: "2016-02-21",
    religion_id: 1,
    education_id: 2,
    job_id: 1,
    marital_status: "Belum Menikah",
    address: "Jl. Kemerdekaan No. 88",
    rt: "003",
    rw: "001",
    hamlet: "Dusun Timur",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 7,
    name: "ABDULLAH ALFURQAN",
    id_number: "7312072901100001",
    family_card_number: "321123321127",
    email: "nuMIRoNGXQ@belobengerak.com",
    gender: "Laki-laki",
    birthplace: "Bone",
    date_of_birth: "2010-01-29",
    religion_id: 1,
    education_id: 5,
    job_id: 1,
    marital_status: "Belum Menikah",
    address: "Jl. Diponegoro No. 77",
    rt: "005",
    rw: "003",
    hamlet: "Dusun Utara",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 8,
    name: "TAMMASE",
    id_number: "7312077112810004",
    family_card_number: "321123321125",
    email: "sEBFDGZB23@belobengerak.com",
    gender: "Perempuan",
    birthplace: "Bone",
    date_of_birth: "1981-12-31",
    religion_id: 1,
    education_id: 4,
    job_id: 30,
    marital_status: "Menikah",
    address: "Jl. Kemerdekaan No. 88",
    rt: "003",
    rw: "001",
    hamlet: "Dusun Timur",
    role: "CITIZEN",
    status: "ACTIVE",
  },
  {
    id: 9,
    name: "DARWIS",
    id_number: "7312073112700086",
    family_card_number: "321123321126",
    email: "1dPuLdtnk5r@belobengerak.com",
    gender: "Laki-laki",
    birthplace: "Bone",
    date_of_birth: "1970-12-31",
    religion_id: 1,
    education_id: 4,
    job_id: 10,
    marital_status: "Menikah",
    address: "Jl. Sudirman No. 12",
    rt: "004",
    rw: "002",
    hamlet: "Dusun Selatan",
    role: "CITIZEN",
    status: "ACTIVE",
  },
];

export default function DataWarga() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Excel Upload States & Handlers
  const [showExcelDialog, setShowExcelDialog] = useState(false);

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(mockData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");
    XLSX.writeFile(workbook, "data_warga.xlsx");
    toast.success("Data berhasil diunduh dalam format Excel");
  };

  const handleDownloadCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(mockData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");
    XLSX.writeFile(workbook, "data_warga.csv", { bookType: "csv" });
    toast.success("Data berhasil diunduh dalam format CSV");
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("landscape");

      // Title
      doc.setFontSize(18);
      doc.text("Data Warga", 14, 15);

      // Date
      doc.setFontSize(10);
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

      // Table headers
      const headers = [
        "No",
        "Nama",
        "NIK",
        "No. KK",
        "JK",
        "Usia",
        "Pendidikan",
        "Pekerjaan",
        "Status",
      ];
      let yPos = 30;

      // Draw header
      doc.setFontSize(9);
      doc.setFont("", "bold");
      const colWidths = [10, 40, 35, 35, 15, 15, 30, 30, 25];
      let xPos = 14;
      headers.forEach((header, index) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[index];
      });

      // Draw rows
      doc.setFont("", "normal");
      yPos += 7;
      mockData.forEach((warga, index) => {
        if (yPos > 190) {
          // New page if needed
          doc.addPage();
          yPos = 15;
        }

        xPos = 14;
        const row = [
          (index + 1).toString(),
          warga.name.length > 20
            ? warga.name.substring(0, 20) + "..."
            : warga.name,
          warga.id_number,
          warga.family_card_number,
          warga.gender,
          calculateAge(warga.date_of_birth).toString(),
          getEducationLevel(warga.education_id).substring(0, 12),
          getJob(warga.job_id).substring(0, 12),
          getMaritalStatus(warga.marital_status).substring(0, 10),
        ];

        row.forEach((cell, cellIndex) => {
          doc.text(cell, xPos, yPos);
          xPos += colWidths[cellIndex];
        });

        yPos += 7;
      });

      doc.save("data_warga.pdf");
      toast.success("Data berhasil diunduh dalam format PDF");
    } catch (error) {
      toast.error("Gagal mengunduh PDF");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <Card className="hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, NIK, atau No. KK..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Jenis Kelamin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Gender</SelectItem>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                  <SelectItem value="Menikah">Menikah</SelectItem>
                  <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                  <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDownloadExcel}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Download Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDownloadCSV}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Download CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDownloadPDF}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4 text-red-600" />
                    <span>Download PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowExcelDialog(true)}
              >
                <Upload className="h-4 w-4" />
                Upload Excel
              </Button>

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowFormDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Tambah Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataWargaTable
        refreshKey={refreshKey}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
        setShowExcelDialog={setShowExcelDialog}
      />

      {/* Form Dialog */}
      <FormDialog
        showFormDialog={showFormDialog}
        setShowFormDialog={setShowFormDialog}
      />

      {/* Excel Upload Dialog */}
      <ExcelUploadDialog
        showExcelDialog={showExcelDialog}
        setShowExcelDialog={setShowExcelDialog}
        onUploadSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}
