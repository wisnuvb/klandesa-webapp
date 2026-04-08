"use client";

import {
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { KlandesaLogo } from "./KlandesaLogo";

export function Footer() {
  // const navigate = useNavigate();
  const router = useRouter();

  const footerLinks = {
    product: [
      { name: "Fitur", path: "/fitur", type: "route" },
      { name: "Harga", path: "/harga", type: "route" },
      { name: "Manfaat", href: "#manfaat", type: "hash" },
      { name: "Statistik", href: "#statistik", type: "hash" },
      { name: "Demo", href: "#demo", type: "hash" },
    ],
    company: [
      { name: "Tentang Kami", href: "#tentang", type: "hash" },
      { name: "Blog", href: "#blog", type: "hash" },
      { name: "Karir", href: "#karir", type: "hash" },
      { name: "Kontak", href: "#kontak", type: "hash" },
    ],
    legal: [
      { name: "Privacy Policy", href: "#privacy", type: "hash" },
      { name: "Terms of Service", href: "#terms", type: "hash" },
      { name: "Cookie Policy", href: "#cookie", type: "hash" },
    ],
  };

  const handleLinkClick = (href?: string, path?: string, type?: string) => {
    if (type === "route" && path) {
      router.push(path);
      window.scrollTo(0, 0);
    } else if (type === "hash" && href) {
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
  };

  const socialMedia = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="relative bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0d9488] rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-linear(rgba(255,255,255,0.1) 1px, transparent 1px), linear-linear(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      {/* Top Border Gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#0d9488] via-[#6366f1] to-[#fbbf24]"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <Link href="/" className="inline-block mb-4">
                <KlandesaLogo
                  className="w-12 h-12"
                  showText={false}
                  variant="white"
                />
              </Link>
              <h3 className="text-2xl mb-2">Klandesa</h3>
              <p className="text-gray-400 leading-relaxed">
                Platform digitalisasi desa yang membantu transformasi digital
                untuk desa-desa di Indonesia.
              </p>
            </div>

            {/* Social Media */}
            <div className="flex gap-3">
              {socialMedia.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="group bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10 hover:bg-linear-to-br hover:from-[#0d9488] hover:to-[#0f766e] hover:border-transparent transition-all hover:scale-110"
                >
                  <social.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-lg mb-6 relative inline-block">
              Produk
              <div className="absolute -bottom-2 left-0 w-12 h-1 bg-linear-to-r from-[#0d9488] to-transparent rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() =>
                      handleLinkClick(link.href, link.path, link.type)
                    }
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-[#0d9488] transition-all duration-300 rounded-full"></span>
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-lg mb-6 relative inline-block">
              Perusahaan
              <div className="absolute -bottom-2 left-0 w-12 h-1 bg-linear-to-r from-[#6366f1] to-transparent rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() =>
                      handleLinkClick(link.href, link.href, link.type)
                    }
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-[#6366f1] transition-all duration-300 rounded-full"></span>
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg mb-6 relative inline-block">
              Hubungi Kami
              <div className="absolute -bottom-2 left-0 w-12 h-1 bg-linear-to-r from-[#fbbf24] to-transparent rounded-full"></div>
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="bg-white/5 p-2 rounded-lg group-hover:bg-[#0d9488]/20 transition-colors">
                  <Mail className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <a
                    href="mailto:info@klandesa.com"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    info@klandesa.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="bg-white/5 p-2 rounded-lg group-hover:bg-[#6366f1]/20 transition-colors">
                  <Phone className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Telepon</p>
                  <a
                    href="tel:+6282320337777"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    +62 823 2033 7777
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="bg-white/5 p-2 rounded-lg group-hover:bg-[#fbbf24]/20 transition-colors">
                  <MapPin className="w-5 h-5 text-[#fbbf24]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Lokasi</p>
                  <p className="text-gray-300">Jakarta, Indonesia</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10"></div>

        {/* Bottom Section */}
        <div className="py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm text-center md:text-left">
            © {new Date().getFullYear()} Klandesa. All rights reserved.
          </p>

          {/* Legal Links */}
          <div className="flex flex-wrap gap-6 justify-center">
            {footerLinks.legal.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1 group"
              >
                {link.name}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>

        {/* Made with Love */}
        <div className="pb-6 text-center">
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            Dibuat dengan
            <span className="text-red-500 animate-pulse">❤️</span>
            untuk Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
