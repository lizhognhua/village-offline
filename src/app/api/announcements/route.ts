import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/announcements - 获取公告列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const session = await auth();
    

    const where: any = { isActive: true };

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [
        { pinned: "desc" },
        { publishedAt: "desc" },
      ],
      include: {
        publisher: { select: { name: true } },
      },
    });

    return NextResponse.json(announcements);
  } catch (error) {
    return NextResponse.json({ error: "获取公告列表失败" }, { status: 500 });
  }
}

// POST /api/announcements - 创建公告
export async function POST(request: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    let body = await request.json()
    body = sanitizeObject(body);
    const { title, content, priority, pinned, expiresAt } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || "普通",
        pinned: pinned || false,
        publisherId: a.session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json({ error: "创建公告失败" }, { status: 500 });
  }
}
