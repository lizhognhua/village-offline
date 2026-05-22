import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  try {
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    const session = await auth();
    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: { _count: { select: { milestones: true, activities: true } } },
    });
    return NextResponse.json(projects);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const project = await prisma.project.create({ data: body });
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}