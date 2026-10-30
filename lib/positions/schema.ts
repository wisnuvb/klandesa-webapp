import { z } from "zod";

export const POSITION_LEVEL_MIN = 1;
export const POSITION_LEVEL_MAX = 5;

const MONEY_MAX = 1_000_000_000_000;

/** "" / null / undefined dari form kosong dianggap "tidak diisi" (null). */
function emptyToNull(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return null;
  return typeof value === "string" ? value.trim() || null : value;
}

function numericString(value: unknown): unknown {
  return typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : value;
}

const money = z
  .preprocess(
    (v) => numericString(emptyToNull(v)),
    z
      .number({ error: "Nominal harus berupa angka" })
      .min(0, "Nominal tidak boleh negatif")
      .max(MONEY_MAX, "Nominal terlalu besar")
      .nullable(),
  )
  .optional();

const createSchema = z.object({
  name: z
    .string({ error: "Nama jabatan wajib diisi" })
    .trim()
    .min(1, "Nama jabatan wajib diisi")
    .max(255, "Nama jabatan maksimal 255 karakter"),
  level: z.preprocess(
    numericString,
    z
      .number({ error: "Level jabatan wajib dipilih" })
      .int("Level jabatan tidak valid")
      .min(POSITION_LEVEL_MIN, "Level jabatan tidak valid")
      .max(POSITION_LEVEL_MAX, "Level jabatan tidak valid"),
  ),
  description: z
    .preprocess(
      emptyToNull,
      z.string().max(2000, "Deskripsi maksimal 2000 karakter").nullable(),
    )
    .optional(),
  salary: money,
  allowance: money,
  isActive: z.boolean({ error: "Status tidak valid" }).optional(),
});

const updateSchema = createSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Tidak ada perubahan yang dikirim",
  });

export type PositionCreateInput = z.infer<typeof createSchema>;
export type PositionUpdateInput = z.infer<typeof updateSchema>;

export type PositionParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function run<T>(
  schema: z.ZodType<T>,
  body: unknown,
): PositionParseResult<T> {
  const parsed = schema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: parsed.error.issues[0]?.message ?? "Data tidak valid",
  };
}

export function parsePositionCreate(body: unknown) {
  return run(createSchema, body);
}

export function parsePositionUpdate(body: unknown) {
  return run(updateSchema, body);
}

/** ID path param: hanya bilangan bulat positif. */
export function parsePositionId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
