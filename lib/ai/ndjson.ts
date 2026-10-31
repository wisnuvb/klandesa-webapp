/**
 * Pengiriman status per langkah (NDJSON) dari rute chat Laras. Satu objek JSON per baris:
 *   {"type":"progress","label":"Memeriksa data keuangan…"}   (nol atau lebih)
 *   {"type":"done", ...isi respons JSON biasa}              atau   {"type":"error","error":"…","status":502}
 * Kesalahan sebelum aliran dimulai (401/402/429/dst.) tetap berupa JSON biasa.
 */
export type StreamEvent =
  | { type: "progress"; label: string }
  | ({ type: "done" } & Record<string, unknown>)
  | { type: "error"; error: string; status: number };

export const NDJSON_CONTENT_TYPE = "application/x-ndjson";

export function ndjsonResponse(run: (emit: (e: StreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          closed = true; // klien sudah pergi; pekerjaan tetap diselesaikan dan disimpan
        }
      };
      try {
        await run(emit);
      } catch (e) {
        console.error("laras stream failed", e);
        emit({ type: "error", error: "Server error", status: 500 });
      }
      closed = true;
      try {
        controller.close();
      } catch {
        /* sudah tertutup */
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": `${NDJSON_CONTENT_TYPE}; charset=utf-8`,
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Baca aliran NDJSON dari fetch: tahan terhadap pemotongan di tengah baris; baris rusak diabaikan. */
export async function readNdjson(body: ReadableStream<Uint8Array>, onEvent: (e: StreamEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const dispatch = (line: string) => {
    const t = line.trim();
    if (!t) return;
    let parsed: StreamEvent | null = null;
    try {
      parsed = JSON.parse(t) as StreamEvent;
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object" && "type" in parsed) onEvent(parsed);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      dispatch(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
      nl = buf.indexOf("\n");
    }
  }
  buf += decoder.decode();
  dispatch(buf);
}
