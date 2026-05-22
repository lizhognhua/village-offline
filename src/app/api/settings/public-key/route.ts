import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public API key endpoint (no auth needed — only returns whitelisted keys)
const ALLOWED_KEYS = ["tiandituKey", "amapKey"];

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, string> = {};
    for (const c of configs) {
      settings[c.key] = c.value;
    }

    if (key) {
      if (!ALLOWED_KEYS.includes(key)) {
        return NextResponse.json({ error: "不允许查询此密钥" }, { status: 403 });
      }
      return NextResponse.json({ value: settings[key] || "" });
    }
    return NextResponse.json({
      tiandituKey: settings.tiandituKey || "",
      amapKey: settings.amapKey || "",
    });
  } catch {
    return NextResponse.json({ tiandituKey: "", amapKey: "" });
  }
}
