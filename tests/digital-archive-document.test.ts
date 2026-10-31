import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_DOCUMENT_MIME_EXT,
  DEFAULT_CATEGORY,
  MAX_DOCUMENT_BYTES,
  getDocumentExtension,
  isAllowedDocumentExtension,
  validateDocumentFile,
} from "../lib/digitalArchive/document.ts";
import { normalizeCategoryInput } from "../lib/digitalArchive/folderPath.ts";

describe("allowlist tipe file dokumen arsip", () => {
  it("kategori default adalah Umum", () => {
    assert.equal(DEFAULT_CATEGORY, "Umum");
  });

  it("ekstensi standar (pdf, docx, zip, jpg) diizinkan", () => {
    assert.equal(isAllowedDocumentExtension("pdf"), true);
    assert.equal(isAllowedDocumentExtension("docx"), true);
    assert.equal(isAllowedDocumentExtension("zip"), true);
    assert.equal(isAllowedDocumentExtension("jpg"), true);
    assert.equal(ALLOWED_DOCUMENT_MIME_EXT["pdf"], "application/pdf");
  });

  it("ekstensi berbahaya (html, svg, js, exe) ditolak", () => {
    assert.equal(isAllowedDocumentExtension("html"), false);
    assert.equal(isAllowedDocumentExtension("svg"), false);
    assert.equal(isAllowedDocumentExtension("js"), false);
    assert.equal(isAllowedDocumentExtension("exe"), false);
  });

  it("berkas dengan ekstensi tidak didukung ditolak validateDocumentFile", () => {
    const err = validateDocumentFile({ name: "halaman.html", size: 100 });
    assert.ok(err);
    assert.match(err!, /Tipe berkas tidak didukung/);
  });

  it("berkas tanpa ekstensi ditolak", () => {
    const err = validateDocumentFile({ name: "berkas-tanpa-ekstensi", size: 100 });
    assert.ok(err);
  });

  it("berkas valid dalam batas ukuran lolos validasi", () => {
    const err = validateDocumentFile({ name: "surat-keterangan.pdf", size: 1024 });
    assert.equal(err, null);
  });

  it("berkas melebihi 200 MB ditolak", () => {
    const err = validateDocumentFile({
      name: "video-besar.mp4",
      size: MAX_DOCUMENT_BYTES + 1,
    });
    assert.ok(err);
    assert.match(err!, /Ukuran berkas terlalu besar/);
  });

  it("berkas kosong ditolak", () => {
    const err = validateDocumentFile({ name: "kosong.pdf", size: 0 });
    assert.ok(err);
  });

  it("getDocumentExtension mengambil ekstensi huruf kecil", () => {
    assert.equal(getDocumentExtension("Laporan.PDF"), "pdf");
    assert.equal(getDocumentExtension("tanpa-ekstensi"), "");
  });
});

describe("normalisasi input kategori", () => {
  it("merapikan spasi berlebih tanpa mengubah kapitalisasi", () => {
    assert.equal(normalizeCategoryInput("  Surat   Keterangan  "), "Surat Keterangan");
    assert.equal(normalizeCategoryInput(""), "");
  });
});
