"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, LogIn, XCircle } from "lucide-react";

type CheckInSuccess = {
  ok: true;
  alreadyCheckedIn: boolean;
  checkInAt: string;
  status: string;
  officialName: string;
  position: string | null;
  villageName: string;
  villageCode: string;
};

type CheckInErrorBody = {
  error?: string;
  code?: string;
  billingUrl?: string;
};

export default function AbsensiCheckInClient() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const token = searchParams.get("token");

  const [phase, setPhase] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [successData, setSuccessData] = useState<CheckInSuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [billingHint, setBillingHint] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const callbackUrl = token
    ? `${pathname}?token=${encodeURIComponent(token)}`
    : pathname || "/absensi/check-in";

  const submit = useCallback(async () => {
    if (!token) return;
    setPhase("submitting");
    setErrorMessage(null);
    setBillingHint(null);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | CheckInSuccess
        | CheckInErrorBody;

      if (!res.ok) {
        const err = (data as CheckInErrorBody).error || "Gagal mencatat absensi";
        if (res.status === 402 && (data as CheckInErrorBody).billingUrl) {
          setBillingHint((data as CheckInErrorBody).billingUrl ?? "/billing");
        }
        setErrorMessage(err);
        setPhase("error");
        return;
      }

      setSuccessData(data as CheckInSuccess);
      setPhase("success");
    } catch {
      setErrorMessage("Jaringan bermasalah. Coba lagi.");
      setPhase("error");
    }
  }, [token]);

  useEffect(() => {
    if (!token || status !== "authenticated") return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    void submit();
  }, [token, status, submit]);

  if (!token) {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">QR tidak valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tidak ada token pada tautan. Scan ulang QR dari halaman Absensi desa.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/absensi">Ke Absensi</Link>
        </Button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Memuat sesi…</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <LogIn className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-lg font-semibold">Login untuk absensi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masuk dengan akun staf desa. Email akun harus sama dengan email di{" "}
          <strong>Data Perangkat Desa</strong>.
        </p>
        <Button asChild className="mt-6 w-full gap-2">
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </Link>
        </Button>
      </div>
    );
  }

  if (phase === "submitting" || phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Mencatat absensi…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Tidak bisa absensi</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        {billingHint ? (
          <Button asChild className="mt-4 w-full" variant="default">
            <Link href={billingHint}>Ke Pembayaran</Link>
          </Button>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              attemptedRef.current = false;
              setPhase("idle");
              void submit();
            }}
          >
            Coba lagi
          </Button>
          <Button asChild variant="ghost">
            <Link href="/absensi">Ke Absensi</Link>
          </Button>
        </div>
      </div>
    );
  }

  const d = successData!;
  const timeStr = new Date(d.checkInAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
      <h1 className="mt-4 text-lg font-semibold text-green-900">
        {d.alreadyCheckedIn ? "Sudah absen hari ini" : "Absensi tercatat"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {d.villageName}{" "}
        <span className="text-xs opacity-80">({d.villageCode})</span>
      </p>
      <div className="mt-6 space-y-1 rounded-lg bg-muted/50 py-4 text-left text-sm">
        <p>
          <span className="text-muted-foreground">Nama:</span>{" "}
          <span className="font-medium">{d.officialName}</span>
        </p>
        {d.position ? (
          <p>
            <span className="text-muted-foreground">Jabatan:</span>{" "}
            <span className="font-medium">{d.position}</span>
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Jam masuk:</span>{" "}
          <span className="font-medium">{timeStr}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Status:</span>{" "}
          <span className="font-medium">
            {d.status === "LATE" ? "Terlambat" : "Hadir"}
          </span>
        </p>
      </div>
      <Button asChild className="mt-6 w-full" variant="outline">
        <Link href="/absensi">Kembali ke Absensi</Link>
      </Button>
    </div>
  );
}
