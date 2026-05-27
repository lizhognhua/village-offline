import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [profile, totalFamilies, totalMembers, recentVisits, activeProjects, totalDiaries,
      poorHouseholds, monitoredHouseholds, dibaoHouseholds, wubaoHouseholds, normalHouseholds, populationSum] = await Promise.all([
      prisma.villageProfile.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.family.count(),
      prisma.familyMember.count(),
      prisma.visit.count({ where: { visitDate: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
      prisma.industry.count(),
      prisma.workDiary.count(),
      // Use contains for multi-tag support (e.g. "脱贫户,残疾" counts as both)
      prisma.family.count({ where: { familyAttr: { contains: "脱贫户" } } }),
      prisma.family.count({ where: { familyAttr: { contains: "监测户" } } }),
      prisma.family.count({ where: { familyAttr: { contains: "低保户" } } }),
      prisma.family.count({ where: { familyAttr: { contains: "五保户" } } }),
      prisma.family.count({ where: { OR: [{ familyAttr: { contains: "一般农户" } }, { familyAttr: null }] } }),
      prisma.family.aggregate({ _sum: { population: true } }),
    ]);

    return NextResponse.json({
      stats: {
        // 自动统计（来自 Family 表实时计算，不读取 VillageProfile）
        households: totalFamilies,
        population: populationSum._sum.population ?? 0,
        poorHouseholds,
        monitoredHouseholds,
        dibaoHouseholds,
        wubaoHouseholds,
        normalHouseholds,
        // 手动录入（来自 VillageProfile）
        cultivatedLand: profile?.cultivatedLand ?? 0,
        totalFamilies,
        totalMembers,
        recentVisits,
        activeProjects,
        diaries: totalDiaries,
        partyMembers: profile?.partyMembers ?? 0,
        villageIncome: profile?.villageIncome ?? 0,
        operatingIncome: profile?.operatingIncome ?? 0,
        relocatedHouseholds: profile?.relocatedHouseholds ?? 0,
        relocatedPopulation: profile?.relocatedPopulation ?? 0,
      },
    });
  } catch (error) {
    console.error("获取村情统计失败:", error);
    return NextResponse.json({ error: "获取村情统计失败" }, { status: 500 });
  }
}