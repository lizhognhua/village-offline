import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { requireAdmin } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const where: any = { isActive: true };

    const members = await prisma.teamMember.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const member = await prisma.teamMember.create({ data: body });
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
