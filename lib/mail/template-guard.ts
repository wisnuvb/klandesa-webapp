import { validateDocument } from "../letters/document/validate";

/**
 * Validasi payload template surat dari klien. Struktur dokumen sendiri masih berformat lama
 * (akan diganti skema v2); di sini hanya batas keamanan yang tidak bergantung bentuknya:
 * ukuran, kedalaman, jumlah node, dan kunci berbahaya.
 */

export const TEMPLATE_LIMITS = {
  requestBytes: 768_000,
  nameLength: 255,
  categoryLength: 100,
  descriptionLength: 2_000,
  contentTemplateBytes: 200_000,
  structureBytes: 512_000,
  maxDepth: 16,
  maxNodes: 30_000,
  maxStringLength: 50_000,
} as const;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type GuardResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Telusuri nilai JSON: tolak kedalaman/jumlah node berlebih, string raksasa, dan kunci berbahaya. */
export function checkJsonShape(value: unknown): string | null {
  let nodes = 0;
  const stack: Array<{ v: unknown; depth: number }> = [{ v: value, depth: 0 }];
  while (stack.length) {
    const { v, depth } = stack.pop()!;
    if (++nodes > TEMPLATE_LIMITS.maxNodes) return "Struktur template terlalu kompleks";
    if (depth > TEMPLATE_LIMITS.maxDepth) return "Struktur template terlalu dalam";
    if (typeof v === "string") {
      if (v.length > TEMPLATE_LIMITS.maxStringLength) return "Ada teks yang terlalu panjang";
    } else if (Array.isArray(v)) {
      for (const item of v) stack.push({ v: item, depth: depth + 1 });
    } else if (v && typeof v === "object") {
      for (const [k, item] of Object.entries(v)) {
        if (FORBIDDEN_KEYS.has(k)) return "Struktur template mengandung kunci yang tidak diizinkan";
        stack.push({ v: item, depth: depth + 1 });
      }
    } else if (typeof v === "number" && !Number.isFinite(v)) {
      return "Struktur template mengandung angka tidak valid";
    }
  }
  return null;
}

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
    const t = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return t.length > max ? null : t;
}

export type TemplateInput = {
  name?: string;
  description?: string;
  category?: string;
  templateStructure?: unknown;
  contentTemplate?: string;
  isActive?: boolean;
};

/**
 * `mode: "create"` mewajibkan name, category, templateStructure.
 * `mode: "update"` hanya memeriksa field yang dikirim.
 */
export function validateTemplateInput(
  body: unknown,
  mode: "create" | "update",
): GuardResult<TemplateInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body harus berupa objek" };
  }
  const b = body as Record<string, unknown>;
  const out: TemplateInput = {};

  if (b.name !== undefined || mode === "create") {
    const name = cleanText(b.name, TEMPLATE_LIMITS.nameLength);
    if (!name) return { ok: false, error: `Nama template wajib diisi (maks ${TEMPLATE_LIMITS.nameLength} karakter)` };
    out.name = name;
  }
  if (b.category !== undefined || mode === "create") {
    const category = cleanText(b.category, TEMPLATE_LIMITS.categoryLength);
    if (!category) return { ok: false, error: `Kategori wajib diisi (maks ${TEMPLATE_LIMITS.categoryLength} karakter)` };
    out.category = category;
  }
  if (b.description !== undefined) {
    const description = cleanText(b.description, TEMPLATE_LIMITS.descriptionLength);
    if (description === null) return { ok: false, error: `Deskripsi maks ${TEMPLATE_LIMITS.descriptionLength} karakter` };
    out.description = description;
  }
  if (b.contentTemplate !== undefined) {
    if (typeof b.contentTemplate !== "string" || Buffer.byteLength(b.contentTemplate, "utf8") > TEMPLATE_LIMITS.contentTemplateBytes) {
      return { ok: false, error: "Isi template terlalu besar" };
    }
    out.contentTemplate = b.contentTemplate;
  }
  if (b.templateStructure !== undefined || mode === "create") {
    const s = b.templateStructure;
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      return { ok: false, error: "templateStructure harus berupa objek" };
    }
    if (Buffer.byteLength(JSON.stringify(s), "utf8") > TEMPLATE_LIMITS.structureBytes) {
      return { ok: false, error: "Struktur template terlalu besar" };
    }
    const shapeError = checkJsonShape(s);
    if (shapeError) return { ok: false, error: shapeError };
    // Dokumen v2 divalidasi penuh (skema + rujukan). Format lama hanya dibatasi bentuk/ukurannya
    // sampai builder lama diganti.
    if ((s as { schemaVersion?: unknown }).schemaVersion === 2) {
      const doc = validateDocument(s);
      if (!doc.ok) {
        const first = doc.issues[0];
        return { ok: false, error: `Dokumen surat tidak valid: ${first.path ? `${first.path}: ` : ""}${first.message}` };
      }
    }
    out.templateStructure = s;
  }
  if (b.isActive !== undefined) {
    if (typeof b.isActive !== "boolean") return { ok: false, error: "isActive harus boolean" };
    out.isActive = b.isActive;
  }
  return { ok: true, value: out };
}
