"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HeaderSectionProps = {
  selectedYear: string;
  yearOptions: string[];
  setSelectedYear: (year: string) => void;
  onExport: () => void;
  canExport: boolean;
};

export function HeaderSection(props: HeaderSectionProps) {
  const { selectedYear, yearOptions, setSelectedYear, onExport, canExport } = props;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-semibold">Sistem Keuangan Desa</h1>
        <p className="text-muted-foreground mt-1">
          Pengelolaan APBDes, Kas Desa, dan Laporan Keuangan
        </p>
      </div>
      <div className="flex gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="gap-2"
          onClick={onExport}
          disabled={!canExport}
          title="Unduh Buku Kas tahun ini (CSV)"
        >
          <Download className="h-4 w-4" />
          Export Buku Kas
        </Button>
      </div>
    </div>
  );
}

