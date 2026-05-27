"use client";

import { useCallback, useState } from "react";
import {
  Check,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { VillageMap } from "@/components/app/gis/VillageMapClient";
import type { MapMarker } from "@/lib/gis/map";
import { Can } from "@/components/permissions/Can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";

type BoundaryMode = "idle" | "draw" | "edit";

type GisMapPanelProps = {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  boundary: VillageBoundaryPolygon | null;
  mapRefreshing: boolean;
  onSave: (boundary: VillageBoundaryPolygon | null) => Promise<void>;
  onRefresh: () => void | Promise<void>;
};

export function GisMapPanel({
  center,
  markers,
  boundary,
  mapRefreshing,
  onSave,
  onRefresh,
}: GisMapPanelProps) {
  const [mode, setMode] = useState<BoundaryMode>("idle");
  const [pendingBoundary, setPendingBoundary] =
    useState<VillageBoundaryPolygon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exitMode = useCallback(() => {
    setPendingBoundary(null);
    setError(null);
    setMode("idle");
  }, []);

  const enterDraw = useCallback(() => {
    setError(null);
    setPendingBoundary(null);
    setMode("draw");
  }, []);

  const enterEdit = useCallback(() => {
    setError(null);
    setPendingBoundary(boundary);
    setMode("edit");
  }, [boundary]);

  const savePending = useCallback(async () => {
    if (!pendingBoundary) {
      setError("Belum ada batas desa yang digambar.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(pendingBoundary);
      exitMode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }, [pendingBoundary, onSave, exitMode]);

  const deleteBoundary = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(null);
      exitMode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus batas");
    } finally {
      setSaving(false);
    }
  }, [onSave, exitMode]);

  const mapMode =
    mode === "draw"
      ? "drawBoundary"
      : mode === "edit"
        ? "editBoundary"
        : "view";

  const canSave =
    mode === "draw"
      ? pendingBoundary !== null
      : mode === "edit" &&
        pendingBoundary !== null &&
        JSON.stringify(pendingBoundary) !== JSON.stringify(boundary);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Peta Desa
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Titik biru = aset, hijau = proyek, merah = bencana. Ungu = batas
            wilayah desa.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={mapRefreshing}
          onClick={() => void onRefresh()}
        >
          {mapRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Perbarui
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 p-0 pb-2 px-2">
        {error ? (
          <p className="text-xs text-destructive px-2">{error}</p>
        ) : null}
        <div className="relative">
          <VillageMap
            center={center}
            markers={markers}
            boundary={boundary}
            mode={mapMode}
            onBoundaryDraft={setPendingBoundary}
            onBoundaryClick={boundary ? enterEdit : undefined}
          />

          {mode !== "idle" && (
            <div className="gis-help absolute top-2 right-2 z-20 px-3 py-2 rounded-md text-xs text-muted-foreground max-w-[280px] pointer-events-none space-y-0.5">
              {mode === "draw" ? (
                <>
                  <p>
                    <strong>Klik</strong> peta untuk menambah titik polygon
                  </p>
                  <p>
                    <strong>Klik titik pertama</strong> untuk menutup batas
                  </p>
                  <p>
                    Setelah selesai, tekan <strong>Simpan</strong>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Drag</strong> titik untuk memindahkan vertex
                  </p>
                  <p>
                    <strong>Klik titik tengah</strong> garis untuk menambah
                    vertex
                  </p>
                  <p>
                    <strong>Klik vertex</strong> untuk menghapus (min. 3 titik)
                  </p>
                </>
              )}
            </div>
          )}

          <Can resource="gis" action="create">
            <div className="gis-toolbar absolute bottom-2 left-2 flex flex-wrap gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-md">
              {mode === "idle" ? (
                <>
                  <Button size="sm" variant="ghost" onClick={enterDraw}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Gambar Batas
                  </Button>
                  {boundary ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={enterEdit}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Ubah Batas
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => void deleteBoundary()}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Hapus
                      </Button>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    disabled={saving || !canSave}
                    onClick={() => void savePending()}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : mode === "draw" ? (
                      <Save className="h-4 w-4 mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    {mode === "draw" ? "Simpan Batas" : "Simpan Perubahan"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={exitMode}>
                    <X className="h-4 w-4 mr-1" />
                    Batal
                  </Button>
                </>
              )}
            </div>
          </Can>
        </div>
      </CardContent>
    </Card>
  );
}
