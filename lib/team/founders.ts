export type Founder = {
  id: string;
  name: string;
  initials: string;
  role: string;
  image: string | null;
};

export const FOUNDERS: Founder[] = [
  {
    id: "wisnu-saputro",
    name: "Wisnu Saputro",
    initials: "WS",
    role: "Percaya bahwa teknologi yang sederhana dan tepat guna bisa meringankan kerja sehari-hari di desa. Klandesa lahir dari kepedulian itu: membantu perangkat desa bekerja lebih efisien dan produktif, agar waktu dan tenaga lebih banyak tercurah untuk melayani warga.",
    image: "/team/wisnu-saputro.jpg",
  },
];
