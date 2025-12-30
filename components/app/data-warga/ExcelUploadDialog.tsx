"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  BLOOD_TYPE_OPTIONS,
} from "@/utils/constants/user";
import { Download, Upload, X, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Max batch size - must match API constant
const MAX_BATCH_SIZE = 500;

// Mapping field Excel (Bahasa Indonesia) ke field API (Bahasa Inggris)
const FIELD_MAPPING: Record<string, string> = {
  "Nama Lengkap": "name",
  NIK: "id_number",
  "No. KK": "family_card_number",
  "Jenis Kelamin": "gender",
  "Tempat Lahir": "birthplace",
  "Tanggal Lahir": "date_of_birth",
  Agama: "religion_id",
  "Golongan Darah": "blood_type_id",
  Pendidikan: "education_id",
  Pekerjaan: "job_id",
  "Status Perkawinan": "marital_status",
  "Status Hubungan KK": "status_family_id",
  Alamat: "address",
  RT: "rt",
  RW: "rw",
  Dusun: "hamlet",
  "No. Telepon": "phone_number",
  Email: "email",
  // Keluarga
  "NIK Ayah": "father_nik",
  "Nama Ayah": "father_name",
  "NIK Ibu": "mother_nik",
  "Nama Ibu": "mother_name",
  // Kesehatan & Sosial (gunakan Y/N)
  "Buta Huruf": "is_illiterate",
  Disabilitas: "is_disability",
  "ID Disabilitas": "disability_id",
  "Disabilitas Lainnya": "other_disability",
  Hamil: "is_pregnant",
  "Tanggal Hamil": "date_pregnant",
  Menyusui: "is_breastfeeding",
  Stunting: "is_stunting",
  "BPJS KIS": "is_bpjs_kis",
  Kontrasepsi: "contraception",
  "Tinggi Badan": "height",
  "Berat Badan": "weight",
  Pendapatan: "income",
  // Media
  "Cover URL": "cover",
  "Cover Thumb URL": "cover_thumb",
  "Foto URL": "photo",
  "Foto Thumb URL": "photo_thumb",
  // Lainnya
  "Kode Negara": "country_code",
  "NIK Sementara": "temp_id_number",
  "RT Sementara": "temp_rt",
  "Kepemilikan Rumah": "house_ownership",
  Desil: "desil",
};

interface ExcelUploadDialogProps {
  showExcelDialog: boolean;
  setShowExcelDialog: (show: boolean) => void;
  onUploadSuccess?: () => void;
}

export const ExcelUploadDialog: React.FC<ExcelUploadDialogProps> = ({
  showExcelDialog,
  setShowExcelDialog,
  onUploadSuccess,
}) => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Array<{ rowNumber: number; errors: string[] }>
  >([]);

  // Validasi data berdasarkan schema Prisma
  const validateRow = useCallback((row: any, rowIndex: number) => {
    const rowErrors: string[] = [];

    // Required fields validation
    if (!row.name?.toString().trim()) {
      rowErrors.push("Nama Lengkap harus diisi");
    } else if (row.name.toString().length > 255) {
      rowErrors.push("Nama Lengkap maksimal 255 karakter");
    }

    if (!row.id_number?.toString().trim()) {
      rowErrors.push("NIK harus diisi");
    } else if (row.id_number.toString().length !== 16) {
      rowErrors.push("NIK harus 16 digit");
    }

    if (!row.birthplace?.toString().trim()) {
      rowErrors.push("Tempat Lahir harus diisi");
    } else if (row.birthplace.toString().length > 255) {
      rowErrors.push("Tempat Lahir maksimal 255 karakter");
    }

    if (!row.date_of_birth?.toString().trim()) {
      rowErrors.push("Tanggal Lahir harus diisi");
    } else {
      const dateValue = new Date(row.date_of_birth);
      if (isNaN(dateValue.getTime())) {
        rowErrors.push("Format Tanggal Lahir tidak valid (gunakan YYYY-MM-DD)");
      }
    }

    if (!row.gender?.toString().trim()) {
      rowErrors.push("Jenis Kelamin harus diisi");
    } else if (
      !["Laki-laki", "Perempuan"].includes(row.gender.toString().trim())
    ) {
      rowErrors.push("Jenis Kelamin hanya boleh Laki-laki atau Perempuan");
    }

    if (!row.address?.toString().trim()) {
      rowErrors.push("Alamat harus diisi");
    }

    // Optional fields with length validation
    if (
      row.family_card_number &&
      row.family_card_number.toString().length > 16
    ) {
      rowErrors.push("No. KK maksimal 16 digit");
    }

    if (row.rt && row.rt.toString().length > 10) {
      rowErrors.push("RT maksimal 10 karakter");
    }

    if (row.rw && row.rw.toString().length > 10) {
      rowErrors.push("RW maksimal 10 karakter");
    }

    if (row.hamlet && row.hamlet.toString().length > 100) {
      rowErrors.push("Dusun maksimal 100 karakter");
    }

    if (row.phone_number && row.phone_number.toString().length > 20) {
      rowErrors.push("No. Telepon maksimal 20 karakter");
    }

    if (row.email && row.email.toString().length > 255) {
      rowErrors.push("Email maksimal 255 karakter");
    }

    return rowErrors;
  }, []);

  // Validasi semua data
  const validateAllData = useCallback(() => {
    const newErrors = excelData
      .map((row, idx) => {
        const rowErrors = validateRow(row, idx);
        return rowErrors.length > 0
          ? { rowNumber: idx + 1, errors: rowErrors }
          : null;
      })
      .filter((item) => item !== null) as Array<{
      rowNumber: number;
      errors: string[];
    }>;

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [excelData, validateRow]);

  const handleDownloadTemplate = () => {
    const template = [
      {
        "Nama Lengkap": "John Doe",
        NIK: "1234567890123456",
        "No. KK": "1234567890123456",
        "Jenis Kelamin": "Laki-laki",
        "Tempat Lahir": "Jakarta",
        "Tanggal Lahir": "1990-01-01",
        Agama: "Islam",
        "Golongan Darah": "A",
        Pendidikan: "Strata I",
        Pekerjaan: "Industri",
        "Status Perkawinan": "Menikah",
        "Status Hubungan KK": "Kepala Keluarga",
        Alamat: "Jl. Contoh No. 123",
        RT: "001",
        RW: "002",
        Dusun: "Dusun Contoh",
        "No. Telepon": "081234567890",
        Email: "contoh@email.com",
        // Keluarga
        "NIK Ayah": "7312071600000001",
        "Nama Ayah": "NAMA AYAH",
        "NIK Ibu": "7312071600000002",
        "Nama Ibu": "NAMA IBU",
        // Kesehatan & Sosial
        "Buta Huruf": "N",
        Disabilitas: "N",
        "ID Disabilitas": "",
        "Disabilitas Lainnya": "",
        Hamil: "N",
        "Tanggal Hamil": "",
        Menyusui: "N",
        Stunting: "N",
        "BPJS KIS": "Y",
        Kontrasepsi: "IUD",
        "Tinggi Badan": 170,
        "Berat Badan": 60,
        Pendapatan: 10000000,
        // Media
        "Cover URL": "",
        "Cover Thumb URL": "",
        "Foto URL": "",
        "Foto Thumb URL": "",
        // Lainnya
        "Kode Negara": "ID",
        "NIK Sementara": "",
        "RT Sementara": "",
        "Kepemilikan Rumah": "Milik Sendiri",
        Desil: "1",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "template_data_warga.xlsx");
    toast.success("Template berhasil diunduh");
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      setErrors([]);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);

          // Mapping field dari bahasa Indonesia ke bahasa Inggris
          const mappedJson = json.map((row: any) => {
            const mappedRow: any = {};
            for (const [key, value] of Object.entries(row)) {
              const mappedKey = FIELD_MAPPING[key as string] || key;
              mappedRow[mappedKey] = value;
            }
            return mappedRow;
          });

          if (mappedJson.length > MAX_BATCH_SIZE) {
            toast.error(
              `Maksimal ${MAX_BATCH_SIZE} data per upload. File Anda: ${mappedJson.length}`
            );
            const slicedData = mappedJson.slice(0, MAX_BATCH_SIZE);
            setExcelData(slicedData);
            // Validate langsung setelah data di-set
            setTimeout(() => {
              const validationErrors = slicedData
                .map((row, idx) => {
                  const rowErrors = validateRow(row, idx);
                  return rowErrors.length > 0
                    ? { rowNumber: idx + 1, errors: rowErrors }
                    : null;
                })
                .filter((item) => item !== null) as Array<{
                rowNumber: number;
                errors: string[];
              }>;
              setErrors(validationErrors);
            }, 0);
            return;
          }

          setExcelData(mappedJson);
          // Validate langsung setelah data di-load
          setTimeout(() => {
            const validationErrors = mappedJson
              .map((row, idx) => {
                const rowErrors = validateRow(row, idx);
                return rowErrors.length > 0
                  ? { rowNumber: idx + 1, errors: rowErrors }
                  : null;
              })
              .filter((item) => item !== null) as Array<{
              rowNumber: number;
              errors: string[];
            }>;
            setErrors(validationErrors);
          }, 0);
          toast.success(
            `Berhasil membaca ${mappedJson.length} data dari Excel`
          );
        } catch (error) {
          toast.error("Gagal membaca file Excel");
          console.error(error);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleEditExcelData = useCallback(
    (index: number, field: string, value: any) => {
      const newData = [...excelData];
      newData[index] = { ...newData[index], [field]: value };
      setExcelData(newData);

      // Validate baris yang di-edit secara real-time
      const rowErrors = validateRow(newData[index], index);
      setErrors((prevErrors) => {
        const otherErrors = prevErrors.filter((e) => e.rowNumber !== index + 1);
        if (rowErrors.length > 0) {
          return [
            ...otherErrors,
            { rowNumber: index + 1, errors: rowErrors },
          ].sort((a, b) => a.rowNumber - b.rowNumber);
        }
        return otherErrors;
      });
    },
    [excelData, validateRow]
  );

  const handleRemoveRow = useCallback(
    (index: number) => {
      const newData = excelData.filter((_, i) => i !== index);
      setExcelData(newData);
      setErrors(errors.filter((e) => e.rowNumber !== index + 1));
      toast.success("Baris dihapus");
    },
    [excelData, errors]
  );

  // Group errors by row for easy lookup
  const errorsByRow = useMemo(() => {
    const map: Record<number, string[]> = {};
    errors.forEach((e) => {
      map[e.rowNumber] = e.errors;
    });
    return map;
  }, [errors]);

  const handleSubmitExcelData = useCallback(async () => {
    // Validate sebelum submit
    if (!validateAllData()) {
      toast.error(
        "Terdapat data yang tidak valid. Silakan perbaiki terlebih dahulu."
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/residents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residents: excelData }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.invalidRows) {
          setErrors(result.invalidRows);
          toast.error(`${result.invalidRows.length} baris data tidak valid`);
        } else {
          toast.error(result.error || "Gagal upload data");
        }
        return;
      }

      toast.success(
        `Berhasil mengupload ${result.data.residentsCreated} data warga`
      );
      setShowExcelDialog(false);
      setExcelData([]);
      setExcelFile(null);
      setErrors([]);

      // Trigger refresh di parent component
      onUploadSuccess?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal menghubungi server");
    } finally {
      setIsSubmitting(false);
    }
  }, [excelData, onUploadSuccess, setShowExcelDialog, validateAllData]);

  return (
    <Dialog open={showExcelDialog} onOpenChange={setShowExcelDialog}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Data Warga dari Excel</DialogTitle>
          <DialogDescription>
            Upload file Excel (.xlsx atau .xls) untuk menambahkan data warga
            secara batch
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Panduan Upload Excel
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>
                    1. Download template Excel terlebih dahulu untuk melihat
                    format yang sesuai
                  </p>
                  <p>
                    2. Isi data warga sesuai dengan kolom yang tersedia di
                    template
                  </p>
                  <p>
                    3. Upload file Excel yang sudah diisi, lalu review data di
                    tabel preview
                  </p>
                  <p>4. Klik Simpan untuk menambahkan data ke sistem</p>
                </div>
              </div>
            </div>
          </div>

          {/* Download Template Section */}
          <div className="space-y-2">
            <Label>Step 1: Download Template Excel</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              <span className="text-sm text-muted-foreground">
                Template berisi contoh format data yang sesuai
              </span>
            </div>
          </div>

          {/* Upload Excel Section */}
          <div className="space-y-2">
            <Label htmlFor="excelFile">Step 2: Upload File Excel</Label>
            <Input
              id="excelFile"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelFileChange}
              className="cursor-pointer"
            />
            {excelFile && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 bg-muted rounded px-3 py-2">
                  <span className="text-muted-foreground">File terpilih: </span>
                  <span className="font-medium">{excelFile.name}</span>
                </div>
                {excelData.length > 0 && (
                  <Badge variant="default" className="bg-green-600">
                    {excelData.length} data berhasil dibaca
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Preview Data Section */}
          {excelData.length > 0 && (
            <div className="space-y-2">
              <Label>Step 3: Review Data yang Akan Diupload</Label>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">
                    ⚠️ {errors.length} baris memiliki kesalahan:
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-700">
                        <span className="font-medium">
                          Baris {error.rowNumber}:
                        </span>
                        <ul className="list-disc list-inside ml-2">
                          {error.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted sticky top-0">
                      <TableRow>
                        <TableHead className="w-12.5">#</TableHead>
                        <TableHead className="w-10 text-center">
                          Status
                        </TableHead>
                        <TableHead className="min-w-45">Nama Lengkap</TableHead>
                        <TableHead className="min-w-35">NIK</TableHead>
                        <TableHead className="min-w-35">No. KK</TableHead>
                        <TableHead className="min-w-25">
                          Jenis Kelamin
                        </TableHead>
                        <TableHead className="min-w-30">Tempat Lahir</TableHead>
                        <TableHead className="min-w-30">
                          Tanggal Lahir
                        </TableHead>
                        <TableHead className="min-w-25">
                          Golongan Darah
                        </TableHead>
                        <TableHead className="min-w-30">Alamat</TableHead>
                        <TableHead className="min-w-20">RT/RW</TableHead>
                        <TableHead className="min-w-25">Dusun</TableHead>
                        <TableHead className="min-w-30">Pendidikan</TableHead>
                        <TableHead className="min-w-30">Pekerjaan</TableHead>
                        <TableHead className="min-w-25">
                          Status Perkawinan
                        </TableHead>
                        <TableHead className="min-w-30">
                          Status Hubungan KK
                        </TableHead>
                        <TableHead className="min-w-30">No. Telepon</TableHead>
                        <TableHead className="min-w-37.5">Email</TableHead>
                        <TableHead className="min-w-30">
                          Kewarganegaraan
                        </TableHead>
                        <TableHead className="w-10 text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excelData.map((data, index) => {
                        const rowErrors = errorsByRow[index + 1] || [];
                        const hasError = rowErrors.length > 0;
                        return (
                          <TableRow
                            key={index}
                            className={`${
                              hasError
                                ? "bg-red-50 hover:bg-red-100"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <TableCell className="text-center text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasError ? (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  ✕
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-50"
                                >
                                  ✓
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <Input
                                value={data.name || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Nama"
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <Input
                                value={data.id_number || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "id_number",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="NIK"
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <Input
                                value={data.family_card_number || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "family_card_number",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="No. KK"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={data.gender || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "gender",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="M/F"
                                maxLength={1}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={data.birthplace || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "birthplace",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Tempat"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                value={data.date_of_birth || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "date_of_birth",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="YYYY-MM-DD"
                                type="date"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Select
                                value={String(data.blood_type_id || "")}
                                onValueChange={(value) =>
                                  handleEditExcelData(
                                    index,
                                    "blood_type_id",
                                    Number(value) || null
                                  )
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pilih Golongan Darah" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(BLOOD_TYPE_OPTIONS).map(
                                    ([id, label]) => (
                                      <SelectItem key={id} value={label}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm max-w-37.5">
                              <Input
                                value={data.address || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "address",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Alamat"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex gap-1">
                                <Input
                                  value={data.rt || ""}
                                  onChange={(e) =>
                                    handleEditExcelData(
                                      index,
                                      "rt",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-10"
                                  placeholder="RT"
                                />
                                <span>/</span>
                                <Input
                                  value={data.rw || ""}
                                  onChange={(e) =>
                                    handleEditExcelData(
                                      index,
                                      "rw",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-10"
                                  placeholder="RW"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                value={data.hamlet || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "hamlet",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Dusun"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Select
                                value={String(data.education_id || "")}
                                onValueChange={(value) =>
                                  handleEditExcelData(
                                    index,
                                    "education_id",
                                    Number(value) || null
                                  )
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pilih Pendidikan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(EDUCATION_OPTIONS).map(
                                    ([id, label]) => (
                                      <SelectItem key={id} value={label}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Select
                                value={String(data.job_id || "")}
                                onValueChange={(value) =>
                                  handleEditExcelData(
                                    index,
                                    "job_id",
                                    Number(value) || null
                                  )
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pilih Pekerjaan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(JOB_OPTIONS).map(
                                    ([id, label]) => (
                                      <SelectItem key={id} value={label}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={data.marital_status || ""}
                                onValueChange={(value) =>
                                  handleEditExcelData(
                                    index,
                                    "marital_status",
                                    value
                                  )
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pilih Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(MARITAL_STATUS_OPTIONS).map(
                                    ([code, label]) => (
                                      <SelectItem key={code} value={label}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Select
                                value={String(data.status_family_id || "")}
                                onValueChange={(value) =>
                                  handleEditExcelData(
                                    index,
                                    "status_family_id",
                                    Number(value) || null
                                  )
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pilih Hubungan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(KK_RELATIONSHIP_STATUS).map(
                                    ([id, label]) => (
                                      <SelectItem key={id} value={label}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                value={data.phone_number || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "phone_number",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="0812..."
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                value={data.email || ""}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "email",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="email@example.com"
                                type="email"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                value={data.nationality || "Indonesia"}
                                onChange={(e) =>
                                  handleEditExcelData(
                                    index,
                                    "nationality",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                                placeholder="Indonesia"
                                maxLength={50}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveRow(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Total {excelData.length} data siap diupload. Pastikan semua data
                sudah benar sebelum menyimpan.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!excelFile && excelData.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Belum ada file yang diupload
              </h3>
              <p className="text-sm text-muted-foreground">
                Silakan download template terlebih dahulu, lalu upload file
                Excel yang sudah diisi
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4 mt-4">
          <div className="text-sm text-muted-foreground">
            {excelData.length > 0 && (
              <span className="font-medium text-primary">
                {excelData.length} data
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowExcelDialog(false);
                setExcelData([]);
                setExcelFile(null);
                setErrors([]);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={handleSubmitExcelData}
              disabled={excelData.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload{" "}
                  {excelData.length > 0 ? `${excelData.length} Data` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
