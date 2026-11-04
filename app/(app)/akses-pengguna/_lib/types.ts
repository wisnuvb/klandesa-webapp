import type { PermissionOverrides } from "@/lib/permissions/client";

export type AccountView = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleKnown: boolean;
  roleLabel: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  overrides: PermissionOverrides;
  official: { id: number; name: string; status: string; positionName: string | null } | null;
  isSelf: boolean;
  pendingInvite: boolean;
};

export type OfficialOption = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  positionName: string | null;
};

