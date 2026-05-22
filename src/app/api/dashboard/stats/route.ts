import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      recentRecords,
      recentDiaries,
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
      prisma.announcement.count({ where: { isActive: true } }),
      prisma.householdRecord.findMany({
        where: {},
        take: 8, orderBy: { createdAt: "desc" },
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
    ]);

    // Batch-fetch user names for records that have createdById
    const userIds = recentRecords
      .filter(r => r.createdById)
      .map(r => r.createdById!);
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const recentActivities = recentRecords.map(r => ({
      id: r.id,
      date: r.recordDate,
      type: r.type,
      familyName: r.family?.headName || "未知",
      creatorName: (r.createdById ? userMap.get(r.createdById) : null) || null,
      staff: r.staff || null,
      photo: (() => {
        try {
          const photos = JSON.parse(r.photos || "[]");
          return Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
        } catch { return null; }
      })(),
    }));

    return NextResponse.json({
      stats: {
        totalFamilies, totalVisits, totalVisitsThisMonth,
        totalCondolences, totalCondolencesThisMonth,
        totalDiaries, totalDiariesThisYear,
        totalMembers, totalActiveIndustries, totalAnnouncements,
      },
      recentRecords: recentActivities,
      recentDiaries: recentDiaries.map(d => ({
        id: d.id, date: d.date, title: d.title, authorName: d.author.name || "未知",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}