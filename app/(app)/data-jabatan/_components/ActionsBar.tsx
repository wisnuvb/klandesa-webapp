"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

type ActionsBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onAdd: () => void;
};

export function ActionsBar(props: ActionsBarProps) {
  const { searchQuery, setSearchQuery, onAdd } = props;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama jabatan atau deskripsi..."
                className="pl-10 bg-input-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Tambah Jabatan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

