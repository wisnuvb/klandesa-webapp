"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EditFormState, OfficialRow, Position } from "../_lib/types";
import { LiveAttachments } from "@/components/app/attachments/AttachmentsSection";

type OfficialEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOfficial: OfficialRow | null;
  isSubmittingAction: boolean;
  editForm: EditFormState;
  setEditForm: Dispatch<SetStateAction<EditFormState>>;
  positions: Position[];
  supervisorCandidates: OfficialRow[];
  coordinatorCandidates: OfficialRow[];
  onSave: () => void;
};

export function OfficialEditDialog(props: OfficialEditDialogProps) {
  const {
    open,
    onOpenChange,
    selectedOfficial,
    isSubmittingAction,
    editForm,
    setEditForm,
    positions,
    supervisorCandidates,
    coordinatorCandidates,
    onSave,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Perangkat</DialogTitle>
          <DialogDescription>Perbarui data perangkat desa.</DialogDescription>
        </DialogHeader>

        {selectedOfficial && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Nama</p>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Jabatan</p>
              <Select
                value={editForm.positionId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    positionId: value,
                    supervisorId: "none",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem
                      key={position.id}
                      value={position.id.toString()}
                    >
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-1" id="edit-atasan-label">Atasan (garis komando)</p>
              <Select
                value={editForm.supervisorId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, supervisorId: value }))
                }
              >
                <SelectTrigger className="w-full" aria-labelledby="edit-atasan-label">
                  <SelectValue placeholder="Pilih Atasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {supervisorCandidates.map((official) => (
                    <SelectItem
                      key={official.id}
                      value={official.id.toString()}
                    >
                      {`${official.name} - ${official.position?.name ?? "Tanpa Jabatan"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-1" id="edit-koordinator-label">Dikoordinasikan oleh (opsional)</p>
              <Select
                value={editForm.coordinatorId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, coordinatorId: value }))
                }
              >
                <SelectTrigger className="w-full" aria-labelledby="edit-koordinator-label">
                  <SelectValue placeholder="Pilih koordinator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {coordinatorCandidates.map((official) => (
                    <SelectItem key={official.id} value={official.id.toString()}>
                      {`${official.name} - ${official.position?.name ?? "Tanpa Jabatan"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Hanya untuk garis putus-putus di Bagan Hirarki. Tidak mengubah siapa atasannya.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    status: value as EditFormState["status"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Email</p>
              <Input
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Telepon</p>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Alamat</p>
              <Textarea
                value={editForm.address}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, address: e.target.value }))
                }
              />
            </div>

            <LiveAttachments type="OFFICIAL" id={selectedOfficial.id} title="Berkas SK pengangkatan" hint="Salinan SK pengangkatan (PDF atau pindaian). Disimpan di Arsip Digital." />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmittingAction}
          >
            Batal
          </Button>
          <Button onClick={onSave} disabled={isSubmittingAction}>
            {isSubmittingAction ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
