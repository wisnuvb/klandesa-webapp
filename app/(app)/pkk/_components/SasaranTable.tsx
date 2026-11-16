import { SASARAN_COLUMNS, type SasaranGroupKey, type SasaranReport } from "@/lib/pkk/sasaran";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Sel tabel yang diklik: kelompok × area (null = seluruh desa). */
export type SasaranCell = { group: SasaranGroupKey | "semua"; area: string | null; title: string };

const NUM = "text-right tabular-nums";

/** Tabel sasaran (murni, tanpa data fetching) supaya bisa dites render dan dipakai ulang. */
export function SasaranTable({ report, caption, onOpen }: { report: SasaranReport; caption: string; onOpen: (c: SasaranCell) => void }) {
  return (
    <div role="region" aria-label="Tabel data sasaran per RT" tabIndex={0} className="rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="sticky left-0 z-10 min-w-36 bg-background align-bottom">RT / RW</TableHead>
            <TableHead scope="col" className={`${NUM} align-bottom`}>Jumlah<br />warga</TableHead>
            {SASARAN_COLUMNS.map((c) => (
              <TableHead key={c.key} scope="col" title={c.hint} className={`${NUM} align-bottom`}>
                <span className="block">
                  {c.label}
                  {c.overlap ? (
                    <>
                      <span aria-hidden="true"> †</span>
                      <span className="sr-only"> (tumpang tindih dengan kolom lain)</span>
                    </>
                  ) : null}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">{c.short}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.map((r) => (
            <TableRow key={r.key}>
              <TableHead scope="row" className="sticky left-0 z-10 bg-background font-medium">{r.label}</TableHead>
              <TableCell className={`${NUM} py-0.5`}>
                <CountButton n={r.total} label={`Seluruh warga, ${r.label}`} onOpen={() => onOpen({ group: "semua", area: r.key, title: `Seluruh warga, ${r.label}` })} />
              </TableCell>
              {SASARAN_COLUMNS.map((c) => (
                <TableCell key={c.key} className={`${NUM} py-0.5`}>
                  <CountButton n={r[c.key]} label={`${c.label}, ${r.label}`} onOpen={() => onOpen({ group: c.key, area: r.key, title: `${c.label}, ${r.label}` })} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <tfoot>
          <TableRow className="border-t-2 bg-muted font-semibold hover:bg-muted">
            <TableHead scope="row" className="sticky left-0 z-10 bg-muted">Total desa</TableHead>
            <TableCell className={`${NUM} py-0.5`}>
              <CountButton n={report.totals.total} label="Seluruh warga, total desa" onOpen={() => onOpen({ group: "semua", area: null, title: "Seluruh warga, total desa" })} />
            </TableCell>
            {SASARAN_COLUMNS.map((c) => (
              <TableCell key={c.key} className={`${NUM} py-0.5`}>
                <CountButton n={report.totals[c.key]} label={`${c.label}, total desa`} onOpen={() => onOpen({ group: c.key, area: null, title: `${c.label}, total desa` })} />
              </TableCell>
            ))}
          </TableRow>
        </tfoot>
      </Table>
    </div>
  );
}

/** Angka yang bisa diklik untuk melihat nama. Nol bukan tombol (tidak ada daftar), tetapi tetap dibacakan lengkap dengan konteksnya. */
export function CountButton({ n, label, onOpen }: { n: number; label: string; onOpen: () => void }) {
  if (n === 0) {
    return (
      <span className="inline-flex min-h-11 min-w-11 items-center justify-end px-2 text-muted-foreground">
        0<span className="sr-only">, {label}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${n}, lihat daftar: ${label}`}
      className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-end rounded-md px-2 font-medium underline decoration-dotted underline-offset-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {n}
    </button>
  );
}
