import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    const session = await auth();
    const members = await prisma.partyMember.findMany({
      where, orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    let body = await req.json()
    body = sanitizeObject(body);
    if (!body.name) return NextResponse.json({ error: "缺少姓名" }, { status: 400 });
    const member = await prisma.partyMember.create({ data: body });
    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });
    const member = await prisma.partyMember.update({ where: { id }, data });
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
