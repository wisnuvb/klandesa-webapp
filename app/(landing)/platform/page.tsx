import { getMarketingModules } from "@/lib/marketing/modules";
import { ModuleCatalog } from "@/components/features/marketing/ModuleCatalog";

export default function PlatformPage() {
  const modules = getMarketingModules();
  return (
    <>
      <div className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] px-4 pt-28 pb-14 md:px-8 md:pt-32 md:pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto text-center text-white">
          <p className="text-sm text-white/85 mb-3">Katalog produk</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Platform Klandesa</h1>
          <p className="text-white/90 max-w-2xl mx-auto text-sm md:text-base">
            Modul di bawah diselaraskan dengan registri produk sehingga narasi marketing
            dengan fitur yang Anda deploy.
          </p>
        </div>
      </div>
      <ModuleCatalog modules={modules} />
    </>
  );
}
