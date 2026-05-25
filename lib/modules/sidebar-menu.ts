import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Archive,
  BarChart3,
  Clock,
  FileText,
  HeartHandshake,
  Home,
  Image,
  Landmark,
  Megaphone,
  MessageCircle,
  Monitor,
  Settings2,
  ShoppingBag,
  Sprout,
  Users,
  Wallet,
  Store,
  Heart,
  Target,
} from "lucide-react";
import { getAllowedActions } from "@/lib/permissions/matrix";
import { normalizeVillageRole, type VillageRole } from "@/lib/permissions/roles";
import type { PermissionResource } from "@/lib/permissions/resources";
import { getNavModules, type ModuleDefinition } from "./registry";

export type SidebarMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  children?: SidebarMenuItem[];
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: Home,
  "data-warga": Users,
  "data-kk": Users,
  "data-perangkat": Users,
  "data-jabatan": Users,
  potensi: Sprout,
  anggaran: Wallet,
  koperasi: Landmark,
  bumdes: Store,
  statistik: BarChart3,
  "permohonan-warga": FileText,
  "layanan-mandiri": Monitor,
  "layanan-surat": FileText,
  "pengaturan-desa": Settings2,
  keuangan: Wallet,
  billing: Wallet,
  "pengumuman-desa": Megaphone,
  "forum-diskusi": MessageCircle,
  "pengaduan-masyarakat": AlertCircle,
  "bantuan-program-keluarga": HeartHandshake,
  "galeri-desa": Image,
  absensi: Clock,
  pkk: Heart,
  sdgs: Target,
  arsip: Archive,
  ukm: ShoppingBag,
  website: Monitor,
};

function canReadModule(role: VillageRole, permission: PermissionResource): boolean {
  return getAllowedActions(permission, role).includes("read");
}

function resolveIcon(moduleId: string, group?: string): LucideIcon {
  return MODULE_ICONS[moduleId] ?? (group === "data" ? Users : FileText);
}

function buildGroupedItems(
  modules: ModuleDefinition[],
  role: VillageRole,
): SidebarMenuItem[] {
  const visible = modules
    .filter((m) => canReadModule(role, m.permission))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const topLevel: SidebarMenuItem[] = [];
  const groups = new Map<string, SidebarMenuItem>();

  for (const mod of visible) {
    const item: SidebarMenuItem = {
      id: mod.id,
      label: mod.label,
      icon: resolveIcon(mod.id, mod.group),
      path: mod.path,
    };

    if (!mod.group) {
      topLevel.push(item);
      continue;
    }

    let group = groups.get(mod.group);
    if (!group) {
      group = {
        id: mod.group,
        label: mod.groupLabel ?? mod.group,
        icon: resolveIcon(mod.id, mod.group),
        children: [],
      };
      groups.set(mod.group, group);
      topLevel.push(group);
    }
    group.children!.push(item);
  }

  return topLevel.sort((a, b) => {
    const orderA = visible.find((m) => m.id === a.id || m.group === a.id)?.sortOrder ?? 999;
    const orderB = visible.find((m) => m.id === b.id || m.group === b.id)?.sortOrder ?? 999;
    return orderA - orderB;
  });
}

type BuildVillageSidebarOptions = {
  role?: string | null;
  includeKoperasi?: boolean;
};

export function buildVillageSidebarMenu(
  options: BuildVillageSidebarOptions = {},
): SidebarMenuItem[] {
  const role = normalizeVillageRole(options.role);
  let modules = getNavModules();

  if (!options.includeKoperasi) {
    modules = modules.filter((m) => m.id !== "koperasi");
  }

  return buildGroupedItems(modules, role);
}

export function filterSidebarByPermission(
  items: SidebarMenuItem[],
  role: VillageRole,
  permissionById: Record<string, PermissionResource>,
): SidebarMenuItem[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = item.children.filter((child) => {
          const perm = permissionById[child.id];
          return perm ? canReadModule(role, perm) : true;
        });
        if (children.length === 0) return null;
        return { ...item, children };
      }
      const perm = permissionById[item.id];
      if (perm && !canReadModule(role, perm)) return null;
      return item;
    })
    .filter((item): item is SidebarMenuItem => item != null);
}

/** Map id menu → permission resource untuk filter tambahan. */
export function getMenuPermissionMap(): Record<string, PermissionResource> {
  const map: Record<string, PermissionResource> = {};
  for (const mod of getNavModules()) {
    map[mod.id] = mod.permission;
  }
  return map;
}
