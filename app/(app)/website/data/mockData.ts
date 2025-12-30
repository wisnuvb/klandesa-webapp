import { WebsiteTemplate } from "../types";

export const mockTemplates: WebsiteTemplate[] = [
  {
    id: 1,
    name: "Modern Village",
    slug: "modern-village",
    description:
      "Template modern dengan desain minimalis dan clean. Cocok untuk desa yang ingin tampil profesional.",
    price: 1200000,
    features: [
      "Responsive Design",
      "SEO Optimized",
      "Berita & Artikel",
      "Galeri Foto",
      "Profil Desa",
      "Layanan Online",
      "Kontak & Maps",
    ],
    preview_images: [
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop",
    ],
    badge: "Popular",
    demo_url: "https://demo.modern-village.com",
  },
  {
    id: 2,
    name: "Classic Heritage",
    slug: "classic-heritage",
    description:
      "Desain klasik dengan nuansa tradisional yang elegan. Mempertahankan nilai budaya lokal.",
    price: 800000,
    features: [
      "Responsive Design",
      "SEO Optimized",
      "Portal Berita",
      "Struktur Organisasi",
      "Data Kependudukan",
      "Potensi Desa",
      "Kontak Form",
    ],
    preview_images: [
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
    ],
    badge: "Recommended",
  },
  {
    id: 3,
    name: "Professional Gov",
    slug: "professional-gov",
    description:
      "Template profesional dengan tampilan formal untuk pemerintahan. Dilengkapi dashboard admin.",
    price: 2000000,
    features: [
      "Responsive Design",
      "SEO Optimized",
      "Advanced Dashboard",
      "Multi User Role",
      "E-Document",
      "Live Chat Support",
      "Analytics Dashboard",
      "Custom Domain",
    ],
    preview_images: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop",
    ],
    badge: "Best Seller",
    is_premium: true,
  },
];

// More templates can be added here or loaded from API
