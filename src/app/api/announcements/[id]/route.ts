import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// GET /api/announcements/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        publisher: { select: { name: true, avatar: true } },
      },
    });
    if (!announcement || !announcement.isActive) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }
    return NextResponse.json(announcement);
  } catch (error) {
    console.error("Announcement GET error:", error);
    return NextResponse.json({ error: "获取公告详情失败" }, { status: 500 });
  }
}

// PUT /api/announcements/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireAdmin } = await import("@/lib/auth-utils");
  const a = await requireAdmin();
  if (a.error) return a.error;

  const { id } = await params;
  try {
    let body = await request.json()
    body = sanitizeObject(body);
    const { title, content, priority, pinned, expiresAt, isActive } = body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(priority !== undefined && { priority }),
        ...(pinned !== undefined && { pinned }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Announcement PUT error:", error);
    return NextResponse.json({ error: "更新公告失败" }, { status: 500 });
  }
}

// DELETE /api/announcements/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requireAdmin } = await import("@/lib/auth-utils");
  const a = await requireAdmin();
  if (a.error) return a.error;

  const { id } = await params;
  try {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    await prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Announcement DELETE error:", error);
    return NextResponse.json({ error: "删除公告失败" }, { status: 500 });
  }
}
