import { requireAuth } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const activities: { type: string; content: string; time: string }[] = [];

    const [recentVisits, recentCondolences, recentDiaries, recentRecords] = await Promise.all([
      prisma.visit.findMany({
        where: {},
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          family: { select: { headName: true } },
          visitor: { select: { name: true } },
        },
      }),
      prisma.condolence.findMany({
        where: {},
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { family: { select: { headName: true } } },
      }),
      prisma.workDiary.findMany({
        where: { isPublic: true },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      }),
      prisma.householdRecord.findMany({
        where: {},
        take: 5,
        orderBy: { recordDate: "desc" },
        include: { family: { select: { headName: true } } },
      }),
    ]);

    for (const v of recentVisits) {
      activities.push({
        type: "visit",
        content: (v.visitor?.name || "未知") + " 走访了 " + v.family.headName + " 家",
        time: v.createdAt.toISOString(),
      });
    }
    for (const c of recentCondolences) {
      activities.push({
        type: "condolence",
        content: "慰问了 " + c.family.headName + " 家",
        time: c.createdAt.toISOString(),
      });
    }
    for (const d of recentDiaries) {
      activities.push({
        type: "diary",
        content: (d.author?.name || "未知") + " 写了工作日记: " + d.title,
        time: d.createdAt.toISOString(),
      });
    }
    for (const r of recentRecords) {
      const label = r.type === "condolence" ? "慰问了" : "走访了";
      activities.push({
        type: r.type,
        content: (r.staff || "工作人员") + " " + label + " " + r.family.headName + " 家",
        time: r.recordDate.toISOString(),
      });
    }

    activities.sort((a, b) => b.time.localeCompare(a.time));

    return NextResponse.json({ activities: activities.slice(0, 10) });
  } catch (error) {
    console.error("Recent activity error:", error);
    return NextResponse.json({ activities: [] });
  }
}