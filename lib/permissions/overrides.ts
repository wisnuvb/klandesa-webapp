import { PERMISSION_ACTIONS, type PermissionAction } from "./actions";
import { PERMISSION_RESOURCES, type PermissionResource } from "./resources";

/**
 * Penyesuaian izin per akun di atas bawaan role (role = templat).
 *   efektif = (bawaan role ∪ grant) − deny
 * Dua akun ber-role sama bisa berbeda kewenangan. Disimpan di `User.permissionOverrides` (JSON).
 * Role `admin` selalu penuh: penyesuaian diabaikan agar tak ada admin yang terkunci dari sistemnya sendiri.
 */
export type PermissionOverrides = {
  grant?: Partial<Record<PermissionResource, PermissionAction[]>>;
  deny?: Partial<Record<PermissionResource, PermissionAction[]>>;
};

/** Resource yang tidak boleh didelegasikan (hanya admin lewat bawaan role). */
export const NON_DELEGABLE_RESOURCES: readonly PermissionResource[] = ["rbac"];

const RESOURCE_SET = new Set<string>(PERMISSION_RESOURCES);
const ACTION_SET = new Set<string>(PERMISSION_ACTIONS);

function sanitizeSide(
  raw: unknown,
): Partial<Record<PermissionResource, PermissionAction[]>> {
  const out: Partial<Record<PermissionResource, PermissionAction[]>> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!RESOURCE_SET.has(key)) continue;
    const resource = key as PermissionResource;
    if (NON_DELEGABLE_RESOURCES.includes(resource)) continue;
    if (!Array.isArray(value)) continue;
    const actions = [
      ...new Set(
        value.filter(
          (a): a is PermissionAction => typeof a === "string" && ACTION_SET.has(a),
        ),
      ),
    ];
    if (actions.length > 0) out[resource] = actions;
  }
  return out;
}

/** Terima JSON apa pun dari DB/klien; buang resource/aksi tak dikenal. Aman dipanggil dengan null. */
export function parsePermissionOverrides(raw: unknown): PermissionOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const grant = sanitizeSide(source.grant);
  const deny = sanitizeSide(source.deny);
  // Bila aksi yang sama ada di dua sisi, deny menang (lebih aman).
  for (const [res, denied] of Object.entries(deny)) {
    const resource = res as PermissionResource;
    const g = grant[resource];
    if (!g) continue;
    const left = g.filter((a) => !denied!.includes(a));
    if (left.length > 0) grant[resource] = left;
    else delete grant[resource];
  }
  const result: PermissionOverrides = {};
  if (Object.keys(grant).length > 0) result.grant = grant;
  if (Object.keys(deny).length > 0) result.deny = deny;
  return result;
}

export function hasPermissionOverrides(o: PermissionOverrides): boolean {
  return Boolean(o.grant || o.deny);
}

/**
 * Terapkan penyesuaian ke aksi bawaan satu resource.
 * Tanpa `read`, aksi lain tidak berarti (halaman tak terlihat), jadi hasilnya kosong
 * bila sebuah resource disentuh penyesuaian dan akhirnya tidak punya `read`.
 */
export function applyOverridesToActions(
  resource: PermissionResource,
  base: readonly PermissionAction[],
  overrides: PermissionOverrides,
): PermissionAction[] {
  if (NON_DELEGABLE_RESOURCES.includes(resource)) return [...base];
  const grant = overrides.grant?.[resource];
  const deny = overrides.deny?.[resource];
  if (!grant && !deny) return [...base];
  const set = new Set<PermissionAction>(base);
  for (const a of grant ?? []) set.add(a);
  for (const a of deny ?? []) set.delete(a);
  if (!set.has("read")) return [];
  return PERMISSION_ACTIONS.filter((a) => set.has(a));
}

export type DesiredPermissions = Partial<
  Record<PermissionResource, readonly PermissionAction[]>
>;

/**
 * Hitung penyesuaian minimal agar izin efektif = `desired`, relatif terhadap bawaan role.
 * Resource yang tidak ada di `desired` dianggap tidak diubah.
 */
export function diffToOverrides(
  baselineOf: (resource: PermissionResource) => readonly PermissionAction[],
  desired: DesiredPermissions,
): PermissionOverrides {
  const grant: PermissionOverrides["grant"] = {};
  const deny: PermissionOverrides["deny"] = {};
  for (const resource of PERMISSION_RESOURCES) {
    if (NON_DELEGABLE_RESOURCES.includes(resource)) continue;
    const want = desired[resource];
    if (!want) continue;
    const wantSet = new Set<PermissionAction>(want.filter((a) => ACTION_SET.has(a)));
    // Tanpa baca = tanpa akses sama sekali.
    if (!wantSet.has("read")) wantSet.clear();
    const base = new Set<PermissionAction>(baselineOf(resource));
    const add = PERMISSION_ACTIONS.filter((a) => wantSet.has(a) && !base.has(a));
    const remove = PERMISSION_ACTIONS.filter((a) => base.has(a) && !wantSet.has(a));
    if (add.length > 0) grant[resource] = add;
    if (remove.length > 0) deny[resource] = remove;
  }
  return parsePermissionOverrides({ grant, deny });
}
