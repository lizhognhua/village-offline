import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

// Read all settings (any logged-in user)
export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, string> = {};
    for (const c of configs) {
      settings[c.key] = c.value;
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update settings (admin only)
export async function PUT(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string") continue;
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
