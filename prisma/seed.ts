import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
  const hashedPassword = await bcrypt.hash("password123", 10);

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
    })
  );

  console.log(
    `✓ ${positions.length} positions ready:`,
    positions.map((p) => ({ id: p.id, name: p.name, level: p.level }))
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
    })
  );

  console.log(
    `✓ ${officials.length} officials ready:`,
    officials.map((o) => ({ id: o.id, name: o.name, position: o.positionId }))
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
    })
  );

  console.log(
    `✓ ${villagePotentials.length} village potentials ready:`,
    villagePotentials.map((vp) => ({
      id: vp.id,
      year: vp.year,
      population: vp.population,
    }))
  );

  console.log("\n✅ Seeding completed successfully!\n");
  console.log("📊 Summary:");
  console.log(`  • Village: ${village.code} - ${village.name}`);
  console.log(`  • User: ${user.email} (Password: password123)`);
  console.log(`  • Positions: ${positions.length}`);
  console.log(`  • Officials: ${officials.length}`);
  console.log(`  • Village Potentials: ${villagePotentials.length}`);
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
