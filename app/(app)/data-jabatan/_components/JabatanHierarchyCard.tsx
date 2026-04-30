import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Jabatan } from "../_lib/types";
import { getLevelBadgeVariant, getLevelName } from "../_lib/formatting";

type JabatanHierarchyCardProps = {
  isLoading: boolean;
  jabatanList: Jabatan[];
};

export function JabatanHierarchyCard(props: JabatanHierarchyCardProps) {
  const { isLoading, jabatanList } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bagan Hirarki Organisasi</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualisasi struktur jabatan berdasarkan level organisasi
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        ) : jabatanList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada data jabatan untuk ditampilkan.
          </p>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((level) => {
              const levelItems = jabatanList.filter((j) => j.level === level);
              if (levelItems.length === 0) return null;

              return (
                <div key={level} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={getLevelBadgeVariant(level)}>Level {level}</Badge>
                    <p className="text-sm font-medium">{getLevelName(level)}</p>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {levelItems.map((jabatan) => (
                      <div
                        key={jabatan.id}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">{jabatan.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {jabatan.description || "Tanpa deskripsi"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {jabatan.total_staff} Pegawai
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {level < 5 && (
                    <div className="flex justify-center py-1">
                      <div className="h-6 w-px bg-border" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

