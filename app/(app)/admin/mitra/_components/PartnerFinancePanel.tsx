"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatIdr } from "@/lib/billing/catalog";

type RuleRow = {
  closingBonusAmount: string | number;
  subscriptionSharePercent: string | number;
  isActive: boolean;
};

type CommRow = {
  id: string;
  villageId: number | null;
  type: string;
  amount: string | number;
  status: string;
  description: string | null;
  village: { code: string; name: string } | null;
};

function BadgeCount({ n }: { n: number }) {
  return (
    <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
      {n} item
    </span>
  );
}

export function PartnerFinancePanel({ partnerId }: { partnerId: number }) {
  const [rule, setRule] = useState<RuleRow | null>(null);
  const [closing, setClosing] = useState("");
  const [pct, setPct] = useState("");
  const [isActiveRule, setIsActiveRule] = useState(true);
  const [accrued, setAccrued] = useState<CommRow[]>([]);
  const [approved, setApproved] = useState<CommRow[]>([]);
  const [selectedApproved, setSelectedApproved] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const base = `/api/admin/partners/${partnerId}`;

  const reload = useCallback(async () => {
    setErr(null);
    const [ruleRes, aRes, pRes] = await Promise.all([
      fetch(`${base}/commission-rule`, { cache: "no-store" }),
      fetch(`${base}/commissions?status=accrued&limit=100`, { cache: "no-store" }),
      fetch(`${base}/commissions?status=approved&limit=100`, { cache: "no-store" }),
    ]);
    if (ruleRes.ok) {
      const d = (await ruleRes.json()) as { rule?: RuleRow };
      if (d.rule) {
        setRule(d.rule);
        setClosing(String(d.rule.closingBonusAmount ?? ""));
        setPct(String(d.rule.subscriptionSharePercent ?? ""));
        setIsActiveRule(d.rule.isActive);
      }
    }
    if (aRes.ok) {
      const d = (await aRes.json()) as { commissions?: CommRow[] };
      setAccrued(d.commissions ?? []);
    }
    if (pRes.ok) {
      const d = (await pRes.json()) as { commissions?: CommRow[] };
      const list = d.commissions ?? [];
      setApproved(list);
      setSelectedApproved({});
    }
  }, [base]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveRule = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`${base}/commission-rule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingBonusAmount: Number(closing),
          subscriptionSharePercent: Number(pct),
          isActive: isActiveRule,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d?.error ?? "Gagal simpan");
      setMsg("Skema bagi hasil disimpan.");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  const approveAllAccrued = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`${base}/commissions/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveAll: true }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; approved?: number };
      if (!res.ok) throw new Error(d.error ?? "Gagal approve");
      setMsg(`Disetujui ${d.approved ?? 0} entri.`);
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  const createDisbursement = async () => {
    const ids = Object.entries(selectedApproved)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) {
      setErr("Pilih minimal satu entri approved.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`${base}/disbursements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionEntryIds: ids,
          status: "pending",
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d?.error ?? "Gagal buat disbursement");
      setMsg(
        "Disbursement dibuat (pending). Tandai pembayaran selesai lewat PATCH /api/admin/disbursements/[id] jika payout sudah dikirim.",
      );
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  const toggleApproved = (id: string, next: boolean) => {
    setSelectedApproved((prev) => ({ ...prev, [id]: next }));
  };

  const sumSelectedApproved = approved
    .filter((c) => selectedApproved[c.id])
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <Card className="mt-4 border-blue-950/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bagi hasil & disbursement</CardTitle>
        <CardDescription>
          Sesuaikan skema hybrid, approve accrued, dan buat batch payout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {err ? (
          <div className="text-sm text-red-600" role="alert">
            {err}
          </div>
        ) : null}
        {msg ? (
          <div className="text-sm text-green-700" role="status">
            {msg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label htmlFor={`closing-${partnerId}`}>Closing bonus (IDR)</Label>
            <Input
              id={`closing-${partnerId}`}
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              type="number"
              min={0}
            />
          </div>
          <div>
            <Label htmlFor={`pct-${partnerId}`}>% dari invoice lunas</Label>
            <Input
              id={`pct-${partnerId}`}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              type="number"
              min={0}
              max={100}
              step={0.01}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id={`active-${partnerId}`}
              checked={isActiveRule}
              onCheckedChange={(v) => setIsActiveRule(v)}
            />
            <Label htmlFor={`active-${partnerId}`}>Skema aktif</Label>
          </div>
          <Button type="button" disabled={busy} onClick={() => void saveRule()}>
            Simpan skema
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">Accrued (belum di-approve)</div>
            <BadgeCount n={accrued.length} />
          </div>
          {accrued.length === 0 ? (
            <div className="text-xs text-muted-foreground">Tidak ada.</div>
          ) : (
            <ul className="text-xs space-y-1 max-h-[120px] overflow-y-auto font-mono">
              {accrued.slice(0, 40).map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between gap-2 border-b border-dashed pb-0.5"
                >
                  <span className="min-w-0 truncate">
                    [{c.type}] {c.description ?? c.village?.name ?? c.id.slice(0, 12)}
                  </span>
                  <span className="shrink-0">{formatIdr(Number(c.amount ?? 0))}</span>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy || accrued.length === 0}
            type="button"
            onClick={() => void approveAllAccrued()}
          >
            Approve semua accrued
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">
              Approved (siap disbursement){" "}
              <span className="text-muted-foreground font-normal">
                — terpilih: {formatIdr(sumSelectedApproved)}
              </span>
            </div>
            <BadgeCount n={approved.length} />
          </div>
          {approved.length === 0 ? (
            <div className="text-xs text-muted-foreground">Tidak ada.</div>
          ) : (
            <div className="overflow-x-auto border rounded-md max-h-[220px] overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/70 sticky top-0">
                  <tr className="text-left border-b">
                    <th className="p-2 w-10"> </th>
                    <th className="p-2">Entri</th>
                    <th className="p-2 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-2 align-top">
                        <Checkbox
                          checked={!!selectedApproved[c.id]}
                          onCheckedChange={(v) => toggleApproved(c.id, v === true)}
                        />
                      </td>
                      <td className="p-2 max-w-[220px]">
                        <div className="wrap-break-word">
                          [{c.type}]{" "}
                          {c.description ??
                            `${c.village?.name ?? "—"} · ${c.village?.code ?? ""}`}
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono whitespace-nowrap">
                        {formatIdr(Number(c.amount ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              variant="outline"
              size="sm"
              onClick={() => void reload()}
            >
              Muat ulang
            </Button>
            <Button
              type="button"
              disabled={busy || !Object.values(selectedApproved).some(Boolean)}
              onClick={() => void createDisbursement()}
            >
              Buat disbursement (pending)
            </Button>
          </div>
        </div>

        {!rule ? (
          <div className="text-xs text-muted-foreground">
            Rule default akan dibuat saat membuka halaman bagi hasil.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
