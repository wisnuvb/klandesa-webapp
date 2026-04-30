"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Plus, Search, Upload } from "lucide-react";
import type { Position } from "../_lib/types";

type ActionsBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  filterPosition: string;
  setFilterPosition: (value: string) => void;

  filterStatus: string;
  setFilterStatus: (value: string) => void;

  positions: Position[];
  onAdd: () => void;
};

export function ActionsBar(props: ActionsBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    filterPosition,
    setFilterPosition,
    filterStatus,
    setFilterStatus,
    positions,
    onAdd,
  } = props;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau NIK..."
                className="pl-10 bg-input-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Jabatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jabatan</SelectItem>
                {positions.length === 0 ? (
                  <SelectItem value="no-positions" disabled>
                    Tidak ada jabatan tersedia
                  </SelectItem>
                ) : (
                  positions.map((position) => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      {position.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>

            <Button variant="outline" className="gap-2 hidden">
              <Upload className="h-4 w-4" />
              Upload Excel
            </Button>

            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Tambah Perangkat
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

