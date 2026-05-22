import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }
  try {
    
    const where: any = {};
    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      include: { publisher: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json({ error: "获取公告失败" }, { status: 500 });
  }
}
