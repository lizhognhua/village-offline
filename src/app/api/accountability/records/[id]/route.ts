import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;

  try {
    const existing = await prisma.accountabilityRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.taskType !== undefined) data.taskType = body.taskType;
    if (body.photos !== undefined) data.photos = typeof body.photos === "string" ? body.photos : JSON.stringify(body.photos);
    if (body.urls !== undefined) data.urls = typeof body.urls === "string" ? body.urls : JSON.stringify(body.urls);
    if (body.files !== undefined) data.files = typeof body.files === "string" ? body.files : JSON.stringify(body.files);

    const record = await prisma.accountabilityRecord.update({ where: { id }, data });
    return NextResponse.json({ record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;

  try {
    const existing = await prisma.accountabilityRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.accountabilityRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
