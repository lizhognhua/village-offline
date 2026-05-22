import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    const existing = await prisma.weatherAlert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.level !== undefined) data.level = body.level;
    if (body.content !== undefined) data.content = body.content;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.source !== undefined) data.source = body.source;
    if (body.effectiveAt !== undefined) data.effectiveAt = new Date(body.effectiveAt);
    if (body.expireAt !== undefined) data.expireAt = body.expireAt ? new Date(body.expireAt) : null;
    const alert = await prisma.weatherAlert.update({ where: { id }, data });
    return NextResponse.json({ alert });
  } catch (error) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    const existing = await prisma.weatherAlert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.weatherAlert.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
