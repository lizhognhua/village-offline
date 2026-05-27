import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rules } from "@/lib/validators";
import { requireAuth } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    const session = await auth();

    // 从 PartyMember 表查询
    const partyMembers = await prisma.partyMember.findMany({
      where, orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    // 从 Family 表查询标记为"党员"的农户，作为虚拟党员
    const familyWhere: any = { familyAttr: { contains: "党员" } };
    if (search) familyWhere.headName = { contains: search, mode: "insensitive" };
    const taggedFamilies = await prisma.family.findMany({
      where: familyWhere,
      select: { id: true, headName: true, headPhone: true, headGender: true, address: true, group: { select: { name: true } } },
    });

    // 合并：PartyMember 优先，Family 标记的转换为 PartyMember 格式
    const existingNames = new Set(partyMembers.map(m => m.name));
    const virtualMembers = taggedFamilies
      .filter(f => !existingNames.has(f.headName))
      .map(f => ({
        id: f.id,
        name: f.headName,
        gender: f.headGender || null,
        phone: f.headPhone || null,
        address: f.address || null,
        ethnicity: null,
        education: null,
        joinDate: null,
        avatar: null,
        note: "（来自农户标记）",
        isActive: true,
        _virtual: true, // 标记为虚拟记录
      }));

    const members = [...partyMembers, ...virtualMembers];
    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    let body = await req.json()
    body = sanitizeObject(body);
    if (!body.name) return NextResponse.json({ error: "缺少姓名" }, { status: 400 });
    const member = await prisma.partyMember.create({ data: body });
    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });
    const member = await prisma.partyMember.update({ where: { id }, data });
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
