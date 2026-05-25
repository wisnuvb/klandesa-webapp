"use client";

import type { ReactNode } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ListPageToolbarFilter = {
  id: string;
  element: ReactNode;
};

export type ListPageToolbarExportItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
};

type ListPageToolbarProps = {
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  filters?: ListPageToolbarFilter[];
  exportItems?: ListPageToolbarExportItem[];
  addLabel?: string;
  onAdd?: () => void;
  showAdd?: boolean;
  trailing?: ReactNode;
};

export function ListPageToolbar({
  searchPlaceholder = "Cari...",
  searchQuery = "",
  onSearchChange,
  filters = [],
  exportItems = [],
  addLabel = "Tambah Data",
  onAdd,
  showAdd = true,
  trailing,
}: ListPageToolbarProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {onSearchChange ? (
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {filters.map((filter) => (
              <div key={filter.id}>{filter.element}</div>
            ))}

            {exportItems.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Download
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {exportItems.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      className="gap-2"
                      onSelect={item.onSelect}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {showAdd && onAdd ? (
              <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                {addLabel}
              </Button>
            ) : null}

            {trailing}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
