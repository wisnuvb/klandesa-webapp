/**
 * Perbaiki markdown dari LLM agar lolos parser CommonMark/GFM.
 */
export function normalizeChatMarkdown(content: string): string {
  let text = content.replace(/\r\n/g, "\n").trim();
  if (!text) return text;

  text = trimEmphasisMarkers(text);
  text = insertSpaceAfterEmphasis(text);

  return text;
}

/** Setelah penutup emphasis, sisipkan spasi jika karakter berikutnya bikin parser gagal. */
const UNSAFE_AFTER_EMPHASIS = /[^\s*.,!?;:)\]\}"'«»—–-]/u;

function insertSpaceAfterEmphasis(text: string): string {
  return text
    .replace(/\*\*[^*\n]+?\*\*/g, (match, offset, full) =>
      needsSpaceAfter(full, offset + match.length) ? `${match} ` : match,
    )
    .replace(/(?<!\*)\*[^*\n]+?\*(?!\*)/g, (match, offset, full) =>
      needsSpaceAfter(full, offset + match.length) ? `${match} ` : match,
    )
    .replace(/__[^_\n]+?__/g, (match, offset, full) =>
      needsSpaceAfter(full, offset + match.length) ? `${match} ` : match,
    );
}

function needsSpaceAfter(text: string, index: number): boolean {
  const next = text[index];
  return Boolean(next && UNSAFE_AFTER_EMPHASIS.test(next));
}

function trimEmphasisMarkers(text: string): string {
  return text
    .replace(/\*\*([^*\n]+?)\*\*/g, (_, inner: string) => {
      const trimmed = inner.trim();
      return trimmed ? `**${trimmed}**` : "";
    })
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, (_, inner: string) => {
      const trimmed = inner.trim();
      return trimmed ? `*${trimmed}*` : "";
    })
    .replace(/__([^_\n]+?)__/g, (_, inner: string) => {
      const trimmed = inner.trim();
      return trimmed ? `__${trimmed}__` : "";
    });
}
