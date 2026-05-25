export type DasawismaInput = {
  rt: string;
  rw: string;
  leaderName: string;
  memberCount?: number;
};

export type PosyanduSessionInput = {
  sessionDate: string;
  location: string;
  dasawismaId?: number | null;
};

export type PosyanduVisitInput = {
  sessionId: number;
  residentId: number;
  weightKg?: number | null;
  heightCm?: number | null;
  notes?: string | null;
  isStunting?: boolean;
};

function trimStr(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

export function parseDasawismaInput(body: unknown): DasawismaInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const rt = trimStr(b.rt, 10);
  const rw = trimStr(b.rw, 10);
  const leaderName = trimStr(b.leaderName, 255);
  if (!rt || !rw || !leaderName) return null;

  const rawCount = b.memberCount;
  let memberCount = 0;
  if (rawCount !== undefined && rawCount !== null) {
    const n = Number(rawCount);
    memberCount = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
  }

  return { rt, rw, leaderName, memberCount };
}

export function parsePosyanduSessionInput(
  body: unknown,
): PosyanduSessionInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const sessionDate = trimStr(b.sessionDate, 10);
  const location = trimStr(b.location, 255);
  if (!sessionDate || !location) return null;

  const parsed = new Date(sessionDate);
  if (Number.isNaN(parsed.getTime())) return null;

  let dasawismaId: number | null = null;
  if (b.dasawismaId !== undefined && b.dasawismaId !== null && b.dasawismaId !== "") {
    const id = Number(b.dasawismaId);
    if (!Number.isFinite(id) || id <= 0) return null;
    dasawismaId = Math.trunc(id);
  }

  return { sessionDate, location, dasawismaId };
}

export function parsePosyanduVisitInput(body: unknown): PosyanduVisitInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const sessionId = Number(b.sessionId);
  const residentId = Number(b.residentId);
  if (!Number.isFinite(sessionId) || sessionId <= 0) return null;
  if (!Number.isFinite(residentId) || residentId <= 0) return null;

  let weightKg: number | null = null;
  if (b.weightKg !== undefined && b.weightKg !== null && b.weightKg !== "") {
    const w = Number(b.weightKg);
    if (!Number.isFinite(w) || w < 0) return null;
    weightKg = w;
  }

  let heightCm: number | null = null;
  if (b.heightCm !== undefined && b.heightCm !== null && b.heightCm !== "") {
    const h = Number(b.heightCm);
    if (!Number.isFinite(h) || h < 0) return null;
    heightCm = h;
  }

  const notes =
    b.notes === undefined || b.notes === null
      ? null
      : trimStr(b.notes, 2000) || null;

  const isStunting = b.isStunting === true;

  return {
    sessionId: Math.trunc(sessionId),
    residentId: Math.trunc(residentId),
    weightKg,
    heightCm,
    notes,
    isStunting,
  };
}
