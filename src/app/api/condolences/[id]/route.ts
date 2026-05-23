import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const condolence = await prisma.condolence.findUnique({
      where: { id }, include: { family: { select: { headName: true, familyAttr: true } } },
    });
    if (!condolence) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(condolence);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const existing = await prisma.condolence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const condolence = await prisma.condolence.update({
      where: { id },
      data: {
        condolenceDate: body.condolenceDate ? new Date(body.condolenceDate) : undefined,
        content: body.content,
        items: body.items,
        staff: body.staff,
        photos: body.photos,
      },
    });
    return NextResponse.json(condolence);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const existing = await prisma.condolence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    await prisma.condolence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}