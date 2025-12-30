import { getTenant } from "@/lib/tenant";

export default async function TenantWebsite() {
  const tenant = await getTenant();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black">
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to {tenant?.name}&apos;s Website
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Subdomain:{" "}
          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded">
            {tenant?.subdomain}.klandesa.com
          </code>
        </p>
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">
            Ini adalah website khusus untuk tenant{" "}
            <strong>{tenant?.name}</strong>. Setiap tenant memiliki website
            sendiri dengan subdomain unik dan dapat dikustomisasi sesuai
            kebutuhan.
          </p>
        </div>
      </main>
    </div>
  );
}
