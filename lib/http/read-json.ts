export type ReadJsonResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Baca body JSON dengan batas ukuran. Cek `Content-Length` lebih dulu (murah), lalu
 * panjang teks sebenarnya, supaya payload besar ditolak sebelum di-parse.
 */
export async function readJsonBody(
  req: Request,
  maxBytes: number,
): Promise<ReadJsonResult> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: "Data terlalu besar" };
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: "Body permintaan tidak dapat dibaca" };
  }
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { ok: false, status: 413, error: "Data terlalu besar" };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Format JSON tidak valid" };
  }
}
