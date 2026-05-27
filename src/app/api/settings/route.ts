import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { rules, clean } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Read settings (public, API keys only visible to admin)
export async function GET() {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === "admin";

    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, string> = {};
    for (const c of configs) {
      settings[c.key] = c.value;
    }
    // Filter out API keys for non-admin
    if (!isAdmin) {
      delete settings.tiandituKey;
      delete settings.amapKey;
      delete settings.qweatherKey;
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// Update settings (admin only)
export async function PUT(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const body = await req.json();
    const vErr = rules.settings(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    for (let [key, value] of Object.entries(body)) {
      if (typeof value !== "string") continue;
      // 清理
      if (key === "villageSecretary" || key === "teamName") value = clean.name(value) || "";
      if (key === "villageName" || key === "township" || key === "shortName") value = clean.placeName(value) || "";
      if (key === "secretaryPhone" || key === "contactPhone") value = clean.phone(value) || "";
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
