"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PaymentDialog } from "./PaymentDialog";
import { usePaymentFlow } from "./usePaymentFlow";
import type { PaymentRequest } from "./types";

type PaymentApi = {
  /** Buka dialog pembayaran LinkQu untuk satu produk. */
  pay: (request: PaymentRequest) => void;
  close: () => void;
};

const PaymentContext = createContext<PaymentApi | null>(null);

/** Dipasang sekali di layout aplikasi; menyediakan satu dialog pembayaran untuk semua halaman. */
export function PaymentProvider({ children }: { children: ReactNode }) {
  const flow = usePaymentFlow();
  const router = useRouter();
  const { pay, close: closeFlow, invoice } = flow;

  // Menutup dialog saat tagihan belum dibayar: ingatkan bahwa instruksinya masih bisa dibuka lagi.
  const hasPendingInvoice = invoice?.status?.toLowerCase() === "pending";
  const pendingInvoiceRef = useRef(false);
  useEffect(() => {
    pendingInvoiceRef.current = hasPendingInvoice;
  }, [hasPendingInvoice]);
  const close = useCallback(() => {
    const hadPending = pendingInvoiceRef.current;
    closeFlow();
    if (hadPending) {
      toast.info("Tagihan belum dibayar", {
        description: "Nomor VA / kode QR tersimpan di Riwayat Pembayaran.",
        action: { label: "Buka riwayat", onClick: () => router.push("/billing/riwayat") },
      });
    }
  }, [closeFlow, router]);

  const api = useMemo(() => ({ pay, close }), [pay, close]);

  return (
    <PaymentContext.Provider value={api}>
      {children}
      <PaymentDialog flow={{ ...flow, close, dismiss: closeFlow }} />
    </PaymentContext.Provider>
  );
}

export function usePayment(): PaymentApi {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment harus dipakai di dalam <PaymentProvider>");
  return ctx;
}

export type { PaymentRequest, PaymentMethod } from "./types";
