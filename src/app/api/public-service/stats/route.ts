import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

// GET /api/public-service/stats — 诉求统计
export async function GET() {
  const a = await requireAuth();
  if (a.error) return a.error;

  const teamId = a.session.user.teamId || "";
  const role = a.session.user.role;
  const teamFilter = role !== "superadmin" ? { teamId } : {};

  try {
    const [total, pending, processing, resolved, byType] = await Promise.all([
      prisma.publicService.count({ where: teamFilter }),
      prisma.publicService.count({ where: { ...teamFilter, status: "待处理" } }),
      prisma.publicService.count({ where: { ...teamFilter, status: "处理中" } }),
      prisma.publicService.count({ where: { ...teamFilter, status: "已解决" } }),
      prisma.publicService.groupBy({
        by: ["requestType"],
        where: teamFilter,
        _count: true,
        orderBy: { _count: { requestType: "desc" } },
      }),
    ]);

    return NextResponse.json({
      total, pending, processing, resolved,
      byType: byType.map((t) => ({ type: t.requestType, count: t._count })),
    });
  } catch {
    return NextResponse.json({ error: "获取统计失败" }, { status: 500 });
  }
}
