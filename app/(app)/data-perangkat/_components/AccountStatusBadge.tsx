import { CircleCheck, CircleSlash, MailPlus, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AccountState } from "../_lib/types";

const VIEW: Record<AccountState, { label: string; className: string; Icon: typeof CircleCheck; hint: string }> = {
  active: { label: "Akun aktif", className: "text-emerald-800", Icon: CircleCheck, hint: "Sudah bisa masuk ke dashboard." },
  pending: { label: "Menunggu aktivasi", className: "text-amber-800", Icon: MailPlus, hint: "Undangan terkirim, kata sandi belum dibuat." },
  inactive: { label: "Akun nonaktif", className: "text-red-800", Icon: CircleSlash, hint: "Akun ada tetapi tidak bisa masuk." },
  none: { label: "Belum punya akun", className: "text-slate-600", Icon: UserX, hint: "Belum bisa masuk ke dashboard." },
};

/** Lencana status akun login perangkat. Warna selalu disertai ikon dan teks. */
export function AccountStatusBadge({ state = "none", compact = false }: { state?: AccountState; compact?: boolean }) {
  const { label, className, Icon, hint } = VIEW[state];
  return (
    <Badge variant="outline" className={`${className}${compact ? " px-1.5 py-0 text-xs" : ""}`} title={hint}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function accountStatusHint(state: AccountState = "none") {
  return VIEW[state].hint;
}
