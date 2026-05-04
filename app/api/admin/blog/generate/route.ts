import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { getAiConfig, getAiHeaders, resolveAiModel, OPENROUTER_MODELS } from "@/lib/ai/openrouter";

type GeneratedBlogDraft = {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  content: string;
  unsplashQuery: string;
};

function isGeneratedDraft(value: unknown): value is GeneratedBlogDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.excerpt === "string" &&
    typeof v.seoTitle === "string" &&
    typeof v.seoDescription === "string" &&
    typeof v.content === "string" &&
    typeof v.unsplashQuery === "string" &&
    Array.isArray(v.tags) &&
    v.tags.every((t) => typeof t === "string")
  );
}

function tryParseJsonObject(input: string): unknown | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const config = getAiConfig();
  if (!config) {
    return NextResponse.json(
      { error: "AI belum dikonfigurasi (OPENROUTER_API_KEY)" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; language?: unknown; model?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });

  const language = String(body.language ?? "id").trim() || "id";
  const model = resolveAiModel(
    typeof body.model === "string" ? body.model : null,
    OPENROUTER_MODELS.gpt4oMini,
  );

  const system = [
    "Anda adalah editor blog Klandesa.",
    "Tugas: buat draft artikel blog yang rapi, informatif, dan siap diedit admin.",
    "Output HARUS JSON valid, tanpa markdown fence, tanpa komentar, tanpa teks tambahan.",
    "Konten harus original, tidak mengklaim angka spesifik tanpa sumber.",
  ].join("\n");

  const user = [
    `Buat draft artikel berdasarkan judul: "${title}".`,
    `Bahasa: ${language === "id" ? "Indonesia" : "English"}.`,
    "Format output JSON:",
    "{",
    '  "title": string,',
    '  "excerpt": string (maks 220 karakter),',
    '  "seoTitle": string (maks 60 karakter),',
    '  "seoDescription": string (maks 160 karakter),',
    '  "tags": string[] (3-7 tag),',
    '  "unsplashQuery": string (2-6 kata kunci untuk cari cover di Unsplash, bahasa Inggris),',
    '  "content": string (artikel lengkap, gunakan heading sederhana dengan format: "## " dan "### "),',
    "}",
    "Pastikan isi punya struktur: pembuka, konteks, poin-poin, contoh, penutup/CTA.",
  ].join("\n");

  const payload = {
    model,
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  const url = `${config.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAiHeaders(config),
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        error?: unknown;
      }
    | null;

  if (!res.ok) {
    return NextResponse.json(
      { error: "Gagal generate draft", _debug: data?.error ?? null },
      { status: 502 },
    );
  }

  const content = data?.choices?.[0]?.message?.content ?? "";
  const parsed = tryParseJsonObject(content);
  if (!isGeneratedDraft(parsed)) {
    return NextResponse.json(
      { error: "AI output tidak valid", raw: content.slice(0, 5000) },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, draft: parsed }, { status: 200 });
}

