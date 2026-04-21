import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

// GET /api/residents/[id] - Get single resident by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.villageId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await prisma.village.findUnique({
      where: { id: session.user.villageId },
      select: { subscriptionStatus: true, subscriptionExpiry: true },
    });
    if (village && !isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const resident = await prisma.resident.findFirst({
      where: {
        id,
        villageId: session.user.villageId,
      },
    });

    if (!resident) {
      return NextResponse.json(
        { error: "Resident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(resident);
  } catch (error) {
    console.error("Error fetching resident:", error);
    return NextResponse.json(
      { error: "Failed to fetch resident" },
      { status: 500 }
    );
  }
}

// PUT /api/residents/[id] - Update resident
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.villageId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await prisma.village.findUnique({
      where: { id: session.user.villageId },
      select: { subscriptionStatus: true, subscriptionExpiry: true },
    });
    if (village && !isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();

    // Verify resident exists and belongs to this village
    const existing = await prisma.resident.findFirst({
      where: {
        id,
        villageId: session.user.villageId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Resident not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!body.nik?.trim() || body.nik.length !== 16) {
      return NextResponse.json(
        { error: "NIK must be 16 digits" },
        { status: 400 }
      );
    }

    if (!body.birthplace?.trim()) {
      return NextResponse.json(
        { error: "Birthplace is required" },
        { status: 400 }
      );
    }

    if (!body.birthDate) {
      return NextResponse.json(
        { error: "Birth date is required" },
        { status: 400 }
      );
    }

    if (!body.address?.trim()) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Check if NIK is already used by another resident
    if (body.nik !== existing.nik) {
      const nikExists = await prisma.resident.findFirst({
        where: {
          nik: body.nik,
          villageId: session.user.villageId,
          id: { not: id },
        },
      });

      if (nikExists) {
        return NextResponse.json(
          { error: "NIK already exists" },
          { status: 400 }
        );
      }
    }

    // Update resident
    const updated = await prisma.resident.update({
      where: { id },
      data: {
        name: body.name.trim(),
        nik: body.nik.trim(),
        kk: body.kk?.trim() || null,
        gender: body.gender,
        birthplace: body.birthplace.trim(),
        birthDate: new Date(body.birthDate),
        bloodType: body.bloodType || null,
        religion: body.religion || existing.religion,
        maritalStatus: body.maritalStatus || existing.maritalStatus,
        familyRole: body.familyRole || existing.familyRole,
        address: body.address.trim(),
        rt: body.rt?.trim() || null,
        rw: body.rw?.trim() || null,
        hamlet: body.hamlet?.trim() || null,
        occupation: body.occupation || null,
        education: body.education || null,
        nationality: body.nationality?.trim() || existing.nationality,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        isAlive: body.isAlive !== undefined ? body.isAlive : existing.isAlive,
        moveDate: body.moveDate ? new Date(body.moveDate) : null,
        deathDate: body.deathDate ? new Date(body.deathDate) : null,
        // Family
        fatherNik: body.fatherNik?.trim() || existing.fatherNik,
        fatherName: body.fatherName?.trim() || existing.fatherName,
        motherNik: body.motherNik?.trim() || existing.motherNik,
        motherName: body.motherName?.trim() || existing.motherName,
        // Health & Social
        isIlliterate:
          body.isIlliterate !== undefined
            ? !!body.isIlliterate
            : existing.isIlliterate,
        isDisability:
          body.isDisability !== undefined
            ? !!body.isDisability
            : existing.isDisability,
        disabilityId:
          body.disabilityId !== undefined
            ? Number(body.disabilityId) || null
            : existing.disabilityId,
        otherDisability:
          body.otherDisability?.trim() || existing.otherDisability,
        isPregnant:
          body.isPregnant !== undefined
            ? !!body.isPregnant
            : existing.isPregnant,
        datePregnant: body.datePregnant
          ? new Date(body.datePregnant)
          : existing.datePregnant,
        isBreastfeeding:
          body.isBreastfeeding !== undefined
            ? !!body.isBreastfeeding
            : existing.isBreastfeeding,
        isStunting:
          body.isStunting !== undefined
            ? !!body.isStunting
            : existing.isStunting,
        isBpjsKis:
          body.isBpjsKis !== undefined ? !!body.isBpjsKis : existing.isBpjsKis,
        contraception: body.contraception?.trim() || existing.contraception,
        height:
          body.height !== undefined
            ? Number(body.height) || null
            : existing.height,
        weight:
          body.weight !== undefined
            ? Number(body.weight) || null
            : existing.weight,
        income:
          body.income !== undefined
            ? Number(body.income) || null
            : existing.income,
        // Media
        cover: body.cover?.trim() || existing.cover,
        coverThumb: body.coverThumb?.trim() || existing.coverThumb,
        photo: body.photo?.trim() || existing.photo,
        photoThumb: body.photoThumb?.trim() || existing.photoThumb,
        // Misc
        countryCode: body.countryCode?.trim() || existing.countryCode,
        tempIdNumber: body.tempIdNumber?.trim() || existing.tempIdNumber,
        tempRt: body.tempRt?.trim() || existing.tempRt,
        houseOwnership: body.houseOwnership?.trim() || existing.houseOwnership,
        desil: body.desil?.trim() || existing.desil,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating resident:", error);
    return NextResponse.json(
      { error: "Failed to update resident" },
      { status: 500 }
    );
  }
}

// PATCH /api/residents/[id] - Partially update resident
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.villageId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();

    // Verify resident exists and belongs to this village
    const existing = await prisma.resident.findFirst({
      where: {
        id,
        villageId: session.user.villageId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Resident not found" },
        { status: 404 }
      );
    }

    // Conditional validations only for provided fields
    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (body.nik !== undefined) {
      const nik = String(body.nik).trim();
      if (!nik || nik.length !== 16) {
        return NextResponse.json(
          { error: "NIK must be 16 digits" },
          { status: 400 }
        );
      }
      if (nik !== existing.nik) {
        const nikExists = await prisma.resident.findFirst({
          where: {
            nik,
            villageId: session.user.villageId,
            id: { not: id },
          },
        });
        if (nikExists) {
          return NextResponse.json(
            { error: "NIK already exists" },
            { status: 400 }
          );
        }
      }
    }

    if (body.birthplace !== undefined && !String(body.birthplace).trim()) {
      return NextResponse.json(
        { error: "Birthplace is required" },
        { status: 400 }
      );
    }

    if (body.birthDate !== undefined && !body.birthDate) {
      return NextResponse.json(
        { error: "Birth date is required" },
        { status: 400 }
      );
    }

    if (body.address !== undefined && !String(body.address).trim()) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Build partial update data preserving existing where undefined
    const updated = await prisma.resident.update({
      where: { id },
      data: {
        name:
          body.name !== undefined ? String(body.name).trim() : existing.name,
        nik: body.nik !== undefined ? String(body.nik).trim() : existing.nik,
        kk:
          body.kk !== undefined ? String(body.kk).trim() || null : existing.kk,
        gender: body.gender !== undefined ? body.gender : existing.gender,
        birthplace:
          body.birthplace !== undefined
            ? String(body.birthplace).trim()
            : existing.birthplace,
        birthDate:
          body.birthDate !== undefined
            ? new Date(body.birthDate)
            : existing.birthDate,
        bloodType:
          body.bloodType !== undefined
            ? body.bloodType || null
            : existing.bloodType,
        religion:
          body.religion !== undefined ? body.religion : existing.religion,
        maritalStatus:
          body.maritalStatus !== undefined
            ? body.maritalStatus
            : existing.maritalStatus,
        familyRole:
          body.familyRole !== undefined ? body.familyRole : existing.familyRole,
        address:
          body.address !== undefined
            ? String(body.address).trim()
            : existing.address,
        rt:
          body.rt !== undefined ? String(body.rt).trim() || null : existing.rt,
        rw:
          body.rw !== undefined ? String(body.rw).trim() || null : existing.rw,
        hamlet:
          body.hamlet !== undefined
            ? String(body.hamlet).trim() || null
            : existing.hamlet,
        occupation:
          body.occupation !== undefined ? body.occupation : existing.occupation,
        education:
          body.education !== undefined ? body.education : existing.education,
        nationality:
          body.nationality !== undefined
            ? String(body.nationality).trim()
            : existing.nationality,
        phone:
          body.phone !== undefined
            ? String(body.phone).trim() || null
            : existing.phone,
        email:
          body.email !== undefined
            ? String(body.email).trim() || null
            : existing.email,
        isAlive: body.isAlive !== undefined ? !!body.isAlive : existing.isAlive,
        moveDate:
          body.moveDate !== undefined
            ? body.moveDate
              ? new Date(body.moveDate)
              : null
            : existing.moveDate,
        deathDate:
          body.deathDate !== undefined
            ? body.deathDate
              ? new Date(body.deathDate)
              : null
            : existing.deathDate,
        // Family
        fatherNik:
          body.fatherNik !== undefined
            ? String(body.fatherNik).trim() || null
            : existing.fatherNik,
        fatherName:
          body.fatherName !== undefined
            ? String(body.fatherName).trim() || null
            : existing.fatherName,
        motherNik:
          body.motherNik !== undefined
            ? String(body.motherNik).trim() || null
            : existing.motherNik,
        motherName:
          body.motherName !== undefined
            ? String(body.motherName).trim() || null
            : existing.motherName,
        // Health & Social
        isIlliterate:
          body.isIlliterate !== undefined
            ? !!body.isIlliterate
            : existing.isIlliterate,
        isDisability:
          body.isDisability !== undefined
            ? !!body.isDisability
            : existing.isDisability,
        disabilityId:
          body.disabilityId !== undefined
            ? Number(body.disabilityId) || null
            : existing.disabilityId,
        otherDisability:
          body.otherDisability !== undefined
            ? String(body.otherDisability).trim() || null
            : existing.otherDisability,
        isPregnant:
          body.isPregnant !== undefined
            ? !!body.isPregnant
            : existing.isPregnant,
        datePregnant:
          body.datePregnant !== undefined
            ? body.datePregnant
              ? new Date(body.datePregnant)
              : null
            : existing.datePregnant,
        isBreastfeeding:
          body.isBreastfeeding !== undefined
            ? !!body.isBreastfeeding
            : existing.isBreastfeeding,
        isStunting:
          body.isStunting !== undefined
            ? !!body.isStunting
            : existing.isStunting,
        isBpjsKis:
          body.isBpjsKis !== undefined ? !!body.isBpjsKis : existing.isBpjsKis,
        contraception:
          body.contraception !== undefined
            ? String(body.contraception).trim() || null
            : existing.contraception,
        height:
          body.height !== undefined
            ? Number(body.height) || null
            : existing.height,
        weight:
          body.weight !== undefined
            ? Number(body.weight) || null
            : existing.weight,
        income:
          body.income !== undefined
            ? Number(body.income) || null
            : existing.income,
        // Media
        cover:
          body.cover !== undefined
            ? String(body.cover).trim() || null
            : existing.cover,
        coverThumb:
          body.coverThumb !== undefined
            ? String(body.coverThumb).trim() || null
            : existing.coverThumb,
        photo:
          body.photo !== undefined
            ? String(body.photo).trim() || null
            : existing.photo,
        photoThumb:
          body.photoThumb !== undefined
            ? String(body.photoThumb).trim() || null
            : existing.photoThumb,
        // Misc
        countryCode:
          body.countryCode !== undefined
            ? String(body.countryCode).trim() || null
            : existing.countryCode,
        tempIdNumber:
          body.tempIdNumber !== undefined
            ? String(body.tempIdNumber).trim() || null
            : existing.tempIdNumber,
        tempRt:
          body.tempRt !== undefined
            ? String(body.tempRt).trim() || null
            : existing.tempRt,
        houseOwnership:
          body.houseOwnership !== undefined
            ? String(body.houseOwnership).trim() || null
            : existing.houseOwnership,
        desil:
          body.desil !== undefined
            ? String(body.desil).trim() || null
            : existing.desil,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error patching resident:", error);
    return NextResponse.json(
      { error: "Failed to update resident" },
      { status: 500 }
    );
  }
}

// DELETE /api/residents/[id] - Delete resident
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.villageId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify resident exists and belongs to this village
    const existing = await prisma.resident.findFirst({
      where: {
        id,
        villageId: session.user.villageId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Resident not found" },
        { status: 404 }
      );
    }

    // Delete resident
    await prisma.resident.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Resident deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting resident:", error);
    return NextResponse.json(
      { error: "Failed to delete resident" },
      { status: 500 }
    );
  }
}
