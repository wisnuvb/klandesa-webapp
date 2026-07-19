import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  LayoutDashboard,
  Mail,
  Map,
  PiggyBank,
  Target,
  Users,
} from "lucide-react";

export type RegionalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export const REGIONAL_NAV: RegionalNavItem[] = [
  {
    href: "/wilayah",
    label: "Ringkasan",
    icon: LayoutDashboard,
    description: "KPI dan alert wilayah",
  },
  {
    href: "/wilayah/demografi",
    label: "Demografi",
    icon: Users,
    description: "Penduduk dan kesejahteraan",
  },
  {
    href: "/wilayah/sdgs",
    label: "SDGs Desa",
    icon: Target,
    description: "Capaian 18 goal",
  },
  {
    href: "/wilayah/adopsi",
    label: "Adopsi digital",
    icon: BarChart3,
    description: "Modul dan sinkronisasi",
  },
  {
    href: "/wilayah/keuangan",
    label: "Keuangan",
    icon: PiggyBank,
    description: "APBDes agregat",
  },
  {
    href: "/wilayah/layanan",
    label: "Layanan",
    icon: Mail,
    description: "Surat, pengaduan, bansos",
  },
  {
    href: "/wilayah/peta",
    label: "Peta",
    icon: Map,
    description: "Infrastruktur & risiko",
  },
];

export function scopeTitle(scope: {
  level: string;
  province?: string;
  regency: string;
  district?: string;
}): string {
  if (scope.level === "PROVINCE") {
    return `Provinsi — ${scope.province ?? scope.regency}`;
  }
  if (scope.level === "REGENCY") {
    return `Kabupaten / Kota — ${scope.regency}`;
  }
  return `Kecamatan — ${scope.district ?? ""} (${scope.regency})`;
}
