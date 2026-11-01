"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { CodeEntry } from "@/lib/apbdes/codes";
import type { DocumentSummary, MonthStatus } from "@/lib/apbdes/service";

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export interface Overview {
  year: number;
  settings: { bankName: string | null; bankBranch: string | null; bankAccountNo: string | null; villageHeadName: string | null; secretaryName: string | null; treasurerName: string | null };
  documents: DocumentSummary[];
  activeDocumentId: number | null;
  activeLabel: string | null;
  balances: { tunai: string; bank: string; pajak: string; total: string };
  summary: { incomeBudget: string; incomeRealized: string; expenseBudget: string; expenseRealized: string; silpaRealized: string };
  months: MonthStatus[];
  alerts: string[];
  deadlines: { semesterOne: string; accountability: string };
  entryCount: number;
  can: { read: boolean; create: boolean; update: boolean; delete: boolean; export: boolean; approve: boolean };
  verifier: boolean;
  terms: {
    source: string;
    entryTypes: Record<string, string>;
    channels: Record<string, string>;
    fundSources: Record<string, string>;
    taxKinds: string[];
    activities: CodeEntry[];
    incomeAccounts: CodeEntry[];
    expenseAccounts: CodeEntry[];
    financingAccounts: CodeEntry[];
  };
}

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "1500000.50" → "Rp1.500.000,5"; bilangan bulat tanpa desimal. */
export const money = (v: string | number): string => `Rp${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(v))}`;

export const dateId = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]!.slice(0, 3)} ${y}`;
};

/** Dialog konfirmasi yang menjalankan satu permintaan; menutup dan memuat ulang bila sukses. */
export function ConfirmRequest({ title, text, button, destructive, url, method, body, onClose, onDone }: { title: string; text: string; button: string; destructive?: boolean; url: string; method: "POST" | "DELETE" | "PUT"; body?: unknown; onClose: () => void; onDone: (res: Record<string, unknown>) => void }) {
  const { busy, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <FormErrorSummary innerRef={summaryRef} errors={{}} general={general} labels={{}} />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="min-h-11"
            disabled={busy}
            onClick={async () => {
              const r = await submit<Record<string, unknown>>(url, method, body, "Gagal memproses. Coba lagi.");
              if (r) onDone(r);
            }}
          >
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
