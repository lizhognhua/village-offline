import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeObject } from "@/lib/sanitize";
import { getDutyTags, getTaskTags } from "@/lib/accountability";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    if (!session?.user?.id) {
      return NextResponse.json({ diaries: [], total: 0, totalPublic: 0, totalPrivate: 0, page: 1 });
    }
    const where: any = {};

    const [diaries, total, totalPublic, totalPrivate] = await Promise.all([
      prisma.workDiary.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { author: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.workDiary.count({ where }),
      prisma.workDiary.count({ where: { authorId: session.user.id, isPublic: true } }),
      session?.user?.id
        ? prisma.workDiary.count({ where: { authorId: session.user.id, isPublic: false } })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({ diaries, total, totalPublic, totalPrivate, page });
  } catch (error) {
    console.error("Diary list error:", error);
    return NextResponse.json({ error: "获取日记列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    let body = await req.json()
    body = sanitizeObject(body);
    const recordType = body.recordType || "";
    const dutyTags = body.dutyTags ? JSON.parse(body.dutyTags) : getDutyTags(recordType);
    const taskTags = body.taskTags ? JSON.parse(body.taskTags) : getTaskTags(recordType);
    const diary = await prisma.workDiary.create({
      data: {
        title: body.title,
        content: body.content || "",
        images: body.images || "[]",
        videos: body.videos || "[]",
        isPublic: body.isPublic !== false,
        source: "editor",
        recordType: recordType || null,
        dutyTags: JSON.stringify(dutyTags),
        taskTags: JSON.stringify(taskTags),
        authorId: session.user.id,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(diary, { status: 201 });
  } catch (error) {
    console.error("Diary create error:", error);
    return NextResponse.json({ error: "创建日记失败" }, { status: 500 });
  }
}
