"use client";

import React from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { KlandesaLogo } from "./KlandesaLogo";

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  // const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const router = useRouter();

  const navLinks = [
    { name: "Beranda", href: "/", type: "route" },
    { name: "Tentang", href: "#tentang", type: "hash" },
    { name: "Fitur", href: "/fitur", type: "route" },
    { name: "Harga", href: "/harga", type: "route" },
    { name: "Karir", href: "/karir", type: "route" },
    { name: "Manfaat", href: "#manfaat", type: "hash" },
    { name: "Kontak", href: "#kontak", type: "hash" },
  ];

  const handleNavClick = (href: string, type: string) => {
    if (type === "route") {
      // navigate(href);
      router.push(href);
      window.scrollTo(0, 0);
    } else if (type === "hash") {
      // For hash links, navigate to home first if not already there
      if (window.location.pathname !== "/") {
        router.push("/");
        setTimeout(() => {
          const element = document.querySelector(href);
          element?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center group"
            onClick={() => window.scrollTo(0, 0)}
          >
            <KlandesaLogo className="w-10 h-10" showText={false} />
            <div className="flex flex-col ml-2">
              <span className="text-xl text-gray-900 group-hover:text-[#0d9488] transition-colors">
                Klandesa
              </span>
              <span className="text-xs text-gray-500 -mt-1">
                Digitalisasi Desa
              </span>
            </div>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-0">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.href, link.type)}
                className="text-gray-700 hover:text-[#0d9488] transition-colors px-4 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLoginClick}
              className="text-gray-700 hover:text-[#0d9488] transition-colors px-4 py-2 cursor-pointer"
            >
              Masuk
            </button>
            <button
              onClick={() => onRegisterClick()}
              className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              Daftar Sekarang
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-[#0d9488] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden animate-in slide-in-from-top-5 duration-200">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.href, link.type)}
                className="block w-full text-left text-gray-700 hover:text-[#0d9488] hover:bg-gray-50 transition-colors px-4 py-3 rounded-lg cursor-pointer"
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Mobile Auth Buttons */}
          <div className="px-4 pb-4 space-y-2 border-t border-gray-200 pt-4">
            <button
              onClick={() => {
                onLoginClick();
                setIsMenuOpen(false);
              }}
              className="w-full text-center text-gray-700 hover:text-[#0d9488] transition-colors px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                onRegisterClick();
                setIsMenuOpen(false);
              }}
              className="w-full bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all cursor-pointer"
            >
              Daftar Sekarang
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
