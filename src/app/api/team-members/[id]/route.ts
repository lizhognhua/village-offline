import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { requireAdmin } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const member = await prisma.teamMember.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.teamMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
