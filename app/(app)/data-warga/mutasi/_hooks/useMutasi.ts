"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeAsyncError, type AsyncPageError } from "@/lib/modules/client-error";
import type { MutationType } from "@/lib/kependudukan/mutation";
import type { MutasiItemView, MutasiStatus } from "@/lib/kependudukan/mutasi-labels";

const BASE = "/api/kependudukan/mutasi";
const PAGE_STEP = 20;

interface ListResponse {
  total: number;
  permissions: { canSubmit: boolean; canDecide: boolean };
  items: MutasiItemView[];
}

type ApiFail = { error?: string; errors?: string[]; code?: string };
export type ActionResult = { ok: true } | { ok: false; errors: string[] };

async function send(url: string, method: string, body: unknown): Promise<ActionResult> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return { ok: true };
    const j = (await res.json().catch(() => null)) as ApiFail | null;
    return { ok: false, errors: j?.errors?.length ? j.errors : [j?.error ?? "Permintaan gagal. Coba lagi."] };
  } catch {
    return { ok: false, errors: ["Tidak bisa terhubung. Periksa koneksi lalu coba lagi."] };
  }
}

export function useMutasi() {
  const [status, setStatus] = useState<MutasiStatus | "ALL">("PENDING");
  const [type, setType] = useState<MutationType | "ALL">("ALL");
  const [limit, setLimit] = useState(PAGE_STEP);
  const [data, setData] = useState<ListResponse | null>(null);
  const [pending, setPending] = useState(0);
  const [off, setOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsyncPageError | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const seq = useRef(0);

  const load = useCallback(async () => {
    const my = ++seq.current;
    setError(null);
    try {
      const q = new URLSearchParams({ limit: String(limit) });
      if (status !== "ALL") q.set("status", status);
      if (type !== "ALL") q.set("type", type);
      const [res, pend] = await Promise.all([fetch(`${BASE}?${q}`, { cache: "no-store" }), fetch(`${BASE}?status=PENDING&limit=1`, { cache: "no-store" })]);
      if (my !== seq.current) return;
      const body = await res.json().catch(() => null);
      if (res.status === 409 && body?.code === "KEPENDUDUKAN_V2_OFF") {
        setOff(true);
        return;
      }
      if (!res.ok) throw new Error(typeof body?.error === "string" ? body.error : "Gagal memuat buku mutasi");
      setData(body as ListResponse);
      const pj = await pend.json().catch(() => null);
      setPending(typeof pj?.total === "number" ? pj.total : 0);
    } catch (e) {
      if (my === seq.current) setError(normalizeAsyncError(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [status, type, limit]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const done = async (r: ActionResult, success: string): Promise<ActionResult> => {
    if (r.ok) {
      toast.success(success);
      setAnnouncement(success);
      await load();
    }
    return r;
  };

  return {
    status,
    type,
    data,
    pending,
    off,
    loading,
    error,
    announcement,
    reload: load,
    selectStatus: (s: MutasiStatus | "ALL") => {
      setStatus(s);
      setLimit(PAGE_STEP);
    },
    selectType: (t: MutationType | "ALL") => {
      setType(t);
      setLimit(PAGE_STEP);
    },
    canLoadMore: Boolean(data && data.items.length < data.total && limit < 100),
    loadMore: () => setLimit((l) => Math.min(100, l + PAGE_STEP)),
    submit: async (body: Record<string, unknown>) => done(await send(BASE, "POST", body), "Pengajuan dicatat. Menunggu keputusan."),
    approve: async (id: string, nik?: string) => done(await send(`${BASE}/keputusan`, "POST", { id, decision: "approve", ...(nik ? { nik } : {}) }), "Mutasi disetujui dan data warga diperbarui."),
    reject: async (id: string, reason: string) => done(await send(`${BASE}/keputusan`, "POST", { id, decision: "reject", reason }), "Pengajuan ditolak."),
    cancel: async (id: string) => done(await send(`${BASE}/${id}`, "PATCH", { action: "cancel" }), "Pengajuan dibatalkan."),
  };
}
