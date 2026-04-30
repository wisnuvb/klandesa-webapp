import type { OfficialRow } from "./types";

function supervisorIdNum(o: OfficialRow): number | null {
  const s = o.supervisorId;
  if (s === null || s === undefined) return null;
  const n = typeof s === "number" ? s : Number(s);
  return Number.isFinite(n) ? n : null;
}

export function buildOfficialTree(officials: OfficialRow[]) {
  const byId = new Map(officials.map((o) => [o.id, o]));
  const childrenByParentId = new Map<number, OfficialRow[]>();
  const roots: OfficialRow[] = [];

  for (const o of officials) {
    const sid = supervisorIdNum(o);
    if (sid !== null && sid !== o.id && byId.has(sid)) {
      if (!childrenByParentId.has(sid)) childrenByParentId.set(sid, []);
      childrenByParentId.get(sid)!.push(o);
    } else {
      roots.push(o);
    }
  }

  for (const list of childrenByParentId.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }
  roots.sort((a, b) => a.name.localeCompare(b.name, "id"));

  return { roots, childrenByParentId };
}

export type OfficialTree = ReturnType<typeof buildOfficialTree>;
