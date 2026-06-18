import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeChatMarkdown } from "../lib/ai/normalize-markdown.ts";

function renderMarkdown(content: string) {
  return renderToStaticMarkup(
    Markdown({ children: content, remarkPlugins: [remarkGfm] }),
  );
}

describe("normalizeChatMarkdown", () => {
  it("menambahkan spasi setelah bold yang menempel ke kata berikutnya", () => {
    const input = "**Nama saya Laras.**Saya di sini";
    assert.equal(
      normalizeChatMarkdown(input),
      "**Nama saya Laras.** Saya di sini",
    );
  });

  it("memperbaiki bold yang menempel ke emoji", () => {
    const input = "**Hai John!**👋";
    const normalized = normalizeChatMarkdown(input);
    assert.equal(normalized, "**Hai John!** 👋");
    assert.match(renderMarkdown(normalized), /<strong>Hai John!<\/strong>/);
  });

  it("menghapus spasi di dalam penanda bold", () => {
    const input = "melainkan ** Laras** yang siap";
    const normalized = normalizeChatMarkdown(input);
    assert.equal(normalized, "melainkan **Laras** yang siap");
    assert.match(renderMarkdown(normalized), /<strong>Laras<\/strong>/);
  });

  it("memperbaiki beberapa bold rusak dalam satu paragraf", () => {
    const input =
      "**Hai John!**👋 Halo! Saya ** Laras**, asisten digital desa ini. Bukan John, melainkan ** Laras** yang siap membantu.";
    const normalized = normalizeChatMarkdown(input);
    const html = renderMarkdown(normalized);
    assert.equal((html.match(/<strong>/g) || []).length, 3);
    assert.equal((html.match(/\*\*/g) || []).length, 0);
  });

  it("tidak mengubah markdown yang sudah valid", () => {
    const input = "**Nama saya Laras.** Saya di sini";
    assert.equal(normalizeChatMarkdown(input), input);
    assert.match(renderMarkdown(input), /<strong>Nama saya Laras\.<\/strong>/);
  });
});
