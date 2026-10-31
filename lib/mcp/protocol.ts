/**
 * Inti protokol MCP (Model Context Protocol) di atas JSON-RPC 2.0, transport "Streamable HTTP" tanpa sesi:
 * satu POST = satu jawaban JSON. Tanpa SSE dan tanpa permintaan dari server ke klien, jadi aman dijalankan tanpa status.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];
export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_BATCH = 20;

export type JsonRpcId = string | number | null;
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

export const RPC = { parseError: -32700, invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602, internal: -32603 } as const;

export const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: "2.0" as const, id, result });
export const rpcError = (id: JsonRpcId, code: number, message: string) => ({ jsonrpc: "2.0" as const, id, error: { code, message } });

export function negotiateVersion(requested: unknown): string {
  return typeof requested === "string" && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
}

export const isRequest = (m: unknown): m is JsonRpcRequest =>
  m != null && typeof m === "object" && (m as JsonRpcRequest).jsonrpc === "2.0" && typeof (m as JsonRpcRequest).method === "string";

/** Notifikasi = permintaan tanpa `id`; tidak boleh dijawab. */
export const isNotification = (m: JsonRpcRequest) => !("id" in m) || m.id === undefined;

export const isRecord = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);
