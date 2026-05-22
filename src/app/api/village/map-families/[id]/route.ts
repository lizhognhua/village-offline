import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    // Check team ownership
    const existing = await prisma.family.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const { latitude, longitude } = body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "无效的坐标" }, { status: 400 });
    }
    const family = await prisma.family.update({
      where: { id },
      data: { latitude, longitude },
    });
    return NextResponse.json({ family });
  } catch (error) {
    console.error("Map family PATCH error:", error);
    return NextResponse.json({ error: "更新坐标失败" }, { status: 500 });
  }
}
