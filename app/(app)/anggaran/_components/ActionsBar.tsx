"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
} from "lucide-react";

type ActionsBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterYear: string;
  setFilterYear: (value: string) => void;
  uniqueYears: number[];
  onAdd: () => void;
};

export function ActionsBar(props: ActionsBarProps) {
  const { searchQuery, setSearchQuery, filterYear, setFilterYear, uniqueYears, onAdd } = props;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari tahun..."
                className="pl-10 bg-input-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Download
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Download Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Download CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileDown className="h-4 w-4 text-red-600" />
                  <span>Download PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Tambah Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

