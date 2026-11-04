import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";

/**
 * Izin efektif akun yang sedang masuk (role + penyesuaian per akun) dari DB, untuk menu/halaman di klien.
 * Menggantikan data yang dulu dititipkan layout server saat render HTML; sekarang shell statis memintanya sekali per muat.
 * Hanya mengembalikan milik pemanggil sendiri. Penegakan izin sesungguhnya tetap di setiap API.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { dbUser } = loaded.ctx;
    return NextResponse.json(
      { role: dbUser.role, permissionOverrides: dbUser.permissionOverrides ?? null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("GET /api/account/permissions error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
