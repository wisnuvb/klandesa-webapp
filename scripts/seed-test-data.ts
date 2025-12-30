import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Check if village already exists
    const existingVillage = await prisma.village.findUnique({
      where: { code: "DESA001" },
    });

    if (existingVillage) {
      console.log("✓ Village DESA001 already exists");
      return;
    }

    // Create village
    const village = await prisma.village.create({
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
    console.log("✓ Village created: DESA001 - Desa Ujicoba");

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create user
    const user = await prisma.user.create({
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
    console.log("✓ User created: admin@test.id");

    // Create positions
    const positions = await Promise.all([
      prisma.position.create({
        data: {
          code: "POS001",
          name: "Kepala Desa",
          level: 1,
          villageId: village.id,
        },
      }),
      prisma.position.create({
        data: {
          code: "POS002",
          name: "Sekretaris Desa",
          level: 2,
          villageId: village.id,
        },
      }),
      prisma.position.create({
        data: {
          code: "POS003",
          name: "Bendahara Desa",
          level: 2,
          villageId: village.id,
        },
      }),
      prisma.position.create({
        data: {
          code: "POS004",
          name: "Kepala Urusan Umum",
          level: 3,
          villageId: village.id,
        },
      }),
      prisma.position.create({
        data: {
          code: "POS005",
          name: "Kepala Dusun",
          level: 4,
          villageId: village.id,
        },
      }),
    ]);
    console.log(`✓ Positions created: ${positions.length}`);

    // Create officials
    const officials = await Promise.all([
      prisma.official.create({
        data: {
          name: "Budi Santoso",
          identityNumber: "1234567890123456",
          phoneNumber: "081234567890",
          villageId: village.id,
          positionId: positions[0].id,
        },
      }),
      prisma.official.create({
        data: {
          name: "Siti Nurhaliza",
          identityNumber: "1234567890123457",
          phoneNumber: "081234567891",
          villageId: village.id,
          positionId: positions[1].id,
        },
      }),
      prisma.official.create({
        data: {
          name: "Ahmad Wijaya",
          identityNumber: "1234567890123458",
          phoneNumber: "081234567892",
          villageId: village.id,
          positionId: positions[2].id,
        },
      }),
    ]);
    console.log(`✓ Officials created: ${officials.length}`);

    // Create village potentials
    const potentials = await Promise.all([
      prisma.villagePotential.create({
        data: {
          year: 2022,
          population: 5200,
          households: 1300,
          area: 1200,
          agricultureLand: 450,
          plantationLand: 320,
          forestArea: 270,
          educationFacilities: 7,
          healthFacilities: 2,
          tourismSpots: 5,
          waterResources: "Sungai Bone, 3 Mata Air, 15 Sumur Bor",
          economicPotential: "Pertanian, Perkebunan, Peternakan",
          villageId: village.id,
        },
      }),
      prisma.villagePotential.create({
        data: {
          year: 2023,
          population: 5400,
          households: 1350,
          area: 1220,
          agricultureLand: 455,
          plantationLand: 325,
          forestArea: 272,
          educationFacilities: 7,
          healthFacilities: 2,
          tourismSpots: 5,
          waterResources: "Sungai Bone, 3 Mata Air, 16 Sumur Bor",
          economicPotential: "Pertanian, Perkebunan, Peternakan, Wisata",
          villageId: village.id,
        },
      }),
      prisma.villagePotential.create({
        data: {
          year: 2024,
          population: 5500,
          households: 1375,
          area: 1240,
          agricultureLand: 460,
          plantationLand: 330,
          forestArea: 275,
          educationFacilities: 8,
          healthFacilities: 3,
          tourismSpots: 6,
          waterResources: "Sungai Bone, 4 Mata Air, 18 Sumur Bor",
          economicPotential:
            "Pertanian, Perkebunan, Peternakan, Wisata, Perikanan",
          villageId: village.id,
        },
      }),
    ]);
    console.log(`✓ Village Potentials created: ${potentials.length}`);

    console.log("\n✅ Seeding completed successfully!\n");
    console.log("📊 Total records created:");
    console.log("  • Villages: 1");
    console.log("  • Users: 1");
    console.log("  • Positions: 5");
    console.log("  • Officials: 3");
    console.log("  • Village Potentials: 3");
    console.log("\nTest Credentials:");
    console.log("  📧 Email: admin@test.id");
    console.log("  🔑 Password: password123");
    console.log("  🏘️  Village Code: DESA001");
  } catch (e) {
    console.error("❌ Error seeding database:", e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main();
