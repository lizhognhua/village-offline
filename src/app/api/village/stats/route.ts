import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [profile, totalFamilies, totalMembers, recentVisits, activeProjects, attrCounts] = await Promise.all([
      prisma.villageProfile.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.family.count(),
      prisma.familyMember.count(),
      prisma.visit.count({ where: { visitDate: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
      prisma.industry.count(),
      prisma.family.groupBy({
        by: ["familyAttr"],
        _count: { id: true },
      }),
    ]);

    const attrMap: Record<string, number> = {};
    for (const row of attrCounts) {
      if (row.familyAttr) attrMap[row.familyAttr] = row._count.id;
    }

    return NextResponse.json({
      stats: {
        households: totalFamilies,
        population: totalMembers,
        cultivatedLand: profile?.cultivatedLand ?? 0,
        totalFamilies,
        totalMembers,
        recentVisits,
        activeProjects,
        poorHouseholds: attrMap["脱贫户"] ?? 0,
        monitoredHouseholds: attrMap["监测户"] ?? 0,
        dibaoHouseholds: attrMap["低保户"] ?? 0,
        wubaoHouseholds: attrMap["五保户"] ?? 0,
        normalHouseholds: attrMap["一般农户"] ?? 0,
        partyMembers: profile?.partyMembers ?? 0,
        villageIncome: profile?.villageIncome ?? 0,
        operatingIncome: profile?.operatingIncome ?? 0,
      },
    });
  } catch (error) {
    console.error("获取村情统计失败:", error);
    return NextResponse.json({ error: "获取村情统计失败" }, { status: 500 });
  }
}