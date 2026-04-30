import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const year = searchParams.get("year") || "";

    const skip = (page - 1) * pageSize;

    const where: any = {
      villageId: village.id,
    };

    if (search) {
      where.OR = [
        { year: { contains: search } },
        { economicPotential: { contains: search } },
        { waterResources: { contains: search } },
      ];
    }

    if (year && year !== "all") {
      where.year = year;
    }

    const [rows, total] = await Promise.all([
      prisma.villagePotential.findMany({
        where,
        orderBy: { year: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.villagePotential.count({ where }),
    ]);

    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching village potentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch village potentials" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const body = await req.json();

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const requiredFields = [
      "year",
      "population",
      "households",
      "area",
      "agricultureLand",
      "plantationLand",
      "forestArea",
    ];

    for (const field of requiredFields) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ""
      ) {
        return NextResponse.json(
          { error: `Field ${field} is required` },
          { status: 400 },
        );
      }
    }

    const existing = await prisma.villagePotential.findUnique({
      where: {
        villageId_year: {
          villageId: village.id,
          year: body.year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Data for year ${body.year} already exists` },
        { status: 400 },
      );
    }

    const villagePotential = await prisma.villagePotential.create({
      data: {
        villageId: village.id,
        year: body.year,
        population: parseInt(body.population),
        households: parseInt(body.households),
        area: parseFloat(body.area),
        agricultureLand: parseFloat(body.agricultureLand),
        plantationLand: parseFloat(body.plantationLand),
        forestArea: parseFloat(body.forestArea),
        educationFacilities: parseInt(body.educationFacilities || 0),
        healthFacilities: parseInt(body.healthFacilities || 0),
        tourismSpots: parseInt(body.tourismSpots || 0),
        waterResources: body.waterResources || null,
        economicPotential: body.economicPotential || null,
      },
    });

    return NextResponse.json(villagePotential, { status: 201 });
  } catch (error) {
    console.error("Error creating village potential:", error);
    return NextResponse.json(
      { error: "Failed to create village potential" },
      { status: 500 },
    );
  }
}
