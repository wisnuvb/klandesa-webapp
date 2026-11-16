import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDataWargaColumns } from "../components/app/data-warga/DataWargaTableColumns.tsx";

const columns = createDataWargaColumns({ onView: () => undefined, onEdit: () => undefined });
const nameCell = columns.find((c) => c.key === "name")!.cell!;
const base = { id: 1, name: "CIPTOSARI", photo: null, photoThumb: null, isAlive: true, moveDate: null };
const html = (over: Record<string, unknown>) => renderToStaticMarkup(React.createElement(React.Fragment, null, nameCell({ ...base, ...over } as never, 0)));

describe("kolom Nama Data Warga: status terbaca di barisnya", () => {
  it("warga meninggal diberi lencana teks 'Meninggal'", () => {
    assert.match(html({ isAlive: false }), />Meninggal</);
  });
  it("warga yang sudah pindah diberi lencana 'Pindah'; meninggal didahulukan", () => {
    assert.match(html({ moveDate: "2026-04-05T00:00:00.000Z" }), />Pindah</);
    const both = html({ isAlive: false, moveDate: "2026-04-05T00:00:00.000Z" });
    assert.match(both, />Meninggal</);
    assert.doesNotMatch(both, />Pindah</);
  });
  it("warga hidup biasa tanpa lencana", () => {
    const h = html({});
    assert.doesNotMatch(h, />Meninggal</);
    assert.doesNotMatch(h, />Pindah</);
    assert.match(h, /CIPTOSARI/);
  });
});
