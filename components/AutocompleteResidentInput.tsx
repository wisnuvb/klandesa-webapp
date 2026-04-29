import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "./ui/input";
import { Search, User } from "lucide-react";
import { cn } from "./ui/utils";

export interface ResidentOption {
  id: number;
  nik: string;
  name: string;
  birthplace: string;
  /** YYYY-MM-DD */
  date_of_birth: string;
  gender: string;
  occupation: string;
  address: string;
  marital_status?: string;
  nationality?: string;
  religion?: string;
}

interface ApiResidentRow {
  id: number;
  nik: string;
  name: string;
  birthplace: string;
  birthDate: string | Date;
  gender: string;
  occupation?: string | null;
  address: string;
  maritalStatus: string;
  nationality?: string | null;
  religion: string;
}

/** Mengonversi baris dari GET /api/residents → bentuk pemilih form surat */
export function mapApiResidentToSelectable(row: ApiResidentRow): ResidentOption {
  let isoDay: string;
  const bd = row.birthDate;
  if (typeof bd === "string") {
    isoDay = bd.includes("T") ? bd.slice(0, 10) : bd.slice(0, 10);
  } else {
    isoDay = new Date(bd).toISOString().slice(0, 10);
  }

  return {
    id: row.id,
    nik: row.nik,
    name: row.name,
    birthplace: row.birthplace,
    date_of_birth: isoDay,
    gender: row.gender,
    occupation: row.occupation ?? "",
    address: row.address,
    marital_status: row.maritalStatus,
    nationality: row.nationality ?? "Indonesia",
    religion: row.religion,
  };
}

interface AutocompleteResidentInputProps {
  value: string;
  onChange: (value: string) => void;
  onResidentSelect: (resident: ResidentOption | null) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 320;

export function AutocompleteResidentInput({
  value,
  onChange,
  onResidentSelect,
  placeholder = "Ketik nama atau NIK...",
  className,
}: AutocompleteResidentInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ResidentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchResidents = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setRows([]);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "15",
        search: q.trim(),
      });
      const res = await fetch(`/api/residents?${params}`, {
        signal: ac.signal,
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const list = Array.isArray(data.rows)
        ? (data.rows as ApiResidentRow[]).map(mapApiResidentToSelectable)
        : [];
      setRows(list);
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "AbortError") return;
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRows([]);
      return undefined;
    }
    const t = window.setTimeout(() => {
      void fetchResidents(q);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery, fetchResidents]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery(newValue);

    if (newValue.trim().length > 0) {
      setOpen(true);
    }

    if (newValue === "") {
      onResidentSelect(null);
      setRows([]);
    }
  };

  const handleSelectResident = (resident: ResidentOption) => {
    onChange(resident.name);
    onResidentSelect(resident);
    setOpen(false);
    setSearchQuery(resident.name);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length >= 2 || value.length > 0) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          className={cn("pl-10", className)}
          autoComplete="off"
        />
      </div>

      {open && searchQuery.trim().length >= 2 && loading && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Mencari warga…
        </div>
      )}

      {open &&
        !loading &&
        searchQuery.trim().length >= 2 &&
        rows.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            <div className="p-2">
              {rows.map((resident) => (
                <button
                  key={resident.id}
                  type="button"
                  onClick={() => handleSelectResident(resident)}
                  className="flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{resident.name}</div>
                    <div className="text-sm text-muted-foreground">
                      NIK: {resident.nik}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {resident.address}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      {open &&
        !loading &&
        searchQuery.trim().length >= 2 &&
        rows.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md">
            <User className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>Tidak ada warga ditemukan</p>
            <p className="mt-1 text-xs">Isi manual jika perlu</p>
          </div>
        )}

      {open && searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          Ketik minimal 2 karakter untuk mencari warga di database desa.
        </div>
      )}
    </div>
  );
}

/** Format YYYY-MM-DD ke tampilan tanggal Indonesia (tanggal lengkap). */
export function formatDateForDisplay(dateString: string): string {
  const [y, m, d] = dateString.split("-").map(Number);
  if (
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d) ||
    m < 1 ||
    m > 12
  ) {
    return "";
  }
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Isi variabel template umum dari data warga terpilih */
export function mapResidentToFormData(
  resident: ResidentOption,
): Record<string, string> {
  return {
    NAMA_LENGKAP: resident.name,
    NAMA: resident.name,
    NIK: resident.nik,
    TEMPAT_LAHIR: resident.birthplace,
    TANGGAL_LAHIR: formatDateForDisplay(resident.date_of_birth),
    JENIS_KELAMIN: resident.gender,
    PEKERJAAN: resident.occupation,
    ALAMAT: resident.address,
    ALAMAT_LENGKAP: resident.address,
    STATUS_PERKAWINAN: resident.marital_status ?? "",
    KEWARGANEGARAAN: resident.nationality ?? "",
    AGAMA: resident.religion ?? "",
  };
}
