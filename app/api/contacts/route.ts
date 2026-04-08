import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

function firstIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          name?: string;
          email?: string;
          phone?: string;
          subject?: string;
          message?: string;
        }
      | null;

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "name, email, subject, message wajib diisi" },
        { status: 400 }
      );
    }

    const created = await prisma.contact.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        source: "landing",
        ipAddress: firstIp(req),
        userAgent: req.headers.get("user-agent"),
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json(
      { ok: true, id: String(created.id), createdAt: created.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const responded = url.searchParams.get("responded");
    const respondedFilter =
      responded === "true" ? true : responded === "false" ? false : undefined;

    const rows = await prisma.contact.findMany({
      where: respondedFilter == null ? undefined : { isResponded: respondedFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        isResponded: true,
        respondedAt: true,
        respondedByUserId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      contacts: rows.map((c) => ({
        id: String(c.id),
        name: c.name,
        email: c.email,
        phone: c.phone,
        subject: c.subject,
        message: c.message,
        isResponded: c.isResponded,
        respondedAt: c.respondedAt?.toISOString() ?? null,
        respondedByUserId: c.respondedByUserId,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

