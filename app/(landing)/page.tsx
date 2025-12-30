export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-white to-gray-100 dark:from-black dark:to-gray-900">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome to Klandesa</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Platform multi-tenant untuk membuat website dan mengelola bisnis
            Anda
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="http://app.localhost:3000"
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
            <a
              href="#features"
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        <section id="features" className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Multi-Tenant</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Setiap tenant mendapatkan subdomain sendiri dengan isolasi data
                yang aman
              </p>
            </div>
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Custom Websites</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Buat website khusus untuk setiap tenant dengan branding
                masing-masing
              </p>
            </div>
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Powerful Dashboard</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Dashboard lengkap untuk mengelola konten dan pengaturan
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
