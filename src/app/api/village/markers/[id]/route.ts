import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { requireAuth } from "@/lib/auth-utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    // Check team ownership
    const existing = await prisma.mapMarker.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    let body = await req.json()
    body = sanitizeObject(body);

    const marker = await prisma.mapMarker.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
      },
    });

    return NextResponse.json(marker);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const { id } = await params;
    // Check team ownership
    const existing = await prisma.mapMarker.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.mapMarker.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
