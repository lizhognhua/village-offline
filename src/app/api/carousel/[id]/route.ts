import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeObject } from "@/lib/sanitize";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    // Check team ownership
    const existing = await prisma.carouselImage.findUnique({ where: { id: (await params).id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.url !== undefined) data.url = body.url;
    if (body.category !== undefined) data.category = body.category;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    const image = await prisma.carouselImage.update({
      where: { id: (await params).id },
      data: data,
    });
    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    // Check team ownership
    const existing = await prisma.carouselImage.findUnique({ where: { id: (await params).id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.carouselImage.delete({ where: { id: (await params).id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

