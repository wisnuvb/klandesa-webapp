export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export const getPositionBadgeVariant = (
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

