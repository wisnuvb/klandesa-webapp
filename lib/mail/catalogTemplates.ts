/**
 * Template surat desa untuk seed katalog global (`MailTemplate`:
 * villageId=null, isGlobal=true, catalogKey terisi).
 *
 * Isinya dokumen v2 (lihat `lib/letters/catalog`); di sini hanya divalidasi dan dibungkus
 * menjadi baris seed. Dokumen yang tidak valid menggagalkan seed, bukan masuk ke database.
 */

import type { Prisma } from "@prisma/client";
import { getCatalogV2, type CatalogEntry } from "../letters/catalog";
import { flattenBlocks, validateDocument } from "../letters/document/validate";
import type { Inline, LetterDocument } from "../letters/document/schema";

export type CatalogSeedDef = CatalogEntry;

export type CatalogSeedRow = {
  catalogKey: string;
  name: string;
  description: string;
  category: string;
  templateStructure: Prisma.InputJsonValue;
  contentTemplate: string;
};

/** Teks polos satu rangkaian Inline; isian ditulis `{rujukan}` agar ringkasan tetap terbaca. */
function inlineText(list: readonly Inline[] | undefined): string {
  let out = "";
  for (const n of list ?? []) {
    if (n.type === "text") out += n.text;
    else if (n.type === "br") out += "\n";
    else out += `{${n.ref}}`;
  }
  return out;
}

/** Ringkasan teks polos dokumen (tanpa HTML), untuk `contentTemplate` dan pencarian. */
export function summarizeDocument(doc: LetterDocument): string {
  const parts: string[] = [];
  for (const b of flattenBlocks(doc.body)) {
    switch (b.type) {
      case "paragraph":
      case "heading":
        parts.push(inlineText(b.content));
        break;
      case "title":
        parts.push(inlineText(b.title));
        break;
      case "memo":
        parts.push(...b.rows.map((r) => `${r.label}: ${inlineText(r.value)}`));
        break;
      case "list":
      case "dictum":
      case "cc":
        parts.push(...b.items.map(inlineText));
        break;
      default:
        break;
    }
  }
  return parts.filter((p) => p.trim() !== "").join("\n\n");
}

export function buildCatalogInserts(def: CatalogSeedDef): CatalogSeedRow {
  const result = validateDocument(def.document);
  if (!result.ok) {
    const detail = result.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(`Template katalog "${def.catalogKey}" tidak valid — ${detail}`);
  }
  return {
    catalogKey: def.catalogKey,
    name: def.name,
    description: def.description,
    category: def.category,
    templateStructure: result.doc as unknown as Prisma.InputJsonValue,
    contentTemplate: summarizeDocument(result.doc),
  };
}

/** Full list for seed/migration. */
export function getAllCatalogDefinitions(): CatalogSeedDef[] {
  return getCatalogV2();
}

/** Baris INSERT untuk seed Prisma — upsert berdasarkan `catalogKey`. */
export function catalogRowsForSeed(): CatalogSeedRow[] {
  return getAllCatalogDefinitions().map((def) => buildCatalogInserts(def));
}
