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
import { YEAR_OPTIONS } from "../_lib/constants";

type HeaderSectionProps = {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
};

export function HeaderSection(props: HeaderSectionProps) {
  const { selectedYear, setSelectedYear } = props;

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
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Laporan
        </Button>
      </div>
    </div>
  );
}

