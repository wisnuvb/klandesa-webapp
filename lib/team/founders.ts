export type FounderAccent = "teal" | "indigo" | "amber";

export type Founder = {
  id: string;
  name: string;
  initials: string;
  role: string;
  image: string | null;
  accent: FounderAccent;
};

export const FOUNDERS: Founder[] = [
  {
    id: "wisnu-saputro",
    name: "Wisnu Saputro",
    initials: "WS",
    role: "Full-stack developer, tech leader, dan arsitek sistem skalabel berpengalaman membangun platform digital, infrastruktur tangguh, dan inovasi teknologi.",
    image: "/team/wisnu.jpg",
    accent: "teal",
  },
  {
    id: "boediman-ep",
    name: "Boediman, EP.",
    initials: "BE",
    role: "Strategi Komunikasi & Pembangun Ekosistem dengan keahlian dalam transformasi masyarakat digital, jejaring kelembagaan, komunikasi publik, serta adopsi teknologi berbasis komunitas.",
    image: "/team/boediman.jpg",
    accent: "indigo",
  },
  {
    id: "krina-wibisana",
    name: "Krina Wibisana",
    initials: "KW",
    role: "Teknolog dan software engineer berpengalaman membangun produk digital, platform web, dan sistem enterprise yang skalabel, andal, dan mudah diakses.",
    image: "/team/krina.jpeg",
    accent: "amber",
  },
];
