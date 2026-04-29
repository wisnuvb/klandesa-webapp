import { PrismaClient, Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { catalogRowsForSeed } from "../lib/mail/catalogTemplates";
import { mergeTemplateCapabilities } from "../lib/website-engine/feature-capabilities";

const prisma = new PrismaClient();

/** Tabel/kolom belum termigrasi — seed bagian ini boleh dilewati tanpa gagal total. */
function isSkippableMissingSchemaError(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P2021" || e.code === "P2022")
  );
}

/** Jalankan blok seed; jika skema belum siap, log peringatan dan lanjut. */
async function trySeedStep(
  name: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    if (isSkippableMissingSchemaError(e)) {
      const meta =
        e instanceof Prisma.PrismaClientKnownRequestError ? e.meta : undefined;
      console.warn(
        `⚠ ${name}: dilewati — skema DB belum lengkap (${meta ? JSON.stringify(meta) : "P2021/P2022"}). Jalankan: npx prisma migrate deploy`,
      );
      return false;
    }
    throw e;
  }
}

async function main() {
  console.log("Start seeding...");

  // Create or get village
  let village = await prisma.village.findUnique({
    where: { code: "DESA001" },
  });

  if (!village) {
    village = await prisma.village.create({
      data: {
        code: "DESA001",
        name: "Desa Ujicoba",
        district: "Kecamatan Test",
        regency: "Kabupaten Test",
        province: "Provinsi Test",
        address: "Jalan Test No. 1",
        phone: "0851234567",
        email: "desa@test.id",
        isActive: true,
      },
    });
    console.log("✓ Village created:", village.code, village.name);
  } else {
    console.log("✓ Village already exists:", village.code, village.name);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash("123456", 10);

  // Create or get user
  let user = await prisma.user.findUnique({
    where: { email: "admin@test.id" },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "admin@test.id",
        password: hashedPassword,
        name: "Admin Desa",
        phone: "0851234567",
        role: "admin",
        villageId: village.id,
        isActive: true,
      },
    });
    console.log("✓ User created:", user.email);
  } else {
    console.log("✓ User already exists:", user.email);
  }

  let village2 = await prisma.village.findUnique({
    where: { code: "DESA002" },
  });
  if (!village2) {
    village2 = await prisma.village.create({
      data: {
        code: "DESA002",
        name: "Desa Ujicoba Dua",
        district: village.district,
        regency: village.regency,
        province: village.province,
        address: "Jalan Test No. 2",
        phone: "0851234568",
        email: "desa2@test.id",
        isActive: true,
      },
    });
    console.log("✓ Village 2 created:", village2.code, village2.name);
  } else {
    console.log("✓ Village 2 already exists:", village2.code, village2.name);
  }

  const regionalOk = await trySeedStep("Regional users", async () => {
    await prisma.regionalUser.upsert({
      where: { email: "kabupaten@test.id" },
      create: {
        email: "kabupaten@test.id",
        password: hashedPassword,
        name: "Admin Kabupaten Uji",
        role: "regional_kabupaten",
        scopeRegency: village.regency,
      },
      update: {
        password: hashedPassword,
        scopeRegency: village.regency,
        role: "regional_kabupaten",
        scopeDistrict: null,
      },
    });
    console.log("✓ Regional user (kabupaten): kabupaten@test.id");

    await prisma.regionalUser.upsert({
      where: { email: "kecamatan@test.id" },
      create: {
        email: "kecamatan@test.id",
        password: hashedPassword,
        name: "Admin Kecamatan Uji",
        role: "regional_kecamatan",
        scopeRegency: village.regency,
        scopeDistrict: village.district,
      },
      update: {
        password: hashedPassword,
        scopeRegency: village.regency,
        scopeDistrict: village.district,
        role: "regional_kecamatan",
      },
    });
    console.log("✓ Regional user (kecamatan): kecamatan@test.id");
  });

  // Create or update positions (Jabatan)
  const positionNames = [
    {
      name: "Kepala Desa",
      level: 1,
      description: "Kepala desa adalah pimpinan tertinggi di desa",
      salary: 5000000,
      allowance: 2000000,
    },
    {
      name: "Sekretaris Desa",
      level: 2,
      description: "Sekretaris desa membantu kepala desa dalam administrasi",
      salary: 3000000,
      allowance: 1500000,
    },
    {
      name: "Bendahara Desa",
      level: 2,
      description: "Bendahara desa mengurus keuangan desa",
      salary: 3000000,
      allowance: 1500000,
    },
    {
      name: "Kepala Urusan Umum",
      level: 3,
      description: "Kepala urusan umum mengelola hal-hal umum desa",
      salary: 2000000,
      allowance: 1000000,
    },
    {
      name: "Kepala Dusun",
      level: 4,
      description: "Kepala dusun adalah pimpinan di tingkat dusun",
      salary: 1500000,
      allowance: 500000,
    },
  ];

  const positions = await Promise.all(
    positionNames.map(async (pos) => {
      const existing = await prisma.position.findFirst({
        where: {
          villageId: village.id,
          name: pos.name,
        },
      });

      if (existing) {
        return existing;
      }

      return prisma.position.create({
        data: {
          villageId: village.id,
          name: pos.name,
          level: pos.level,
          description: pos.description,
          salary: pos.salary,
          allowance: pos.allowance,
          isActive: true,
        },
      });
    }),
  );

  console.log(
    `✓ ${positions.length} positions ready:`,
    positions.map((p) => ({ id: p.id, name: p.name, level: p.level })),
  );

  // Create or update officials (Perangkat Desa)
  const officialData = [
    {
      nik: "1234567890123456",
      name: "Joko Widodo",
      position: positions[0].id, // Kepala Desa
      birthplace: "Jakarta",
      birthDate: new Date("1970-06-21"),
      gender: "M",
      phone: "08123456789",
      email: "joko@desa.id",
      address: "Jalan Utama No. 1",
      startDate: new Date("2020-01-01"),
      education: "S1 Administrasi",
    },
    {
      nik: "1234567890123457",
      name: "Siti Nurhaliza",
      position: positions[1].id, // Sekretaris Desa
      birthplace: "Bandung",
      birthDate: new Date("1975-08-15"),
      gender: "F",
      phone: "08123456790",
      email: "siti@desa.id",
      address: "Jalan Utama No. 2",
      startDate: new Date("2020-02-01"),
      education: "S1 Administrasi",
    },
    {
      nik: "1234567890123458",
      name: "Ahmad Yani",
      position: positions[2].id, // Bendahara Desa
      birthplace: "Surabaya",
      birthDate: new Date("1980-03-20"),
      gender: "M",
      phone: "08123456791",
      email: "ahmad@desa.id",
      address: "Jalan Utama No. 3",
      startDate: new Date("2020-03-01"),
      education: "S1 Akuntansi",
    },
  ];

  const officials = await Promise.all(
    officialData.map(async (off) => {
      const existing = await prisma.official.findFirst({
        where: {
          nik: off.nik,
        },
      });

      if (existing) {
        return existing;
      }

      return prisma.official.create({
        data: {
          villageId: village.id,
          positionId: off.position,
          nik: off.nik,
          name: off.name,
          birthplace: off.birthplace,
          birthDate: off.birthDate,
          gender: off.gender,
          phone: off.phone,
          email: off.email,
          address: off.address,
          startDate: off.startDate,
          education: off.education,
          status: "active",
        },
      });
    }),
  );

  console.log(
    `✓ ${officials.length} officials ready:`,
    officials.map((o) => ({ id: o.id, name: o.name, position: o.positionId })),
  );

  // Create or update village potentials (Potensi Desa)
  const potentialData = [
    {
      year: "2024",
      population: 5420,
      households: 1340,
      area: 1250,
      agricultureLand: 450,
      plantationLand: 320,
      forestArea: 280,
      educationFacilities: 8,
      healthFacilities: 3,
      tourismSpots: 5,
      waterResources: "Sungai Bone, 3 Mata Air, 15 Sumur Bor",
      economicPotential:
        "Pertanian Padi, Perkebunan Kelapa Sawit, Peternakan Sapi, Kerajinan Tangan",
    },
    {
      year: "2023",
      population: 5280,
      households: 1310,
      area: 1250,
      agricultureLand: 445,
      plantationLand: 315,
      forestArea: 285,
      educationFacilities: 7,
      healthFacilities: 3,
      tourismSpots: 4,
      waterResources: "Sungai Bone, 3 Mata Air, 12 Sumur Bor",
      economicPotential:
        "Pertanian Padi, Perkebunan Kelapa Sawit, Peternakan Sapi",
    },
    {
      year: "2022",
      population: 5150,
      households: 1285,
      area: 1250,
      agricultureLand: 440,
      plantationLand: 310,
      forestArea: 290,
      educationFacilities: 7,
      healthFacilities: 2,
      tourismSpots: 3,
      waterResources: "Sungai Bone, 2 Mata Air, 10 Sumur Bor",
      economicPotential: "Pertanian Padi, Perkebunan Kelapa Sawit",
    },
  ];

  const villagePotentials = await Promise.all(
    potentialData.map(async (pot) => {
      const existing = await prisma.villagePotential.findFirst({
        where: {
          villageId: village.id,
          year: pot.year,
        },
      });

      if (existing) {
        return existing;
      }

      return prisma.villagePotential.create({
        data: {
          villageId: village.id,
          year: pot.year,
          population: pot.population,
          households: pot.households,
          area: pot.area,
          agricultureLand: pot.agricultureLand,
          plantationLand: pot.plantationLand,
          forestArea: pot.forestArea,
          educationFacilities: pot.educationFacilities,
          healthFacilities: pot.healthFacilities,
          tourismSpots: pot.tourismSpots,
          waterResources: pot.waterResources,
          economicPotential: pot.economicPotential,
        },
      });
    }),
  );

  console.log(
    `✓ ${villagePotentials.length} village potentials ready:`,
    villagePotentials.map((vp) => ({
      id: vp.id,
      year: vp.year,
      population: vp.population,
    })),
  );

  const catalogTemplates = catalogRowsForSeed();
  const catalogOk = await trySeedStep("Katalog mail template", async () => {
    for (const row of catalogTemplates) {
      await prisma.mailTemplate.upsert({
        where: { catalogKey: row.catalogKey },
        create: {
          catalogKey: row.catalogKey,
          villageId: null,
          isGlobal: true,
          name: row.name,
          description: row.description,
          category: row.category,
          templateStructure: row.templateStructure as Prisma.InputJsonValue,
          contentTemplate: row.contentTemplate,
          isActive: true,
        },
        update: {
          name: row.name,
          description: row.description,
          category: row.category,
          templateStructure: row.templateStructure as Prisma.InputJsonValue,
          contentTemplate: row.contentTemplate,
        },
      });
    }
    console.log(`✓ Katalog mail template: ${catalogTemplates.length}`);
  });

  const websiteOk = await trySeedStep(
    "Website templates & subscription",
    async () => {
      function websiteThemeDefaultsForSlug(slug: string): {
        primary?: string;
        accent?: string;
      } {
        switch (slug) {
          case "modern-village":
            return { primary: "#0f766e", accent: "#134e4a" };
          case "classic-heritage":
            return { primary: "#7c2d12", accent: "#431407" };
          case "professional-gov":
            return { primary: "#1e3a8a", accent: "#172554" };
          case "tourism-village":
            return { primary: "#be185d", accent: "#831843" };
          case "green-agriculture":
            return { primary: "#166534", accent: "#14532d" };
          case "smart-village":
            return { primary: "#4f46e5", accent: "#312e81" };
          default:
            return { primary: "#0f766e", accent: "#0f172a" };
        }
      }

      const websiteTemplates: Array<{
        name: string;
        slug: string;
        description: string;
        category: string;
        price: number;
        previewImage: string;
        thumbnailUrl: string;
        demoUrl?: string;
        badge?: "Popular" | "Recommended" | "Best Seller";
        isPremium?: boolean;
        isFeatured?: boolean;
        features: string[];
      }> = [
        {
          name: "Modern Village",
          slug: "modern-village",
          description:
            "Template modern dengan desain minimalis dan clean. Cocok untuk desa yang ingin tampil profesional.",
          category: "village",
          price: 1200000,
          previewImage:
            "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop",
          thumbnailUrl:
            "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop",
          demoUrl: "https://demo.modern-village.com",
          badge: "Popular",
          isFeatured: true,
          features: [
            "Responsive Design",
            "SEO Optimized",
            "Berita & Artikel",
            "Galeri Foto",
            "Profil Desa",
            "Layanan Online",
            "Kontak & Maps",
          ],
        },
        {
          name: "Classic Heritage",
          slug: "classic-heritage",
          description:
            "Desain klasik dengan nuansa tradisional yang elegan. Mempertahankan nilai budaya lokal.",
          category: "village",
          price: 1800000,
          previewImage:
            "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
          thumbnailUrl:
            "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
          badge: "Recommended",
          features: [
            "Responsive Design",
            "SEO Optimized",
            "Portal Berita",
            "Struktur Organisasi",
            "Data Kependudukan",
            "Potensi Desa",
            "Kontak Form",
          ],
        },
        {
          name: "Professional Gov",
          slug: "professional-gov",
          description:
            "Template profesional dengan tampilan formal untuk pemerintahan. Dilengkapi dashboard admin.",
          category: "village",
          price: 2000000,
          previewImage:
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
          thumbnailUrl:
            "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop",
          badge: "Best Seller",
          isPremium: true,
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
        },
        {
          name: "Tourism Village",
          slug: "tourism-village",
          description:
            "Khusus untuk desa wisata dengan galeri interaktif dan sistem booking. Tampilan menarik dan colorful.",
          category: "village",
          price: 1500000,
          previewImage:
            "https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=600&fit=crop",
          thumbnailUrl:
            "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop",
          features: [
            "Responsive Design",
            "SEO Optimized",
            "Booking System",
            "Virtual Tour 360°",
            "Galeri Premium",
            "Trip Advisor Integration",
            "Payment Gateway",
          ],
        },
        {
          name: "Green Agriculture",
          slug: "green-agriculture",
          description:
            "Template hijau natural untuk desa pertanian. Showcase produk dan hasil panen dengan elegan.",
          category: "village",
          price: 1200000,
          previewImage:
            "https://images.unsplash.com/photo-1560264280-88b68371db39?w=800&h=600&fit=crop",
          thumbnailUrl:
            "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
          features: [
            "Responsive Design",
            "SEO Optimized",
            "Product Catalog",
            "E-Commerce Ready",
            "Blog & Tips",
            "Weather Widget",
            "Harvest Calendar",
          ],
        },
        {
          name: "Smart Village",
          slug: "smart-village",
          description:
            "Template futuristik dengan integrasi IoT dan smart features. Untuk desa yang menuju digitalisasi penuh.",
          category: "village",
          price: 2500000,
          previewImage:
            "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop",
          thumbnailUrl:
            "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop",
          isPremium: true,
          features: [
            "Responsive Design",
            "SEO Optimized",
            "IoT Integration",
            "Real-time Monitoring",
            "Smart Dashboard",
            "Automation Features",
            "Advanced Security",
          ],
        },
      ];

      const storedTemplates = await Promise.all(
        websiteTemplates.map(async (row) => {
          const existing = await prisma.websiteTemplate.findFirst({
            where: { name: row.name },
          });

          const structure: Prisma.InputJsonValue = {
            version: 1,
            templateKey: row.slug,
            slug: row.slug,
            capabilities: mergeTemplateCapabilities(row.features),
            features: row.features,
            badge: row.badge,
            isPremium: Boolean(row.isPremium),
            defaults: {
              theme: websiteThemeDefaultsForSlug(row.slug),
            },
            presets:
              row.slug === "tourism-village"
                ? [
                    {
                      key: "wisata_highlight",
                      name: "Sorot Wisata",
                      structure: {
                        version: 1,
                        pages: {
                          home: {
                            sections: [
                              {
                                kind: "hero",
                                subtitle: "Selamat datang di desa wisata kami",
                              },
                              {
                                kind: "news",
                                limit: 4,
                                title: "Kegiatan & Berita",
                              },
                              { kind: "contact", show_map: true },
                            ],
                          },
                        },
                      },
                    },
                  ]
                : [],
            pages: {
              home: {
                sections: [
                  { kind: "hero" },
                  { kind: "news", limit: row.isPremium ? 10 : 6 },
                  { kind: "contact" },
                ],
              },
            },
          };

          if (existing) {
            return prisma.websiteTemplate.update({
              where: { id: existing.id },
              data: {
                description: row.description,
                category: row.category,
                price: row.price,
                subscriptionType: "yearly",
                previewImage: row.previewImage,
                thumbnailUrl: row.thumbnailUrl,
                demoUrl: row.demoUrl ?? null,
                structure,
                isActive: true,
                isFeatured: Boolean(row.isFeatured),
              },
            });
          }

          return prisma.websiteTemplate.create({
            data: {
              name: row.name,
              description: row.description,
              category: row.category,
              previewImage: row.previewImage,
              thumbnailUrl: row.thumbnailUrl,
              demoUrl: row.demoUrl ?? null,
              structure,
              price: row.price,
              subscriptionType: "yearly",
              isFeatured: Boolean(row.isFeatured),
              isActive: true,
            },
          });
        }),
      );

      const defaultTemplate =
        storedTemplates.find((t) => t.name === "Modern Village") ??
        storedTemplates[0];
      if (!defaultTemplate) return;

      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const existingSubscription = await prisma.websiteSubscription.findUnique({
        where: { villageId: village.id },
      });
      if (existingSubscription) {
        await prisma.websiteSubscription.update({
          where: { id: existingSubscription.id },
          data: {
            templateId: defaultTemplate.id,
            startDate,
            expiryDate,
            isActive: true,
            customDomain: null,
            customization: Prisma.DbNull,
          },
        });
      } else {
        await prisma.websiteSubscription.create({
          data: {
            villageId: village.id,
            templateId: defaultTemplate.id,
            startDate,
            expiryDate,
            isActive: true,
          },
        });
      }

      console.log(`✓ Website templates: ${storedTemplates.length}`);
      console.log(`✓ Website subscription active for village: ${village.code}`);
    },
  );

  console.log("\n✅ Seeding completed successfully!\n");
  console.log("📊 Summary:");
  console.log(`  • Village: ${village.code} - ${village.name}`);
  console.log(`  • Village 2: ${village2.code} - ${village2.name}`);
  console.log(`  • User: ${user.email} (Password: password123)`);
  console.log(
    regionalOk
      ? `  • Regional kabupaten: kabupaten@test.id | kecamatan: kecamatan@test.id (Password: 123456)`
      : `  • Regional users: dilewati (skema tidak lengkap — lihat peringatan di atas)`,
  );
  console.log(`  • Positions: ${positions.length}`);
  console.log(`  • Officials: ${officials.length}`);
  console.log(`  • Village Potentials: ${villagePotentials.length}`);
  console.log(
    catalogOk
      ? `  • Catalog mail templates: ${catalogTemplates.length}`
      : `  • Catalog mail templates: dilewati (skema tidak lengkap — lihat peringatan di atas)`,
  );
  console.log(
    websiteOk
      ? `  • Website templates: siap + subscription aktif`
      : `  • Website templates: dilewati (skema tidak lengkap — lihat peringatan di atas)`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
