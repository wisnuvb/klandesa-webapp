"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { SUB_BIDANG } from "@/lib/apbdes/codes";
import type { LineView } from "@/lib/apbdes/service";
import { MoneyInput } from "./MoneyInput";
import { SELECT_CLASS, type Overview } from "./shared";
import { SearchSelect } from "@/components/ui/search-select";

type Kind = "PENDAPATAN" | "BELANJA" | "PEMBIAYAAN";
const KIND_LABEL: Record<Kind, string> = { PENDAPATAN: "Pendapatan", BELANJA: "Belanja", PEMBIAYAAN: "Pembiayaan" };
const kindOf = (code: string): Kind => (code.startsWith("5.") ? "BELANJA" : code.startsWith("6.") ? "PEMBIAYAAN" : "PENDAPATAN");
const LABELS = { accountCode: "Kode rekening", activityCode: "Kegiatan", description: "Uraian", amount: "Jumlah", fundSource: "Sumber dana" };

export function LineDialog({ documentId, line, terms, onClose, onSaved }: { documentId: number; line: LineView | null; terms: Overview["terms"]; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>(line ? kindOf(line.accountCode) : "BELANJA");
  const [f, setF] = useState({
    accountCode: line?.accountCode ?? "",
    activityCode: line?.activityCode ?? "",
    description: line?.description ?? "",
    amount: line ? line.amount.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") : "",
    fundSource: line?.fundSource ?? "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const accounts = kind === "PENDAPATAN" ? terms.incomeAccounts : kind === "BELANJA" ? terms.expenseAccounts : terms.financingAccounts;
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{line ? "Ubah baris anggaran" : "Tambah baris anggaran"}</DialogTitle>
          <DialogDescription>Kode bidang, kegiatan, dan rekening sesuai Lampiran A Permendagri 20/2018. Tanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = { ...f, activityCode: kind === "BELANJA" ? f.activityCode : "", fundSource: f.fundSource || null };
            const url = line ? `/api/apbdes/dokumen/${documentId}/baris/${line.id}` : `/api/apbdes/dokumen/${documentId}/baris`;
            if (await submit(url, line ? "PUT" : "POST", body)) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Jenis *</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${kind === k ? "border-primary bg-primary/10 font-medium" : ""}`}>
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); set({ accountCode: "", activityCode: "" }); }} />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>

          {kind === "BELANJA" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ln-activity">Kegiatan *</Label>
              <SearchSelect {...fieldA11y("ln-activity", errors.activityCode)} className={SELECT_CLASS} value={f.activityCode} onChange={(e) => set({ activityCode: e.target.value })}>
                <option value="">Pilih kegiatan…</option>
                {SUB_BIDANG.map((s) => (
                  <optgroup key={s.code} label={`${s.code} ${s.name}`.slice(0, 90)}>
                    {terms.activities.filter((a) => a.code.startsWith(`${s.code}.`)).map((a) => (
                      <option key={a.code} value={a.code}>{`${a.code} ${a.name}`.slice(0, 110)}</option>
                    ))}
                  </optgroup>
                ))}
              </SearchSelect>
              <FieldError id="ln-activity" message={errors.activityCode} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="ln-account">Kode rekening *</Label>
            <SearchSelect {...fieldA11y("ln-account", errors.accountCode)} className={SELECT_CLASS} value={f.accountCode} onChange={(e) => set({ accountCode: e.target.value })}>
              <option value="">Pilih rekening…</option>
              {accounts.map((a) => (
                <option key={a.code} value={a.code.replace("90-99", "90")}>{`${a.code.replace("90-99", "90")} ${a.name}`.slice(0, 120)}</option>
              ))}
            </SearchSelect>
            <FieldError id="ln-account" message={errors.accountCode} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ln-desc">Uraian</Label>
            <Input {...fieldA11y("ln-desc", errors.description)} className="h-11" maxLength={300} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Kosongkan untuk memakai nama rekening" />
            <FieldError id="ln-desc" message={errors.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ln-amount">Jumlah *</Label>
              <MoneyInput id="ln-amount" value={f.amount} onChange={(d) => set({ amount: d })} invalid={Boolean(errors.amount)} describedBy={errors.amount ? "ln-amount-err" : undefined} />
              <FieldError id="ln-amount" message={errors.amount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln-fund">Sumber dana</Label>
              <SearchSelect {...fieldA11y("ln-fund", errors.fundSource)} className={SELECT_CLASS} value={f.fundSource} onChange={(e) => set({ fundSource: e.target.value })}>
                <option value="">Tidak dipilih</option>
                {Object.entries(terms.fundSources).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </SearchSelect>
              <FieldError id="ln-fund" message={errors.fundSource} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
