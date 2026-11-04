import type { ReactNode } from "react";

/** Kerangka kartu untuk halaman akun publik (lupa/atur kata sandi), selaras dengan halaman masuk. */
export function AuthShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-teal-400/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
      </div>
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
