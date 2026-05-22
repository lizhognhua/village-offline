import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeObject } from "@/lib/sanitize";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const existing = await prisma.trainingRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    if (existing.createdById && existing.createdById !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "只能编辑自己的记录" }, { status: 403 });
    }
    let body = await req.json()
    body = sanitizeObject(body);

    const data: any = {};
    if (body.title !== undefined) data.title = body.title || null;
    if (body.time !== undefined) data.time = new Date(body.time);
    if (body.endTime !== undefined) data.endTime = body.endTime ? new Date(body.endTime) : null;
    if (body.location !== undefined) data.location = body.location;
    if (body.content !== undefined) data.content = body.content;
    if (body.participants !== undefined) data.participants = JSON.stringify(body.participants);
    if (body.notes !== undefined) data.notes = body.notes;

    // 合并 files 和 photos（TrainingRecord 没有 photos 字段）
    if (body.files !== undefined || body.photos !== undefined) {
      var merged: any[] = [];
      try {
        if (body.files) merged = typeof body.files === "string" ? JSON.parse(body.files) : body.files;
      } catch {}
      if (body.photos && Array.isArray(body.photos)) {
        merged = [...merged, ...body.photos.map((url: string) => ({ title: "培训照片", fileName: url, downloadUrl: url, docId: null }))];
      }
      data.files = JSON.stringify(merged);
    }

    const record = await prisma.trainingRecord.update({ where: { id }, data });
    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const existing = await prisma.trainingRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    if (existing.createdById && existing.createdById !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "只能删除自己的记录" }, { status: 403 });
    }
    await prisma.trainingRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
