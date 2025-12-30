import { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Check, Search, User } from 'lucide-react';
import { cn } from './ui/utils';

interface Resident {
  id: number;
  nik: string;
  name: string;
  birthplace: string;
  date_of_birth: string;
  gender: string;
  occupation: string;
  address: string;
  marital_status?: string;
  nationality?: string;
  religion?: string;
}

interface AutocompleteResidentInputProps {
  value: string;
  onChange: (value: string) => void;
  onResidentSelect: (resident: Resident | null) => void;
  placeholder?: string;
  className?: string;
}

// Mock data warga - in production, this would come from API
const mockResidents: Resident[] = [
  {
    id: 1,
    nik: '3201010101850001',
    name: 'Ahmad Lutfi Akbar',
    birthplace: 'Pasuruan',
    date_of_birth: '1985-01-01',
    gender: 'Laki-laki',
    occupation: 'Wiraswasta',
    address: 'Jl. Merdeka No. 123, RT 001/RW 002, Desa Brambang',
    marital_status: 'Kawin',
    nationality: 'Indonesia',
    religion: 'Islam'
  },
  {
    id: 2,
    nik: '3201014505900002',
    name: 'Siti Aminah',
    birthplace: 'Pasuruan',
    date_of_birth: '1990-05-05',
    gender: 'Perempuan',
    occupation: 'Ibu Rumah Tangga',
    address: 'Jl. Raya Desa No. 78, RT 003/RW 002, Desa Brambang',
    marital_status: 'Kawin',
    nationality: 'Indonesia',
    religion: 'Islam'
  },
  {
    id: 3,
    nik: '3201011212880003',
    name: 'Budi Santoso',
    birthplace: 'Surabaya',
    date_of_birth: '1988-12-12',
    gender: 'Laki-laki',
    occupation: 'Buruh Harian',
    address: 'Jl. Kenanga No. 23, RT 001/RW 003, Desa Brambang',
    marital_status: 'Kawin',
    nationality: 'Indonesia',
    religion: 'Islam'
  },
  {
    id: 4,
    nik: '3201012203920004',
    name: 'Rina Wulandari',
    birthplace: 'Malang',
    date_of_birth: '1992-03-22',
    gender: 'Perempuan',
    occupation: 'Karyawan Swasta',
    address: 'Jl. Melati No. 56, RT 004/RW 001, Desa Brambang',
    marital_status: 'Belum Kawin',
    nationality: 'Indonesia',
    religion: 'Islam'
  },
  {
    id: 5,
    nik: '3201013108950005',
    name: 'Wahyudi Ismail',
    birthplace: 'Pasuruan',
    date_of_birth: '1995-08-31',
    gender: 'Laki-laki',
    occupation: 'Pegawai Negeri Sipil',
    address: 'Jl. Anggrek No. 12, RT 002/RW 001, Desa Brambang',
    marital_status: 'Kawin',
    nationality: 'Indonesia',
    religion: 'Islam'
  }
];

export function AutocompleteResidentInput({
  value,
  onChange,
  onResidentSelect,
  placeholder = 'Ketik nama atau NIK...',
  className
}: AutocompleteResidentInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter residents based on search query
  const filteredResidents = mockResidents.filter(resident => {
    const query = searchQuery.toLowerCase();
    return (
      resident.name.toLowerCase().includes(query) ||
      resident.nik.includes(query)
    );
  });

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery(newValue);
    
    // Open dropdown when user types
    if (newValue.length > 0) {
      setOpen(true);
    }
    
    // Clear selection if input is cleared
    if (newValue === '') {
      onResidentSelect(null);
    }
  };

  const handleSelectResident = (resident: Resident) => {
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
            if (value.length > 0) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          className={cn("pl-10", className)}
          autoComplete="off"
        />
      </div>

      {/* Dropdown suggestions */}
      {open && filteredResidents.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-80 overflow-y-auto">
          <div className="p-2">
            {filteredResidents.map((resident) => (
              <button
                key={resident.id}
                onClick={() => handleSelectResident(resident)}
                className="w-full flex items-start gap-3 p-3 hover:bg-accent rounded-md text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{resident.name}</div>
                  <div className="text-sm text-muted-foreground">NIK: {resident.nik}</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {resident.address}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {open && searchQuery.length > 0 && filteredResidents.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-4 text-center text-sm text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Tidak ada warga ditemukan</p>
          <p className="text-xs mt-1">Data akan diisi manual</p>
        </div>
      )}
    </div>
  );
}

// Helper function to format date for display
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper function to auto-fill form data from resident
export function mapResidentToFormData(resident: Resident): Record<string, string> {
  return {
    NAMA: resident.name,
    NIK: resident.nik,
    TEMPAT_LAHIR: resident.birthplace,
    TANGGAL_LAHIR: formatDateForDisplay(resident.date_of_birth),
    JENIS_KELAMIN: resident.gender,
    PEKERJAAN: resident.occupation,
    ALAMAT: resident.address,
    STATUS_PERKAWINAN: resident.marital_status || '',
    KEWARGANEGARAAN: resident.nationality || '',
    AGAMA: resident.religion || ''
  };
}