export function formatCurrency(value: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export const getLevelBadgeVariant = (
  level: number,
): "default" | "secondary" | "outline" => {
  if (level === 1) return "default";
  if (level === 2) return "secondary";
  return "outline";
};

export const getLevelName = (level: number): string => {
  const levelMap: Record<number, string> = {
    1: "Pimpinan",
    2: "Sekretariat",
    3: "Kaur/Kasi",
    4: "Kepala Dusun",
    5: "Staf",
  };
  return levelMap[level] || "Lainnya";
};

