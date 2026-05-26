import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requireAuth();
  if (a.error) return a.error;
  
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalFamilies, totalVisits, totalVisitsThisMonth,
      totalCondolences, totalCondolencesThisMonth,
      totalDiaries, totalDiariesThisYear,
      totalMembers, totalActiveIndustries, totalAnnouncements,
      pendingServices,
      recentRecords,
      recentDiaries,
      allFamilies,
      poorFamilies,
      monitoredFamilies,
      projectsDone,
      projectsActive,
    ] = await Promise.all([
      prisma.family.count({ where: {} }),
      prisma.visit.count({ where: {} }),
      prisma.visit.count({ where: { visitDate: { gte: thisMonth } } }),
      prisma.condolence.count({ where: {} }),
      prisma.condolence.count({ where: { condolenceDate: { gte: thisMonth } } }),
      prisma.workDiary.count({ where: {} }),
      prisma.workDiary.count({ where: { date: { gte: thisYear } } }),
      prisma.teamMember.count({ where: { isActive: true } }),
      prisma.industry.count({ where: {} }),
      prisma.announcement.count({ where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } }),
      prisma.publicService.count({ where: { teamId, status: "待处理" } }),
      prisma.householdRecord.findMany({
        where: {},
        take: 6, orderBy: { createdAt: "desc" },
        select: {
          id: true, type: true, recordDate: true, staff: true, photos: true,
          createdById: true,
          family: { select: { headName: true } },
        },
      }),
      prisma.workDiary.findMany({
        where: {},
        take: 4, orderBy: { createdAt: "desc" },
        select: { id: true, title: true, date: true, author: { select: { name: true } } },
      }),
      prisma.family.findMany({ where: {}, select: { population: true } }),
      prisma.family.findMany({ where: { teamId, familyAttr: { contains: "脱贫户" } }, select: { population: true } }),
      prisma.family.findMany({ where: { teamId, familyAttr: { contains: "监测户" } }, select: { population: true } }),
      prisma.project.count({ where: { status: "completed" } }),
      prisma.project.count({ where: { status: "active" } }),
    ]);

    // Batch-fetch user names
    const userIds = recentRecords.filter(r => r.createdById).map(r => r.createdById!);
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const recentActivities = recentRecords.map(r => ({
      id: r.id, date: r.recordDate, type: r.type,
      familyName: r.family?.headName || "未知",
      creatorName: (r.createdById ? userMap.get(r.createdById) : null) || null,
      staff: r.staff || null,
      photo: (() => { try { const p = JSON.parse(r.photos || "[]"); return Array.isArray(p) && p.length > 0 ? p[0] : null; } catch { return null; } })(),
    }));

    const totalPopulation = allFamilies.reduce((sum, f) => sum + (f.population || 0), 0);
    const poorPopulation = poorFamilies.reduce((sum, f) => sum + (f.population || 0), 0);
    const monitoredPopulation = monitoredFamilies.reduce((sum, f) => sum + (f.population || 0), 0);

    // Get work start date
    const workStartConfig = await prisma.systemConfig.findUnique({
      where: { key: `workStartDate` },
    });

    return NextResponse.json({
      stats: {
        totalFamilies, totalPopulation,
        poorHouseholds: poorFamilies.length, poorPopulation,
        monitoredHouseholds: monitoredFamilies.length, monitoredPopulation,
        projectsDone, projectsActive,
        totalMembers, totalActiveIndustries, totalAnnouncements,
        totalVisits, totalVisitsThisMonth,
        totalCondolences, totalCondolencesThisMonth,
        totalDiaries, totalDiariesThisYear,
        pendingServices,
        workStartDate: workStartConfig?.value || null,
      },
      recentRecords: recentActivities,
      recentDiaries: recentDiaries.map(d => ({
        id: d.id, date: d.date, title: d.title, authorName: d.author?.name || "未知",
      })),
    });
  } catch {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
