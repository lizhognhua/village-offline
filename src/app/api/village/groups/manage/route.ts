import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await prisma.villageGroup.findMany({
      where: {},
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { families: true } } },
    });
    return NextResponse.json({ groups });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const body = sanitizeObject(await req.json());
    if (!body.name) return NextResponse.json({ error: "请输入屯组名称" }, { status: 400 });
    const group = await prisma.villageGroup.create({
      data: {
        name: body.name,
        type: body.type || "tun",
        sortOrder: parseInt(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const body = sanitizeObject(await req.json());
    if (!body.id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });
    // Check team ownership
    const existing = await prisma.villageGroup.findUnique({ where: { id: body.id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    const group = await prisma.villageGroup.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.sortOrder !== undefined && { sortOrder: parseInt(body.sortOrder) || 0 }),
      },
    });
    return NextResponse.json({ group });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    var url = new URL(req.url);
    var id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });
    // Check team ownership
    const existing = await prisma.villageGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.villageGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
