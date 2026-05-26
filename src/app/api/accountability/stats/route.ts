import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();


  try {
    const stats = await prisma.accountabilityRecord.groupBy({
      by: ["taskType"],
      where: {},
      _count: true,
    });

    const taskCounts: Record<number, number> = {};
    for (const s of stats) {
      taskCounts[s.taskType] = s._count;
    }

    const publicServiceTotal = await prisma.publicService.count({ where: {} });

    const dutyStats = {
      "建强组织": (taskCounts[1] || 0) + (taskCounts[5] || 0) + (taskCounts[10] || 0),
      "兴村富民": (taskCounts[4] || 0) + (taskCounts[6] || 0) + (taskCounts[7] || 0) + (taskCounts[8] || 0),
      "加强治理": (taskCounts[9] || 0),
      "为民服务": (taskCounts[2] || 0) + (taskCounts[3] || 0) + publicServiceTotal,
    };

    const timeline = await prisma.accountabilityRecord.findMany({
      where: {},
      orderBy: { date: "desc" },
      take: 20,
      select: { id: true, title: true, date: true, taskType: true },
    });

    return NextResponse.json({ stats: taskCounts, dutyStats, timeline });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
