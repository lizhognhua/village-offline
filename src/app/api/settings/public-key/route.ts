import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public API key endpoint (no auth needed — returns non-sensitive keys)
export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, string> = {};
    for (const c of configs) {
      settings[c.key] = c.value;
    }

    if (key) {
      return NextResponse.json({ value: settings[key] || "" });
    }
    // Only return public keys
    return NextResponse.json({
      tiandituKey: settings.tiandituKey || "",
      amapKey: settings.amapKey || "",
    });
  } catch {
    return NextResponse.json({ tiandituKey: "", amapKey: "" });
  }
}
