import Link from "next/link";
import {
  getLpdpOpenScholarshipsSnapshot,
  LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL,
} from "@/lib/scholarships/lpdp";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(sp: SearchParams | undefined, key: string): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function formatIdDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function statusBadge(status: "open" | "last_day" | "closed"): string {
  if (status === "closed") return "bg-gray-100 text-gray-700 border-gray-200";
  if (status === "last_day") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const snapshot = await getLpdpOpenScholarshipsSnapshot();

  const q = firstParam(searchParams, "q").trim();
  const jenjang = firstParam(searchParams, "jenjang").trim();
  const instansi = firstParam(searchParams, "instansi").trim();
  const status = firstParam(searchParams, "status").trim();
  const sort = firstParam(searchParams, "sort").trim() || "deadline_asc";

  const allItems = snapshot.items;
  const levels = Array.from(new Set(allItems.map((x) => x.level).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "id"));
  const providers = Array.from(
    new Set(allItems.map((x) => x.provider).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "id"));

  let items = allItems.slice();
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((x) => {
      const hay = `${x.title} ${x.description} ${x.provider} ${x.level}`.toLowerCase();
      return hay.includes(needle);
    });
  }
  if (jenjang) items = items.filter((x) => x.level === jenjang);
  if (instansi) items = items.filter((x) => x.provider === instansi);
  if (status === "open" || status === "last_day" || status === "closed") {
    items = items.filter((x) => x.status === status);
  }

  items.sort((a, b) => {
    if (sort === "title_asc") return a.title.localeCompare(b.title, "id");
    if (sort === "title_desc") return b.title.localeCompare(a.title, "id");
    if (sort === "days_left_asc")
      return (a.daysLeft ?? 9e9) - (b.daysLeft ?? 9e9);
    if (sort === "days_left_desc")
      return (b.daysLeft ?? -9e9) - (a.daysLeft ?? -9e9);
    if (sort === "deadline_desc") {
      const ta = a.deadlineAt ? Date.parse(a.deadlineAt) : -9e9;
      const tb = b.deadlineAt ? Date.parse(b.deadlineAt) : -9e9;
      return tb - ta;
    }
    const ta = a.deadlineAt ? Date.parse(a.deadlineAt) : 9e9;
    const tb = b.deadlineAt ? Date.parse(b.deadlineAt) : 9e9;
    return ta - tb;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-28 pb-10 bg-linear-to-b from-white to-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <span>Sumber: LPDP</span>
              <span className="text-emerald-300">•</span>
              <Link
                href={LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                lpdp.kemenkeu.go.id
              </Link>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold text-gray-900">
              Info Beasiswa LPDP
            </h1>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Daftar program beasiswa yang sedang dibuka di LPDP, lengkap dengan
              tenggat dan ringkasan informasi. Gunakan pencarian, filter, dan
              urutkan sesuai kebutuhan.
            </p>
          </div>

          <div className="mt-8">
            <form
              method="GET"
              className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4">
                  <label
                    htmlFor="q"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Cari
                  </label>
                  <input
                    id="q"
                    name="q"
                    defaultValue={q}
                    placeholder="Nama program, instansi, deskripsi…"
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="jenjang"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Jenjang
                  </label>
                  <select
                    id="jenjang"
                    name="jenjang"
                    defaultValue={jenjang}
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">Semua</option>
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="instansi"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Instansi
                  </label>
                  <select
                    id="instansi"
                    name="instansi"
                    defaultValue={instansi}
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">Semua</option>
                    {providers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">Semua</option>
                    <option value="open">Sedang Dibuka</option>
                    <option value="last_day">Terakhir Hari Ini</option>
                    <option value="closed">Ditutup</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="sort"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Urutkan
                  </label>
                  <select
                    id="sort"
                    name="sort"
                    defaultValue={sort}
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="deadline_asc">Deadline tercepat</option>
                    <option value="deadline_desc">Deadline terjauh</option>
                    <option value="days_left_asc">Sisa hari paling kecil</option>
                    <option value="days_left_desc">Sisa hari paling besar</option>
                    <option value="title_asc">Judul A–Z</option>
                    <option value="title_desc">Judul Z–A</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  {snapshot.fetchedAt ? (
                    <span>
                      Terakhir diperbarui:{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(snapshot.fetchedAt))}
                      {snapshot.stale ? " (stale)" : ""}
                    </span>
                  ) : (
                    <span>Memuat data…</span>
                  )}
                  {snapshot.error ? (
                    <span className="ml-2 text-amber-700">
                      {snapshot.error}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/beasiswa"
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                  >
                    Reset
                  </Link>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-md transition-all"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Program tersedia
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Menampilkan {items.length} dari {allItems.length} program.
              </p>
            </div>
            <Link
              href="https://beasiswalpdp-terintegrasi.kemenkeu.go.id/login"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Portal Pendaftaran
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 text-gray-700">
              Tidak ada program yang cocok dengan filter kamu. Coba ubah kata
              kunci atau reset filter.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 leading-snug">
                        {it.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {it.level}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-200">
                          {it.provider}
                        </span>
                        <span
                          className={[
                            "px-2.5 py-1 rounded-full text-xs border",
                            statusBadge(it.status),
                          ].join(" ")}
                        >
                          {it.statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-4">
                    {it.description}
                  </p>

                  <div className="mt-4 text-sm text-gray-700">
                    <div className="flex flex-col gap-1">
                      <div>
                        <span className="text-gray-500">Tenggat:</span>{" "}
                        {it.deadlineDate ? formatIdDate(it.deadlineDate) : "—"}
                      </div>
                      <div>
                        <span className="text-gray-500">Sisa hari:</span>{" "}
                        {typeof it.daysLeft === "number" ? it.daysLeft : "—"}
                      </div>
                    </div>
                  </div>

                  {it.requirements.length > 0 ? (
                    <ul className="mt-4 text-sm text-gray-700 space-y-1">
                      {it.requirements.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0d9488] shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-auto pt-5 flex gap-3">
                    <Link
                      href={it.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center text-sm"
                    >
                      Situs Resmi
                    </Link>
                    <Link
                      href="https://beasiswalpdp-terintegrasi.kemenkeu.go.id/login"
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2 rounded-xl bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-md transition-all text-center text-sm"
                    >
                      Daftar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-600 leading-relaxed">
            Data ditampilkan apa adanya dari LPDP dan dapat berubah sewaktu-waktu.
            Jika ada perbedaan informasi, selalu rujuk ke situs resmi.
          </div>
        </div>
      </div>
    </div>
  );
}

