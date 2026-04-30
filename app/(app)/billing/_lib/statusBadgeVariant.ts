export function statusBadgeVariant(status: string) {
  const v = status.toLowerCase();
  if (v === "paid") return "default";
  if (v === "pending") return "secondary";
  if (v === "expired" || v === "failed" || v === "cancelled") {
    return "destructive";
  }
  return "outline";
}

