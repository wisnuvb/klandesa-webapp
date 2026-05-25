"use client";

import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPageToolbar } from "@/components/app/patterns";

type ActionsBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterYear: string;
  setFilterYear: (value: string) => void;
  uniqueYears: number[];
  onAdd: () => void;
  showAdd?: boolean;
};

export function ActionsBar(props: ActionsBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    filterYear,
    setFilterYear,
    uniqueYears,
    onAdd,
    showAdd = true,
  } = props;

  return (
    <ListPageToolbar
      searchPlaceholder="Cari tahun..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      showAdd={showAdd}
      onAdd={onAdd}
      filters={[
        {
          id: "year",
          element: (
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {uniqueYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    Tahun {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
      ]}
      exportItems={[
        {
          id: "excel",
          label: "Download Excel",
          icon: <FileSpreadsheet className="h-4 w-4 text-green-600" />,
          onSelect: () => undefined,
        },
        {
          id: "csv",
          label: "Download CSV",
          icon: <FileText className="h-4 w-4 text-blue-600" />,
          onSelect: () => undefined,
        },
        {
          id: "pdf",
          label: "Download PDF",
          icon: <FileDown className="h-4 w-4 text-red-600" />,
          onSelect: () => undefined,
        },
      ]}
    />
  );
}
