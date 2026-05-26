"use client";

/** Mockup kartu untuk hero — menghindari stock photo & menyerupai Dashboard SDGs. */
export function HeroProductMockup() {
  const goals = [1, 2, 8, 11, 16, 17];
  return (
    <div className="relative max-w-lg w-full mx-auto lg:mr-0">
      <div className="pointer-events-none absolute inset-4 rounded-[1.75rem] bg-linear-to-br from-[#0d9488]/10 to-[#6366f1]/10 blur-sm" />
      <div className="relative rounded-3xl border border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
          <span className="text-xs font-medium text-gray-500">Dashboard</span>
          <span className="text-xs font-semibold text-[#0d9488]">
            SDGs Desa • beta
          </span>
          <span className="text-[10px] text-gray-400">heatmap RT/RW</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[72, "<45", "+10"].map((v, i) => (
              <div key={i} className="rounded-xl bg-teal-50 border border-teal-100 px-3 py-2">
                <div className="text-[10px] uppercase text-teal-600 font-medium truncate">
                  {i === 0 ? "Ikhtisar skor" : i === 1 ? "Perlu dukungan" : "Tagging APBDes"}
                </div>
                <div className="text-lg font-bold text-teal-900">{String(v)}</div>
              </div>
            ))}
          </div>
          <div className="text-xs font-medium text-gray-700 mb-1">Ringkasan tujuan (contoh UI)</div>
          <div className="flex flex-wrap gap-1.5">
            {goals.map((g) => (
              <span
                key={g}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold shadow-sm bg-linear-to-br from-[#6366f1] to-[#0d9488] text-white"
              >
                {g}
              </span>
            ))}
          </div>
          <div className="h-28 rounded-xl bg-linear-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center text-[11px] text-slate-500 px-6 text-center">
            Peta / heatmap per RW—selaras modul GIS & Lingkungan
          </div>
        </div>
      </div>
    </div>
  );
}
