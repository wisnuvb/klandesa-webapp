"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { OrgSettings } from "@/lib/officials/org";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: OrgSettings;
  onSaved: (settings: OrgSettings) => void;
};

/** Pengaturan bagan per desa. Peraturan Bupati/Walikota boleh berbeda dari Permendagri 84/2015 (Pasal 15). */
export function OrgSettingsDialog({ open, onOpenChange, settings, onSaved }: Props) {
  const [draft, setDraft] = useState<OrgSettings>(settings);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/officials/org-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = (await res.json().catch(() => ({}))) as { orgSettings?: OrgSettings; error?: string };
      if (!res.ok || !json.orgSettings) throw new Error(json.error ?? "Gagal menyimpan pengaturan");
      onSaved(json.orgSettings);
      toast.success("Pengaturan bagan disimpan");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (o) setDraft(settings);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pengaturan bagan hirarki</DialogTitle>
          <DialogDescription>
            Sesuaikan dengan Peraturan Bupati/Walikota di daerah Anda. Pengaturan ini memengaruhi saran atasan di formulir dan peringatan kerapian, bukan data perangkat.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Kepala Seksi (Kasi) melapor ke</legend>
          <RadioGroup value={draft.reporting} onValueChange={(v) => setDraft((d) => ({ ...d, reporting: v === "via_sekdes" ? "via_sekdes" : "direct" }))} className="gap-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="direct" id="rep-direct" className="mt-1" />
              <Label htmlFor="rep-direct" className="flex-col items-start gap-0.5 font-normal">
                <span className="font-medium">Kepala Desa langsung</span>
                <span className="text-xs text-muted-foreground">Sesuai Permendagri 84/2015 Pasal 9: Kasi membantu Kepala Desa.</span>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="via_sekdes" id="rep-via" className="mt-1" />
              <Label htmlFor="rep-via" className="flex-col items-start gap-0.5 font-normal">
                <span className="font-medium">Melalui Sekretaris Desa</span>
                <span className="text-xs text-muted-foreground">Dipakai sebagian Peraturan Bupati: Kasi di bawah Sekdes dalam bagan.</span>
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="org-coordination" className="font-medium">
              Sekdes mengoordinasikan Kasi dan Kepala Dusun
            </Label>
            <p id="org-coordination-help" className="text-xs text-muted-foreground">
              Menggambar garis putus-putus dari Sekretaris Desa ke Kasi dan Kepala Dusun yang bukan bawahan langsungnya. Nyalakan hanya bila Peraturan Bupati Anda mengatur demikian. Permendagri sendiri menyebut Kepala Desa yang mengoordinasikan semua bawahan (Pasal 12).
            </p>
          </div>
          <Switch id="org-coordination" aria-describedby="org-coordination-help" checked={draft.coordination} onCheckedChange={(c) => setDraft((d) => ({ ...d, coordination: c }))} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button type="button" className="h-11" onClick={() => void save()} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
