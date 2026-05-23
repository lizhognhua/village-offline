import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const diary = await prisma.workDiary.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!diary) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }

    return NextResponse.json(diary);
  } catch (error) {
    return NextResponse.json({ error: "获取日记详情失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const diary = await prisma.workDiary.findUnique({ where: { id: (await params).id } });
    if (!diary) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }
    if (diary.authorId !== session.user.id) {
      return NextResponse.json({ error: "无权编辑此日记" }, { status: 403 });
    }

    let body = await req.json()
    body = sanitizeObject(body);
    const updated = await prisma.workDiary.update({
      where: { id: (await params).id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.images !== undefined && { images: body.images }),
        ...(body.videos !== undefined && { videos: body.videos }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Diary update error:", error);
    return NextResponse.json({ error: "更新日记失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const diary = await prisma.workDiary.findUnique({ where: { id: (await params).id } });
    if (!diary) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }
    if (diary.authorId !== session.user.id) {
      return NextResponse.json({ error: "无权删除此日记" }, { status: 403 });
    }

    await prisma.workDiary.delete({ where: { id: (await params).id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Diary delete error:", error);
    return NextResponse.json({ error: "删除日记失败" }, { status: 500 });
  }
}
