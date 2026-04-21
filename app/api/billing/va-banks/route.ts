import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { LINKQU_VA_CHANNELS } from "@/lib/payment/linkqu-channels";

/** Daftar bank VA (Linkqu) untuk UI checkout — butuh sesi agar tidak diekspos sembarangan. */
export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banks = LINKQU_VA_CHANNELS.filter((c) => c.enabled).map((c) => ({
      id: c.id,
      label: c.label,
      linkquBankCode: c.linkquBankCode,
    }));

    return NextResponse.json({ banks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
