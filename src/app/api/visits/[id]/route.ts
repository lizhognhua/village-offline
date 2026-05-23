import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        family: { select: { headName: true, familyAttr: true } },
        visitor: { select: { name: true, email: true } },
      },
    });
    if (!visit) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(visit);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const existing = await prisma.visit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const visit = await prisma.visit.update({
      where: { id },
      data: {
        familyId: body.familyId,
        visitDate: body.visitDate ? new Date(body.visitDate) : undefined,
        content: body.content,
        photos: body.photos,
        statusTags: body.statusTags !== undefined ? (typeof body.statusTags === "string" ? body.statusTags : JSON.stringify(body.statusTags)) : undefined,
        staff: body.staff !== undefined ? body.staff : undefined,
      },
    });
    return NextResponse.json(visit);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    // 检查所有权
    const visit = await prisma.visit.findUnique({ where: { id }, select: { visitorId: true } });
    if (!visit) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    if (visit.visitorId !== a.session.user.id && a.session.user.role !== "admin") {
      return NextResponse.json({ error: "只能删除自己的记录" }, { status: 403 });
    }
    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}