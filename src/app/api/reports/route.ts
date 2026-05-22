import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const [
      totalFamilies, totalVisits, totalCondolences, totalDiaries,
      totalProjects, totalIndustries, totalMembers, totalGroups,
      familyAttrStats, recentVisits, recentDiaries,
    ] = await Promise.all([
      prisma.family.count(),
      prisma.visit.count(),
      prisma.condolence.count(),
      prisma.workDiary.count(),
      prisma.project.count(),
      prisma.industry.count(),
      prisma.teamMember.count({ where: { isActive: true } }),
      prisma.villageGroup.count(),
      prisma.family.groupBy({ by: ["familyAttr"], _count: true }),
      prisma.visit.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        include: { family: { select: { headName: true } }, visitor: { select: { name: true } } },
      }),
      prisma.workDiary.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, title: true, createdAt: true, author: { select: { name: true } } },
      }),
    ]);

    const now = new Date();
    const monthlyVisits: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await prisma.visit.count({
        where: { visitDate: { gte: start, lte: end } },
      });
      monthlyVisits.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        count,
      });
    }

    const projectStats = await prisma.project.groupBy({
      by: ["status"], _count: true,
    });

    return NextResponse.json({
      totalFamilies, totalVisits, totalCondolences, totalDiaries,
      totalProjects, totalIndustries, totalMembers, totalGroups,
      familyAttrStats, monthlyVisits, projectStats,
      recentVisits: recentVisits.map(v => ({
        id: v.id, familyName: v.family?.headName, visitorName: v.visitor?.name,
        visitDate: v.visitDate, content: v.content?.slice(0, 80),
      })),
      recentDiaries: recentDiaries.map(d => ({
        id: d.id, title: d.title, authorName: d.author?.name, createdAt: d.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}