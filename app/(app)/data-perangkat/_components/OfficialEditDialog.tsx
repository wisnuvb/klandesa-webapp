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

type OfficialEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOfficial: OfficialRow | null;
  isSubmittingAction: boolean;
  editForm: EditFormState;
  setEditForm: Dispatch<SetStateAction<EditFormState>>;
  positions: Position[];
  supervisorCandidates: OfficialRow[];
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
    onSave,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
              <p className="text-sm font-medium mb-1">Atasan</p>
              <Select
                value={editForm.supervisorId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, supervisorId: value }))
                }
              >
                <SelectTrigger className="w-full">
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
