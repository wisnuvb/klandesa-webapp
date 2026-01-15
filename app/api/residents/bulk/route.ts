/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import {
  getMaritalStatus,
  parseEducation,
  parseJob,
  parseFamilyRole,
  parseReligion,
} from "@/utils";
import bcrypt from "bcryptjs";
import { authOptions } from "@/auth";

// Route config for large payloads
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// Constants
const MAX_BATCH_SIZE = 50000;
const CHUNK_SIZE = 1000; // Process in chunks to avoid memory issues
const TRANSACTION_TIMEOUT = 300000; // 5 minutes

// function mapFamilyRole(id: string) {
//   switch (id) {
//     case "1":
//       return "Kepala Keluarga";
//     case "2":
//       return "Istri";
//     case "3":
//       return "Anak";
//     default:
//       return "Anggota";
//   }
// }

// function mapReligionId(id: string) {
//   const map: Record<string, string> = {
//     "1": "Islam",
//     "2": "Kristen",
//     "3": "Katolik",
//     "4": "Hindu",
//     "5": "Buddha",
//     "6": "Konghucu",
//   };
//   return map[id] ?? id;
// }

async function resolveVillage(session?: any) {
  if (!session?.user?.villageCode) {
    return null;
  }

  const village = await prisma.village.findUnique({
    where: { code: session.user.villageCode },
  });

  return village;
}

function validateResidentData(row: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!row.name?.toString().trim()) {
    errors.push("Nama harus diisi");
  }
  // if (!row.id_number?.toString().trim()) {
  //   errors.push("NIK harus diisi");
  // } else if (row.id_number.toString().length !== 16) {
  //   errors.push("NIK harus 16 digit");
  // }
  // if (!row.birthplace?.toString().trim()) {
  //   errors.push("Tempat lahir harus diisi");
  // }
  // if (!row.date_of_birth?.toString().trim()) {
  //   errors.push("Tanggal lahir harus diisi");
  // } else {
  //   // Validate date format
  //   const date = new Date(row.date_of_birth);
  //   if (isNaN(date.getTime())) {
  //     errors.push("Format tanggal tidak valid (gunakan YYYY-MM-DD)");
  //   }
  // }
  // if (
  //   !row.gender?.toString().trim() ||
  //   !["Laki-laki", "Perempuan"].includes(row.gender.toString().trim())
  // ) {
  //   errors.push("Jenis kelamin harus Laki-laki atau Perempuan");
  // }
  // if (!row.address?.toString().trim()) {
  //   errors.push("Alamat harus diisi");
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function parseYN(val: any): boolean {
  const s = (val ?? "").toString().trim().toUpperCase();
  if (s === "Y") return true;
  if (s === "N") return false;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Anda harus login terlebih dahulu" },
        { status: 401 }
      );
    }

    const village = await resolveVillage(session);
    if (!village) {
      return NextResponse.json(
        { error: "Desa tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { residents } = body;

    if (!Array.isArray(residents) || residents.length === 0) {
      return NextResponse.json(
        { error: "Data warga harus diisi minimal 1 baris" },
        { status: 400 }
      );
    }

    if (residents.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Maksimal upload ${MAX_BATCH_SIZE} data sekaligus. Data Anda: ${residents.length}`,
        },
        { status: 400 }
      );
    }

    // Validate all rows first
    const validationResults = residents.map((row) => validateResidentData(row));

    const invalidRows = validationResults
      .map((result, idx) => ({ idx, ...result }))
      .filter((r) => !r.valid);

    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          error: "Data tidak valid",
          invalidRows: invalidRows.map((r) => ({
            rowNumber: r.idx + 1,
            errors: r.errors,
          })),
        },
        { status: 400 }
      );
    }

    // Check for duplicate NIK within the batch (currently disabled)
    // const niks = residents.map((r) => r.id_number?.toString().trim());
    // const duplicateNiks = niks.filter((n, i) => niks.indexOf(n) !== i);
    // if (duplicateNiks.length > 0) {
    //   return NextResponse.json(
    //     {
    //       error: `NIK duplikat dalam data: ${[...new Set(duplicateNiks)].join(
    //         ", "
    //       )}`,
    //     },
    //     { status: 400 }
    //   );
    // }

    // Check for existing NIK in database
    // const existingNiks = await prisma.resident.findMany({
    //   where: {
    //     villageId: village.id,
    //     nik: { in: niks },
    //   },
    //   select: { nik: true },
    // });

    // const existingNikSet = new Set(existingNiks.map((r) => r.nik));
    // if (existingNikSet.size > 0) {
    //   return NextResponse.json(
    //     {
    //       error: `NIK sudah terdaftar: ${[...existingNikSet].join(", ")}`,
    //     },
    //     { status: 400 }
    //   );
    // }

    // Prepare resident data for bulk insert
    const residentsData = residents.map((row) => {
      // Validate and sanitize birthDate
      let birthDate = new Date();
      try {
        const parsedDate = new Date(row.date_of_birth);
        const year = parsedDate.getFullYear();
        // Only use if year is in valid range (1900-2100)
        if (!isNaN(parsedDate.getTime()) && year >= 1900 && year <= 2100) {
          birthDate = parsedDate;
        }
      } catch {
        // Invalid date, use today
        birthDate = new Date();
      }

      return {
        villageId: village.id,
        nik: row.id_number?.toString().trim() || "",
        kk: row.family_card_number?.toString().trim() || null,
        name: row.name?.toString().trim() || "",
        birthplace: row.birthplace?.toString().trim() || "",
        birthDate: birthDate,
        gender: row.gender?.toString().trim() || "",
        bloodType: row.blood_type_id?.toString().trim() || null,
        religion: parseReligion(row.religion_id || ""),
        maritalStatus: getMaritalStatus(row.marital_status?.toString() || ""),
        familyRole: parseFamilyRole(row.status_family_id || ""),
        address: row.address?.toString().trim() || "",
        rt: row.rt?.toString().trim() || null,
        rw: row.rw?.toString().trim() || null,
        hamlet: row.hamlet?.toString().trim() || null,
        occupation: parseJob(row.job_id || ""),
        education: parseEducation(row.education_id || ""),
        nationality: "Indonesia",
        phone: row.phone_number?.toString().trim() || null,
        email: row.email?.toString().trim() || null,
        isAlive: true,
        fatherNik: row.father_nik?.toString().trim() || null,
        fatherName: row.father_name?.toString().trim() || null,
        motherNik: row.mother_nik?.toString().trim() || null,
        motherName: row.mother_name?.toString().trim() || null,
        isIlliterate: parseYN(row.is_illiterate),
        isDisability: parseYN(row.is_disability),
        disabilityId: row.disability_id ? Number(row.disability_id) : null,
        otherDisability: row.other_disability?.toString().trim() || null,
        isPregnant: parseYN(row.is_pregnant),
        datePregnant: row.date_pregnant ? new Date(row.date_pregnant) : null,
        isBreastfeeding: parseYN(row.is_breastfeeding),
        isStunting: parseYN(row.is_stunting),
        isBpjsKis: parseYN(row.is_bpjs_kis),
        contraception: row.contraception?.toString().trim() || null,
        height: row.height ? Number(row.height) : null,
        weight: row.weight ? Number(row.weight) : null,
        income: row.income ? Number(row.income) : null,
        cover: row.cover?.toString().trim() || null,
        coverThumb: row.cover_thumb?.toString().trim() || null,
        photo: row.photo?.toString().trim() || null,
        photoThumb: row.photo_thumb?.toString().trim() || null,
        countryCode: row.country_code?.toString().trim() || null,
        tempIdNumber: row.temp_id_number?.toString().trim() || null,
        tempRt: row.temp_rt?.toString().trim() || null,
        houseOwnership: row.house_ownership?.toString().trim() || null,
        desil: row.desil?.toString().trim() || null,
      };
    });

    // Bulk insert residents in chunks with extended timeout
    let totalResidentsCreated = 0;
    const result = await prisma.$transaction(
      async (tx) => {
        // Process residents in chunks
        for (let i = 0; i < residentsData.length; i += CHUNK_SIZE) {
          const chunk = residentsData.slice(i, i + CHUNK_SIZE);
          await tx.resident.createMany({
            data: chunk,
            skipDuplicates: true, // Skip duplicate NIK automatically
          });
          totalResidentsCreated += chunk.length;
        }

        // Prepare users with email
        const usersToCreate = residents
          .filter((row) => row.email?.toString().trim())
          .map((row) => ({
            email: row.email.toString().trim(),
            name: row.name?.toString().trim() || "",
          }));

        // Get existing users to avoid duplicates
        const existingEmails = await tx.user.findMany({
          where: {
            email: { in: usersToCreate.map((u) => u.email) },
          },
          select: { email: true },
        });

        const existingEmailSet = new Set(existingEmails.map((u) => u.email));
        const newUsers = usersToCreate.filter(
          (u) => !existingEmailSet.has(u.email)
        );

        // Hash passwords in parallel (limit concurrency to avoid memory issues)
        const HASH_BATCH_SIZE = 100;
        const usersWithHashedPasswords: any[] = [];

        for (let i = 0; i < newUsers.length; i += HASH_BATCH_SIZE) {
          const batch = newUsers.slice(i, i + HASH_BATCH_SIZE);
          const hashedBatch = await Promise.all(
            batch.map(async (user) => {
              const tempPassword =
                Math.random().toString(36).slice(-10) + "!A1";
              const hashed = await bcrypt.hash(tempPassword, 10);
              return {
                email: user.email,
                password: hashed,
                name: user.name,
                role: "citizen",
              };
            })
          );
          usersWithHashedPasswords.push(...hashedBatch);
        }

        // Bulk insert users in chunks
        let totalUsersCreated = 0;
        for (let i = 0; i < usersWithHashedPasswords.length; i += CHUNK_SIZE) {
          const chunk = usersWithHashedPasswords.slice(i, i + CHUNK_SIZE);
          await tx.user.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          totalUsersCreated += chunk.length;
        }

        return {
          residentsCreated: totalResidentsCreated,
          usersCreated: totalUsersCreated,
        };
      },
      {
        maxWait: TRANSACTION_TIMEOUT,
        timeout: TRANSACTION_TIMEOUT,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil mengupload ${result.residentsCreated} data warga`,
        data: {
          residentsCreated: result.residentsCreated,
          usersCreated: result.usersCreated,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/residents/bulk error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal upload data" },
      { status: 500 }
    );
  }
}
