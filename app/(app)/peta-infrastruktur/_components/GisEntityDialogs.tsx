"use client";

import { Loader2 } from "lucide-react";
import { MapCoordinatePicker } from "@/components/app/gis/MapCoordinatePicker";
import type { MapMarker } from "@/lib/gis/map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";
import {
  ASSET_CONDITION_LABELS,
  ASSET_TYPE_LABELS,
  DISASTER_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
} from "@/lib/gis/labels";

const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS);
const ASSET_CONDITIONS = Object.keys(ASSET_CONDITION_LABELS);
const PROJECT_TYPES = Object.keys(PROJECT_TYPE_LABELS);
const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS);
const DISASTER_TYPES = Object.keys(DISASTER_TYPE_LABELS);
const RISK_LEVELS = Object.keys(RISK_LEVEL_LABELS);

type CoordFields = { lat: string; lng: string };

type GisEntityDialogsProps = {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  boundary: VillageBoundaryPolygon | null;
  saving: boolean;
  assetOpen: boolean;
  projectOpen: boolean;
  disasterOpen: boolean;
  assetForm: {
    name: string;
    assetType: string;
    lat: string;
    lng: string;
    rt: string;
    rw: string;
    condition: string;
  };
  projectForm: {
    title: string;
    projectType: string;
    status: string;
    budget: string;
    lat: string;
    lng: string;
    rt: string;
    rw: string;
  };
  disasterForm: {
    name: string;
    disasterType: string;
    riskLevel: string;
    lat: string;
    lng: string;
    rt: string;
    rw: string;
    notes: string;
  };
  onAssetOpenChange: (open: boolean) => void;
  onProjectOpenChange: (open: boolean) => void;
  onDisasterOpenChange: (open: boolean) => void;
  onAssetFormChange: (form: GisEntityDialogsProps["assetForm"]) => void;
  onProjectFormChange: (form: GisEntityDialogsProps["projectForm"]) => void;
  onDisasterFormChange: (form: GisEntityDialogsProps["disasterForm"]) => void;
  onSaveAsset: () => void | Promise<void>;
  onSaveProject: () => void | Promise<void>;
  onSaveDisaster: () => void | Promise<void>;
};

function CoordInputs({
  idPrefix,
  lat,
  lng,
  onLatLng,
}: CoordFields & {
  idPrefix: string;
  onLatLng: (lat: string, lng: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label htmlFor={`${idPrefix}-lat`}>Latitude</Label>
        <Input
          id={`${idPrefix}-lat`}
          inputMode="decimal"
          value={lat}
          onChange={(e) => onLatLng(e.target.value, lng)}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-lng`}>Longitude</Label>
        <Input
          id={`${idPrefix}-lng`}
          inputMode="decimal"
          value={lng}
          onChange={(e) => onLatLng(lat, e.target.value)}
        />
      </div>
    </div>
  );
}

export function GisEntityDialogs({
  center,
  markers,
  boundary,
  saving,
  assetOpen,
  projectOpen,
  disasterOpen,
  assetForm,
  projectForm,
  disasterForm,
  onAssetOpenChange,
  onProjectOpenChange,
  onDisasterOpenChange,
  onAssetFormChange,
  onProjectFormChange,
  onDisasterFormChange,
  onSaveAsset,
  onSaveProject,
  onSaveDisaster,
}: GisEntityDialogsProps) {
  return (
    <>
      <Dialog open={assetOpen} onOpenChange={onAssetOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Aset Infrastruktur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Nama</Label>
              <Input
                id="asset-name"
                value={assetForm.name}
                onChange={(e) =>
                  onAssetFormChange({ ...assetForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select
                  value={assetForm.assetType}
                  onValueChange={(v) =>
                    onAssetFormChange({ ...assetForm, assetType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ASSET_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kondisi</Label>
                <Select
                  value={assetForm.condition}
                  onValueChange={(v) =>
                    onAssetFormChange({ ...assetForm, condition: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ASSET_CONDITION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="asset-rt">RT</Label>
                <Input
                  id="asset-rt"
                  value={assetForm.rt}
                  onChange={(e) =>
                    onAssetFormChange({ ...assetForm, rt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-rw">RW</Label>
                <Input
                  id="asset-rw"
                  value={assetForm.rw}
                  onChange={(e) =>
                    onAssetFormChange({ ...assetForm, rw: e.target.value })
                  }
                />
              </div>
            </div>
            <CoordInputs
              idPrefix="asset"
              lat={assetForm.lat}
              lng={assetForm.lng}
              onLatLng={(lat, lng) =>
                onAssetFormChange({ ...assetForm, lat, lng })
              }
            />
            <MapCoordinatePicker
              center={center}
              markers={markers}
              boundary={boundary}
              lat={assetForm.lat}
              lng={assetForm.lng}
              onChange={(lat, lng) =>
                onAssetFormChange({ ...assetForm, lat, lng })
              }
            />
            <p className="text-xs text-muted-foreground">
              Titik hanya tampil di peta utama jika latitude dan longitude diisi.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onAssetOpenChange(false)}>
              Batal
            </Button>
            <Button disabled={saving} onClick={() => void onSaveAsset()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectOpen} onOpenChange={onProjectOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Proyek Infrastruktur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="project-title">Judul</Label>
              <Input
                id="project-title"
                value={projectForm.title}
                onChange={(e) =>
                  onProjectFormChange({ ...projectForm, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tipe</Label>
                <Select
                  value={projectForm.projectType}
                  onValueChange={(v) =>
                    onProjectFormChange({ ...projectForm, projectType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROJECT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(v) =>
                    onProjectFormChange({ ...projectForm, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="project-budget">Anggaran (Rp)</Label>
              <Input
                id="project-budget"
                inputMode="numeric"
                value={projectForm.budget}
                onChange={(e) =>
                  onProjectFormChange({ ...projectForm, budget: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="project-rt">RT</Label>
                <Input
                  id="project-rt"
                  value={projectForm.rt}
                  onChange={(e) =>
                    onProjectFormChange({ ...projectForm, rt: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="project-rw">RW</Label>
                <Input
                  id="project-rw"
                  value={projectForm.rw}
                  onChange={(e) =>
                    onProjectFormChange({ ...projectForm, rw: e.target.value })
                  }
                />
              </div>
            </div>
            <CoordInputs
              idPrefix="project"
              lat={projectForm.lat}
              lng={projectForm.lng}
              onLatLng={(lat, lng) =>
                onProjectFormChange({ ...projectForm, lat, lng })
              }
            />
            <MapCoordinatePicker
              center={center}
              markers={markers}
              boundary={boundary}
              lat={projectForm.lat}
              lng={projectForm.lng}
              onChange={(lat, lng) =>
                onProjectFormChange({ ...projectForm, lat, lng })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onProjectOpenChange(false)}>
              Batal
            </Button>
            <Button disabled={saving} onClick={() => void onSaveProject()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disasterOpen} onOpenChange={onDisasterOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Titik Risiko Bencana</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="disaster-name">Nama lokasi</Label>
              <Input
                id="disaster-name"
                value={disasterForm.name}
                onChange={(e) =>
                  onDisasterFormChange({ ...disasterForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Jenis bencana</Label>
                <Select
                  value={disasterForm.disasterType}
                  onValueChange={(v) =>
                    onDisasterFormChange({ ...disasterForm, disasterType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISASTER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {DISASTER_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tingkat risiko</Label>
                <Select
                  value={disasterForm.riskLevel}
                  onValueChange={(v) =>
                    onDisasterFormChange({ ...disasterForm, riskLevel: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {RISK_LEVEL_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="disaster-rt">RT</Label>
                <Input
                  id="disaster-rt"
                  value={disasterForm.rt}
                  onChange={(e) =>
                    onDisasterFormChange({ ...disasterForm, rt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disaster-rw">RW</Label>
                <Input
                  id="disaster-rw"
                  value={disasterForm.rw}
                  onChange={(e) =>
                    onDisasterFormChange({ ...disasterForm, rw: e.target.value })
                  }
                />
              </div>
            </div>
            <CoordInputs
              idPrefix="disaster"
              lat={disasterForm.lat}
              lng={disasterForm.lng}
              onLatLng={(lat, lng) =>
                onDisasterFormChange({ ...disasterForm, lat, lng })
              }
            />
            <MapCoordinatePicker
              center={center}
              markers={markers}
              boundary={boundary}
              lat={disasterForm.lat}
              lng={disasterForm.lng}
              onChange={(lat, lng) =>
                onDisasterFormChange({ ...disasterForm, lat, lng })
              }
            />
            <div className="space-y-2">
              <Label htmlFor="disaster-notes">Catatan</Label>
              <Input
                id="disaster-notes"
                value={disasterForm.notes}
                onChange={(e) =>
                  onDisasterFormChange({ ...disasterForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDisasterOpenChange(false)}>
              Batal
            </Button>
            <Button disabled={saving} onClick={() => void onSaveDisaster()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
