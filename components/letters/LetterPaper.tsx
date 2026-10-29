/**
 * Kertas surat v2. Komponen MURNI (tanpa hooks/akses browser) supaya sama persis dipakai
 * di pratinjau klien dan render HTML server (`renderToStaticMarkup`). Semua teks lewat React
 * (escape otomatis) — tidak ada penyisipan HTML mentah; semua gaya berasal dari enum/angka
 * tervalidasi, tidak pernah dari string bebas.
 */
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { isSafeSrc } from "@/lib/letters/document/schema";
import type { Block, CustomField, Inline, LeafBlock, LetterDocument } from "@/lib/letters/document/schema";
import { applyFormat } from "@/lib/letters/format";
import { FONTS, LINE_HEIGHTS, PAPER_SIZES } from "@/lib/letters/paper";
import {
  DESA_FIELDS,
  OFFICIAL_FIELDS,
  OFFICIAL_LABELS,
  PERSON_FIELDS,
  SURAT_FIELDS,
  parseRef,
  personFieldLabel,
  type OfficialId,
} from "@/lib/letters/registry";
import {
  displayValue,
  evaluateCondition,
  resolveRef,
  type LetterValues,
} from "@/lib/letters/values";

export type LetterPaperMode = "preview" | "print";

export type LetterPaperProps = {
  doc: LetterDocument;
  values: LetterValues;
  mode?: LetterPaperMode;
  /** Gambar QR verifikasi (data URL png/svg atau path aman) yang dibuat pemanggil. */
  qrSrc?: string;
  /** Dipanggil saat isian di kertas diklik/Enter (hanya mode preview). */
  onFieldClick?: (ref: string) => void;
  className?: string;
};

type Ctx = {
  doc: LetterDocument;
  values: LetterValues;
  mode: LetterPaperMode;
  qrSrc?: string;
  onFieldClick?: (ref: string) => void;
};

// ------------------------------------------------------------------ ukuran kertas

const num = (n: unknown, fallback = 0): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.round(v * 100) / 100;
};

function paperMm(doc: LetterDocument): { w: number; h: number } {
  const p = PAPER_SIZES[doc.page.size] ?? PAPER_SIZES.F4;
  return doc.page.orientation === "landscape"
    ? { w: p.heightMm, h: p.widthMm }
    : { w: p.widthMm, h: p.heightMm };
}

/** CSS cetak: ukuran & margin halaman, serta aturan agar blok penting tidak terpotong. */
export function letterPrintCss(doc: LetterDocument): string {
  const { w, h } = paperMm(doc);
  const m = doc.page.margin;
  const margin = `${num(m.top, 20)}mm ${num(m.right, 20)}mm ${num(m.bottom, 20)}mm ${num(m.left, 25)}mm`;
  return [
    `@page{size:${num(w)}mm ${num(h)}mm;margin:${margin}}`,
    "@media print{",
    "html,body{background:#fff!important;margin:0!important;padding:0!important}",
    ".lp-paper{width:auto!important;min-height:0!important;padding:0!important;margin:0!important;box-shadow:none!important}",
    ".lp-no-print{display:none!important}",
    ".lp-deco{border-color:transparent!important;color:transparent!important;background:none!important}",
    ".lp-ph{background:none!important;color:inherit!important;outline:none!important}",
    ".lp-avoid-break,.lp-avoid-break tr,.lp-paper tr{break-inside:avoid;page-break-inside:avoid}",
    "}",
  ].join("");
}

// ------------------------------------------------------------------ label & teks isian

function fieldLabel(ref: string, ctx: Ctx): string {
  const p = parseRef(ref);
  if (!p) return ref;
  if (p.kind === "person") {
    const base = personFieldLabel(p.field);
    const multi = ctx.doc.people.length > 1;
    const role = ctx.doc.people.find((r) => r.id === p.role)?.label;
    return multi && role ? `${role} · ${base}` : base;
  }
  if (p.kind === "desa") return DESA_FIELDS.find((f) => f.key === p.field)?.label ?? p.field;
  if (p.kind === "surat") return SURAT_FIELDS.find((f) => f.key === p.field)?.label ?? p.field;
  if (p.kind === "pejabat") {
    const base = OFFICIAL_FIELDS.find((f) => f.key === p.field)?.label ?? p.field;
    return `${OFFICIAL_LABELS[p.official]} · ${base}`;
  }
  return ctx.doc.fields.find((f) => f.id === p.id)?.label ?? p.id;
}

const PLACEHOLDER_STYLE: CSSProperties = {
  background: "#fff4cc",
  color: "#7a5b00",
  borderRadius: "2px",
  padding: "0 2px",
  outline: "1px dashed #d9b84a",
};

/** Satu isian di kertas: `data-ref` untuk pengait klik, `data-empty` untuk gaya/uji. */
function FieldSpan(ctx: Ctx, key: string, ref: string, text: string, rawEmpty: boolean): ReactNode {
  const preview = ctx.mode === "preview";
  const showPlaceholder = preview && text === "";
  const clickable = preview && !!ctx.onFieldClick;
  const fire = () => ctx.onFieldClick?.(ref);
  return (
    <span
      key={key}
      data-ref={ref}
      data-empty={rawEmpty ? "true" : "false"}
      className={showPlaceholder ? "lp-ph" : undefined}
      style={{
        ...(showPlaceholder ? PLACEHOLDER_STYLE : null),
        ...(clickable ? { cursor: "pointer" } : null),
      }}
      {...(clickable
        ? {
            role: "button",
            tabIndex: 0,
            onClick: fire,
            onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fire();
              }
            },
          }
        : null)}
    >
      {showPlaceholder ? `«${fieldLabel(ref, ctx)}»` : text}
    </span>
  );
}

function renderInlines(list: readonly Inline[] | undefined, ctx: Ctx, keyPrefix: string): ReactNode[] {
  return (list ?? []).map((n, i) => {
    const key = `${keyPrefix}-${i}`;
    if (n.type === "br") return <br key={key} />;
    if (n.type === "field") {
      const text = displayValue(n.ref, ctx.values, ctx.doc, n.format, n.fallback);
      return FieldSpan(ctx, key, n.ref, text, resolveRef(n.ref, ctx.values).trim() === "");
    }
    let node: ReactNode = n.text;
    if (n.marks?.includes("u")) node = <u>{node}</u>;
    if (n.marks?.includes("i")) node = <em>{node}</em>;
    if (n.marks?.includes("b")) node = <strong>{node}</strong>;
    return <span key={key}>{node}</span>;
  });
}

/** Teks polos dari Inline (untuk keterangan di tanda tangan, dll.). */
function plain(list: readonly Inline[] | undefined, ctx: Ctx): string {
  let out = "";
  for (const n of list ?? []) {
    if (n.type === "text") out += n.text;
    else if (n.type === "br") out += " ";
    else out += displayValue(n.ref, ctx.values, ctx.doc, n.format, n.fallback);
  }
  return out;
}

// ------------------------------------------------------------------ kop surat

const stripPrefix = (s: string | undefined, word: string) =>
  (s ?? "").trim().replace(new RegExp(`^${word}\\s+`, "i"), "").trim();

function safeLogo(url: string | undefined): string | null {
  return url && isSafeSrc(url) ? url : null;
}

function Kop(ctx: Ctx): ReactNode {
  const { doc, values, mode } = ctx;
  if (doc.letterhead === "none") return null;
  const d = values.desa;
  const kab = stripPrefix(d.kabupaten, "kabupaten");
  const kec = stripPrefix(d.kecamatan, "kecamatan");
  const desa = stripPrefix(d.nama, "desa");

  if (doc.letterhead === "garuda") {
    const lines = [
      desa ? `KEPALA DESA ${desa.toUpperCase()}` : "",
      kec ? `KECAMATAN ${kec.toUpperCase()}` : "",
      kab ? `KABUPATEN ${kab.toUpperCase()}` : "",
    ].filter(Boolean);
    return (
      <div className="lp-kop" style={{ textAlign: "center", marginBottom: "5mm" }}>
        <div
          className="lp-deco"
          aria-hidden="true"
          style={{
            width: "22mm",
            height: "22mm",
            margin: "0 auto 2mm",
            border: mode === "preview" ? "1px dashed #999" : "1px solid transparent",
            borderRadius: "50%",
            color: "#999",
            fontSize: "0.7em",
            lineHeight: "22mm",
          }}
        >
          {mode === "preview" ? "Garuda" : ""}
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontWeight: 700, fontSize: i === 0 ? "1.15em" : "1em" }}>
            {l}
          </div>
        ))}
      </div>
    );
  }

  const logo = safeLogo(values.logoUrl);
  const alamat = [d.alamat, d.telepon ? `Telp. ${d.telepon}` : "", d.email ? `Email: ${d.email}` : "", d.kode_pos ? `Kode Pos ${d.kode_pos}` : ""]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const lines: Array<{ text: string; size: string }> = [
    kab && { text: `PEMERINTAH KABUPATEN ${kab.toUpperCase()}`, size: "1.1em" },
    kec && { text: `KECAMATAN ${kec.toUpperCase()}`, size: "1.1em" },
    desa && { text: `DESA ${desa.toUpperCase()}`, size: "1.3em" },
    alamat && { text: alamat, size: "0.85em" },
  ].filter(Boolean) as Array<{ text: string; size: string }>;
  if (lines.length === 0 && !logo) return null;

  return (
    <div
      className="lp-kop"
      style={{ display: "flex", alignItems: "center", gap: "4mm", paddingBottom: "3mm", marginBottom: "5mm", borderBottom: "3px double #000" }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" style={{ width: "22mm", height: "22mm", objectFit: "contain" }} />
      ) : null}
      <div style={{ flex: 1, textAlign: "center" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontWeight: i === lines.length - 1 && alamat ? 400 : 700, fontSize: l.size }}>
            {l.text}
          </div>
        ))}
      </div>
      {logo ? <div aria-hidden="true" style={{ width: "22mm" }} /> : null}
    </div>
  );
}

// ------------------------------------------------------------------ blok

const ORDINALS = [
  "KESATU", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA", "KEENAM", "KETUJUH", "KEDELAPAN", "KESEMBILAN", "KESEPULUH",
  "KESEBELAS", "KEDUABELAS", "KETIGABELAS", "KEEMPATBELAS", "KELIMABELAS", "KEENAMBELAS", "KETUJUHBELAS",
  "KEDELAPANBELAS", "KESEMBILANBELAS", "KEDUAPULUH",
] as const;

/** Diktum keputusan: KESATU, KEDUA, … (n mulai dari 1); lewat 20 jadi `KE-N`. */
export function diktumOrdinal(n: number): string {
  return ORDINALS[n - 1] ?? `KE-${n}`;
}

const alignOf = (a: string | undefined): CSSProperties["textAlign"] =>
  a === "center" || a === "right" || a === "justify" ? a : "left";

const PREFIX_TEXT = { none: "", an: "a.n.", plt: "Plt.", pj: "Pj.", ub: "u.b." } as const;

function groupFieldType(doc: LetterDocument, groupId: string, fieldId: string): CustomField["type"] | undefined {
  return doc.groups.find((g) => g.id === groupId)?.fields.find((f) => f.id === fieldId)?.type;
}

function cellValue(doc: LetterDocument, groupId: string, fieldId: string, raw: string): string {
  return groupFieldType(doc, groupId, fieldId) === "date" ? applyFormat(raw, "tanggal") : raw;
}

function blockKey(b: Block | LeafBlock) {
  return b.id;
}

function renderBlock(b: Block, ctx: Ctx): ReactNode {
  switch (b.type) {
    case "paragraph":
      return (
        <p
          key={blockKey(b)}
          style={{
            margin: `0 0 ${num(b.spaceAfterMm, 3)}mm`,
            textAlign: alignOf(b.align),
            textIndent: b.indentFirst ? "12mm" : undefined,
          }}
        >
          {b.content.length ? renderInlines(b.content, ctx, b.id) : <br />}
        </p>
      );

    case "heading": {
      const size = b.level === 1 ? "1.3em" : b.level === 2 ? "1.15em" : "1em";
      const Tag = (b.level === 1 ? "h1" : b.level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
      return (
        <Tag
          key={blockKey(b)}
          style={{
            margin: "0 0 3mm",
            fontSize: size,
            fontWeight: 700,
            textAlign: alignOf(b.align),
            textDecoration: b.underline ? "underline" : undefined,
          }}
        >
          {renderInlines(b.content, ctx, b.id)}
        </Tag>
      );
    }

    case "title": {
      const nomor = (ctx.values.surat.nomor ?? "").trim();
      const showNumber = b.showNumber && (nomor !== "" || ctx.mode === "preview");
      return (
        <div key={blockKey(b)} style={{ textAlign: alignOf(b.align), margin: "0 0 4mm" }}>
          <div style={{ fontWeight: 700 }}>{renderInlines(b.title, ctx, `${b.id}-t`)}</div>
          {showNumber ? (
            <div>
              {b.numberPrefix}
              {FieldSpan(ctx, `${b.id}-n`, "surat.nomor", nomor, nomor === "")}
            </div>
          ) : null}
        </div>
      );
    }

    case "memo":
      return (
        <div key={blockKey(b)} style={{ display: "flex", justifyContent: "space-between", gap: "6mm", margin: "0 0 4mm" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ verticalAlign: "top", paddingRight: "2mm" }}>{r.label}</td>
                  <td style={{ verticalAlign: "top", paddingRight: "2mm" }}>:</td>
                  <td style={{ verticalAlign: "top" }}>{renderInlines(r.value, ctx, `${b.id}-r${i}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ minWidth: "45%" }}>
            {b.dateline?.length ? <div>{renderInlines(b.dateline, ctx, `${b.id}-d`)}</div> : null}
            {b.addressee?.length ? <div style={{ marginTop: "2mm" }}>{renderInlines(b.addressee, ctx, `${b.id}-a`)}</div> : null}
          </div>
        </div>
      );

    case "personData":
      return (
        <table key={blockKey(b)} style={{ borderCollapse: "collapse", margin: "0 0 3mm 8mm" }}>
          <tbody>
            {b.fields.map((f) => {
              const ref = `${b.role}.${f}`;
              const label = PERSON_FIELDS.find((x) => x.key === f)?.label ?? f;
              const text = displayValue(ref, ctx.values, ctx.doc);
              return (
                <tr key={f}>
                  <td style={{ width: `${num(b.labelWidthMm, 45)}mm`, verticalAlign: "top" }}>{label}</td>
                  <td style={{ verticalAlign: "top", paddingRight: "2mm" }}>{b.separator}</td>
                  <td style={{ verticalAlign: "top" }}>
                    {FieldSpan(ctx, `${b.id}-${f}`, ref, text, resolveRef(ref, ctx.values).trim() === "")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );

    case "repeatTable": {
      const rows = ctx.values.groups[b.group] ?? [];
      const placeholderRow = rows.length === 0 && ctx.mode === "preview";
      const list: Array<Record<string, string>> = placeholderRow ? [{}] : rows;
      return (
        <table key={blockKey(b)} data-group={b.group} style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 4mm" }}>
          <thead>
            <tr>
              {b.showIndex ? <th style={cellStyle(true, "center", 8)}>No</th> : null}
              {b.columns.map((c, i) => (
                <th key={i} style={cellStyle(true, alignOf(c.align), c.widthPct)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((row, ri) => (
              <tr key={ri} data-row={ri}>
                {b.showIndex ? <td style={cellStyle(false, "center")}>{ri + 1}</td> : null}
                {b.columns.map((c, ci) => {
                  const raw = (row[c.field] ?? "").trim();
                  const ref = `grup.${b.group}.${ri}.${c.field}`;
                  const text = cellValue(ctx.doc, b.group, c.field, raw);
                  const label = ctx.doc.groups.find((g) => g.id === b.group)?.fields.find((f) => f.id === c.field)?.label ?? c.field;
                  return (
                    <td key={ci} style={cellStyle(false, alignOf(c.align))}>
                      {groupCell(ctx, `${b.id}-${ri}-${ci}`, ref, text, label)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case "table":
      return (
        <table key={blockKey(b)} style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 4mm" }}>
          <thead>
            <tr>
              {b.columns.map((c, i) => (
                <th key={i} style={cellStyle(true, "left", c.widthPct, b.bordered)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, ri) => (
              <tr key={ri}>
                {b.columns.map((_, ci) => (
                  <td key={ci} style={cellStyle(false, "left", undefined, b.bordered)}>
                    {renderInlines(r[ci], ctx, `${b.id}-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "list": {
      const Tag = b.style === "bullet" ? "ul" : "ol";
      return (
        <Tag
          key={blockKey(b)}
          type={b.style === "alpha" ? "a" : b.style === "number" ? "1" : undefined}
          style={{ margin: "0 0 3mm", paddingLeft: "10mm" }}
        >
          {b.items.map((it, i) => (
            <li key={i}>{renderInlines(it, ctx, `${b.id}-${i}`)}</li>
          ))}
        </Tag>
      );
    }

    case "dictum":
      return renderDictum(b, ctx);

    case "signature":
      return renderSignature(b, ctx);

    case "divider":
      return (
        <hr
          key={blockKey(b)}
          style={{
            border: 0,
            margin: "3mm 0",
            borderTop: b.style === "double" ? "3px double #000" : b.style === "dashed" ? "1px dashed #000" : "1px solid #000",
          }}
        />
      );

    case "spacer":
      return <div key={blockKey(b)} aria-hidden="true" style={{ height: `${num(b.heightMm, 5)}mm` }} />;

    case "pageBreak":
      return (
        <div key={blockKey(b)} style={{ breakAfter: "page", pageBreakAfter: "always" }}>
          {ctx.mode === "preview" ? (
            <div className="lp-no-print" aria-hidden="true" style={{ borderTop: "1px dashed #bbb", margin: "4mm 0", color: "#999", fontSize: "0.7em", textAlign: "center" }}>
              halaman baru
            </div>
          ) : null}
        </div>
      );

    case "image": {
      if (!isSafeSrc(b.src)) return null;
      return (
        <div key={blockKey(b)} style={{ textAlign: alignOf(b.align), margin: "0 0 3mm" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.src} alt={b.alt} style={{ width: `${num(b.widthMm, 40)}mm`, maxWidth: "100%", height: "auto" }} />
        </div>
      );
    }

    case "qr": {
      const size = `${num(b.sizeMm, 22)}mm`;
      const src = ctx.qrSrc && (isSafeSrc(ctx.qrSrc) || /^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(ctx.qrSrc)) ? ctx.qrSrc : null;
      return (
        <div key={blockKey(b)} style={{ textAlign: alignOf(b.align), margin: "0 0 3mm" }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Kode QR verifikasi surat" style={{ width: size, height: size }} />
          ) : (
            <div
              className="lp-deco"
              aria-hidden="true"
              style={{ display: "inline-block", width: size, height: size, border: ctx.mode === "preview" ? "1px dashed #999" : "1px solid transparent", color: "#999", fontSize: "0.7em", lineHeight: size, textAlign: "center" }}
            >
              {ctx.mode === "preview" ? "QR" : ""}
            </div>
          )}
        </div>
      );
    }

    case "cc":
      return (
        <div key={blockKey(b)} style={{ margin: "0 0 3mm" }}>
          <div>{b.label}</div>
          <ol style={{ margin: 0, paddingLeft: "7mm" }}>
            {b.items.map((it, i) => (
              <li key={i}>{renderInlines(it, ctx, `${b.id}-${i}`)}</li>
            ))}
          </ol>
        </div>
      );

    case "columns":
      return (
        <div key={blockKey(b)} style={{ display: "flex", gap: "4mm", margin: "0 0 3mm" }}>
          {b.children.map((col, i) => (
            <div key={i} style={{ flex: `${num(b.ratios[i], 1)} 1 0`, minWidth: 0 }}>
              {col.map((c) => renderBlock(c, ctx))}
            </div>
          ))}
        </div>
      );

    case "conditional":
      return evaluateCondition(b.when, ctx.values) ? (
        <div key={blockKey(b)}>{b.children.map((c) => renderBlock(c, ctx))}</div>
      ) : null;
  }
}

function cellStyle(head: boolean, align: CSSProperties["textAlign"], widthPct?: number, bordered = true): CSSProperties {
  return {
    border: bordered ? "1px solid #000" : undefined,
    padding: "1mm 2mm",
    textAlign: align,
    verticalAlign: "top",
    fontWeight: head ? 700 : 400,
    width: widthPct ? `${num(widthPct)}%` : undefined,
  };
}

/** Sel tabel dari baris grup; `ref` bergaya `grup.<id>.<baris>.<isian>` untuk pengait klik. */
function groupCell(ctx: Ctx, key: string, ref: string, text: string, label: string): ReactNode {
  const preview = ctx.mode === "preview";
  const showPlaceholder = preview && text === "";
  const clickable = preview && !!ctx.onFieldClick;
  const fire = () => ctx.onFieldClick?.(ref);
  return (
    <span
      key={key}
      data-ref={ref}
      data-empty={text === "" ? "true" : "false"}
      className={showPlaceholder ? "lp-ph" : undefined}
      style={{ ...(showPlaceholder ? PLACEHOLDER_STYLE : null), ...(clickable ? { cursor: "pointer" } : null) }}
      {...(clickable
        ? {
            role: "button",
            tabIndex: 0,
            onClick: fire,
            onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fire();
              }
            },
          }
        : null)}
    >
      {showPlaceholder ? `«${label}»` : text}
    </span>
  );
}

function renderDictum(b: Extract<LeafBlock, { type: "dictum" }>, ctx: Ctx): ReactNode {
  const labelWidth = "30mm";
  const row = (key: string, label: ReactNode, body: ReactNode) => (
    <div key={key} style={{ display: "flex", margin: "0 0 2mm" }}>
      <div style={{ width: labelWidth, flexShrink: 0 }}>{label}</div>
      <div style={{ width: "4mm", flexShrink: 0 }}>:</div>
      <div style={{ flex: 1, textAlign: "justify" }}>{body}</div>
    </div>
  );

  if (b.kind === "diktum") {
    return (
      <div key={b.id} style={{ margin: "0 0 3mm" }}>
        {b.items.map((it, i) => row(`${b.id}-${i}`, diktumOrdinal(i + 1), renderInlines(it, ctx, `${b.id}-${i}`)))}
      </div>
    );
  }

  const label = b.kind === "menimbang" ? "Menimbang" : b.kind === "mengingat" ? "Mengingat" : "Menetapkan";
  const single = b.items.length === 1;
  const body =
    b.kind === "menetapkan" || single ? (
      b.items.map((it, i) => <div key={i}>{renderInlines(it, ctx, `${b.id}-${i}`)}</div>)
    ) : (
      <ol type={b.kind === "menimbang" ? "a" : "1"} style={{ margin: 0, paddingLeft: "6mm" }}>
        {b.items.map((it, i) => (
          <li key={i}>{renderInlines(it, ctx, `${b.id}-${i}`)}</li>
        ))}
      </ol>
    );
  return (
    <div key={b.id} style={{ margin: "0 0 3mm" }}>
      {b.kind === "menetapkan" ? (
        <div style={{ textAlign: "center", fontWeight: 700, margin: "2mm 0" }}>MEMUTUSKAN:</div>
      ) : null}
      {row(`${b.id}-main`, label, body)}
    </div>
  );
}

// ------------------------------------------------------------------ tanda tangan

type SigSlot = Extract<LeafBlock, { type: "signature" }>["slots"][number];
type SigItem = { key: string; slot: SigSlot; row?: Record<string, string>; rowIndex?: number };

function expandSlots(b: Extract<LeafBlock, { type: "signature" }>, ctx: Ctx): SigItem[] {
  const out: SigItem[] = [];
  for (const slot of b.slots) {
    if (slot.who.kind === "grup") {
      const rows = ctx.values.groups[slot.who.group] ?? [];
      if (rows.length === 0 && ctx.mode === "preview") out.push({ key: `${slot.id}-0`, slot, row: {}, rowIndex: 0 });
      rows.forEach((row, i) => out.push({ key: `${slot.id}-${i}`, slot, row, rowIndex: i }));
    } else {
      out.push({ key: slot.id, slot });
    }
  }
  return out;
}

function renderSlot(it: SigItem, ctx: Ctx, width: string | undefined, margin: CSSProperties): ReactNode {
  const { slot, row, rowIndex } = it;
  const who = slot.who;
  const caption = plain(slot.caption, ctx).trim();

  // Jabatan hanya ada untuk pejabat; peran/grup/teks cukup dengan keterangan.
  const jabatan = who.kind === "pejabat" ? (ctx.values.pejabat[who.official as OfficialId]?.jabatan ?? "") : "";
  const prefix = PREFIX_TEXT[slot.prefix] ?? "";
  const head = prefix ? `${prefix} ${caption || jabatan}`.trim() : caption;
  const second = prefix ? (caption ? jabatan : "") : jabatan;

  let name: ReactNode = null;
  let nipLine: ReactNode = null;
  if (slot.showName) {
    if (who.kind === "pejabat") {
      const ref = `pejabat.${who.official}.nama`;
      name = FieldSpan(ctx, `${it.key}-nm`, ref, ctx.values.pejabat[who.official].nama, ctx.values.pejabat[who.official].nama.trim() === "");
      const nip = ctx.values.pejabat[who.official].nip;
      if (slot.showNip && nip) nipLine = <div>NIP. {nip}</div>;
    } else if (who.kind === "peran") {
      const ref = `${who.role}.nama`;
      const text = resolveRef(ref, ctx.values);
      name = FieldSpan(ctx, `${it.key}-nm`, ref, text, text.trim() === "");
    } else if (who.kind === "grup") {
      const g = ctx.doc.groups.find((x) => x.id === who.group);
      const fid = g?.fields.some((f) => f.id === "nama") ? "nama" : (g?.fields[0]?.id ?? "nama");
      const text = (row?.[fid] ?? "").trim();
      name = groupCell(ctx, `${it.key}-nm`, `grup.${who.group}.${rowIndex ?? 0}.${fid}`, text, g?.fields.find((f) => f.id === fid)?.label ?? fid);
    } else {
      name = who.text;
    }
  }

  const preview = ctx.mode === "preview";
  const gap = `${num(slot.gapMm, 25)}mm`;
  const decoBorder = (on: boolean) => (on && preview ? "1px dashed #999" : "1px solid transparent");

  return (
    <div
      key={it.key}
      data-slot={slot.id}
      style={{ width, textAlign: slot.align, ...margin }}
    >
      {head ? <div>{head}</div> : null}
      {second ? <div>{second}</div> : null}
      <div style={{ position: "relative", height: gap }}>
        {slot.stamp ? (
          <div
            className="lp-deco"
            aria-hidden="true"
            style={{ position: "absolute", left: 0, top: "2mm", width: "22mm", height: "22mm", borderRadius: "50%", border: decoBorder(true), color: "#999", fontSize: "0.65em", lineHeight: "22mm", textAlign: "center" }}
          >
            {preview ? "Stempel" : ""}
          </div>
        ) : null}
        {slot.materai ? (
          <div
            className="lp-deco"
            aria-hidden="true"
            style={{ position: "absolute", left: "50%", top: "50%", width: "20mm", height: "15mm", transform: "translate(-50%, -50%)", border: decoBorder(true), color: "#999", fontSize: "0.65em", lineHeight: "15mm", textAlign: "center" }}
          >
            {preview ? "Materai" : ""}
          </div>
        ) : null}
      </div>
      {name ? <div style={{ fontWeight: 700, textDecoration: who.kind === "pejabat" ? "underline" : undefined }}>{name}</div> : null}
      {nipLine}
    </div>
  );
}

function renderSignature(b: Extract<LeafBlock, { type: "signature" }>, ctx: Ctx): ReactNode {
  const items = expandSlots(b, ctx);
  const single = items.length === 1;
  const marginFor = (a: SigSlot["align"]): CSSProperties =>
    a === "right" ? { marginLeft: "auto" } : a === "left" ? { marginRight: "auto" } : { margin: "0 auto" };

  return (
    <div key={b.id} className="lp-avoid-break" style={{ margin: "4mm 0" }}>
      {b.dateline?.length ? (
        <div style={{ textAlign: b.layout === "row" && !single ? "right" : "right", margin: "0 0 1mm" }}>
          {renderInlines(b.dateline, ctx, `${b.id}-dl`)}
        </div>
      ) : null}
      {b.layout === "stack" ? (
        <div>{items.map((it) => renderSlot(it, ctx, "45%", { ...marginFor(it.slot.align), marginBottom: "4mm" }))}</div>
      ) : (
        <div style={{ display: single ? "block" : "flex", gap: "4mm", alignItems: "flex-start" }}>
          {items.map((it) =>
            single
              ? renderSlot(it, ctx, "45%", marginFor(it.slot.align === "center" ? "right" : it.slot.align))
              : renderSlot(it, ctx, undefined, { flex: "1 1 0", minWidth: 0 }),
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ kertas

export type LetterPaperFrameProps = LetterPaperProps & { children?: ReactNode };

/** Bingkai kertas (ukuran, margin, font) + kop; isi diberikan pemanggil. Dipakai juga oleh editor kanvas. */
export function LetterPaperFrame({ doc, values, mode = "preview", qrSrc, onFieldClick, className, children }: LetterPaperFrameProps) {
  const ctx: Ctx = { doc, values, mode, qrSrc, onFieldClick };
  const { w, h } = paperMm(doc);
  const m = doc.page.margin;
  const font = FONTS[doc.page.font] ?? FONTS.times;
  const lineHeight = (LINE_HEIGHTS as readonly number[]).includes(doc.page.lineHeight) ? doc.page.lineHeight : 1.15;

  return (
    <div
      className={["lp-paper", className].filter(Boolean).join(" ")}
      data-letter-paper=""
      data-mode={mode}
      style={{
        boxSizing: "border-box",
        width: `${num(w)}mm`,
        minHeight: `${num(h)}mm`,
        padding: `${num(m.top, 20)}mm ${num(m.right, 20)}mm ${num(m.bottom, 20)}mm ${num(m.left, 25)}mm`,
        margin: "0 auto",
        background: "#fff",
        color: "#000",
        fontFamily: font.css,
        fontSize: `${num(doc.page.fontSizePt, 12)}pt`,
        lineHeight,
        boxShadow: mode === "preview" ? "0 1px 6px rgba(0,0,0,.25)" : undefined,
      }}
    >
      {Kop(ctx)}
      {children}
    </div>
  );
}

export type LetterBlockViewProps = {
  doc: LetterDocument;
  values: LetterValues;
  block: Block;
  mode?: LetterPaperMode;
  qrSrc?: string;
  onFieldClick?: (ref: string) => void;
};

/** Satu bagian surat persis seperti di kertas (tanpa bingkai). Dipakai editor kanvas untuk membungkus tiap bagian. */
export function LetterBlockView({ doc, values, block, mode = "preview", qrSrc, onFieldClick }: LetterBlockViewProps) {
  const ctx: Ctx = { doc, values, mode, qrSrc, onFieldClick };
  return <>{renderBlock(block, ctx)}</>;
}

export function LetterPaper(props: LetterPaperProps) {
  const { doc, values, mode = "preview", qrSrc, onFieldClick } = props;
  const ctx: Ctx = { doc, values, mode, qrSrc, onFieldClick };
  return <LetterPaperFrame {...props}>{doc.body.map((b) => renderBlock(b, ctx))}</LetterPaperFrame>;
}
