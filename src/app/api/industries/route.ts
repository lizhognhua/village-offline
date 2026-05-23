import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const where: any = {};
    const industries = await prisma.industry.findMany({ where, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(industries);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const industry = await prisma.industry.create({
      data: {
        createdById: a.session.user.id,
        name: body.name, description: body.description, detail: body.detail,
        photos: body.images || body.photos || "[]", startDate: body.startDate ? new Date(body.startDate) : null,
        status: body.status || "进行中", scale: body.scale, benefit: body.benefit,
        icon: body.icon, sortOrder: parseInt(body.sortOrder) || 0,
      },
    });
    return NextResponse.json(industry, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

