import { getTenant } from "@/lib/tenant";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();

  return (
    <>
      {/* Tenant website layout */}
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="text-xl font-bold">
            {tenant?.name || "Tenant"} Website
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
