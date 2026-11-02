import type { StatTable } from "@/lib/statistics/export";

const fmt = (n: string | number) => (typeof n === "number" ? n.toLocaleString("id-ID") : n);

/** Tabel laporan (layar dan cetak). Sel bernilai nol dibuat redup agar angka yang bermakna menonjol. */
export function LampidTableView({ table, print = false, muteZero = true }: { table: StatTable; print?: boolean; muteZero?: boolean }) {
  const cell = print ? "border px-2 py-1" : "border-b px-3 py-2";
  const num = (c: string | number) => (muteZero && c === 0 && !print ? "text-muted-foreground/60" : "");
  return (
    <div className={print ? "" : "overflow-x-auto rounded-lg border"}>
      <table className={`w-full border-collapse text-left ${print ? "table-fixed text-xs" : "min-w-[34rem] text-sm"}`}>
        <caption className={print ? "pb-1 text-left font-semibold" : "sr-only"}>{table.title}</caption>
        <thead className={print ? "" : "bg-muted/50"}>
          <tr>
            {table.columns.map((c, i) => (
              <th key={c} scope="col" className={`${cell} font-semibold ${table.numeric.includes(i) ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci} className={`${cell} ${table.numeric.includes(ci) ? `text-right tabular-nums ${num(c)}` : ""}`}>
                  {fmt(c)}
                </td>
              ))}
            </tr>
          ))}
          {table.total ? (
            <tr className="font-semibold">
              {table.total.map((c, ci) => (
                <td key={ci} className={`${cell} bg-muted/40 ${table.numeric.includes(ci) ? "text-right tabular-nums" : ""}`}>
                  {fmt(c)}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
