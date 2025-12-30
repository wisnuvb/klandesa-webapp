export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Landing page specific layout/header */}
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold">Klandesa</div>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-gray-600">
              Features
            </a>
            <a href="#pricing" className="hover:text-gray-600">
              Pricing
            </a>
            <a href="http://app.localhost:3000" className="hover:text-gray-600">
              Login
            </a>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
