import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const role = (a.session as any).user?.role || "";
  const { searchParams } = new URL(req.url);

  try {
    // Count records by duty tags
    const [diaries, records, projects] = await Promise.all([
      prisma.workDiary.findMany({
        where: {},
        select: { dutyTags: true, taskTags: true, recordType: true, date: true, title: true },
        orderBy: { date: "desc" },
        take: 500,
      }),
      prisma.householdRecord.findMany({
        where: {},
        select: { type: true, dutyTags: true, taskTags: true, careType: true, policyPublicized: true, recordDate: true, staff: true },
        orderBy: { recordDate: "desc" },
        take: 500,
      }),
      prisma.project.findMany({
        where: {},
        select: { title: true, status: true, progress: true, dutyCategory: true, planType: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Aggregate duty stats
    const dutyStats: Record<string, number> = { "建强组织": 0, "兴村富民": 0, "加强治理": 0, "为民服务": 0 };
    const taskStats: Record<string, { total: number; items: string[] }> = {};
    for (let i = 1; i <= 10; i++) {
      taskStats[String(i)] = { total: 0, items: [] };
    }

    for (const d of diaries) {
      try {
        const duties: string[] = JSON.parse(d.dutyTags || "[]");
        duties.forEach(duty => { if (dutyStats[duty] !== undefined) dutyStats[duty]++; });
        const tasks: string[] = JSON.parse(d.taskTags || "[]");
        tasks.forEach(t => {
          const idx = t.replace(/[^0-9]/g, "");
          if (taskStats[idx]) { taskStats[idx].total++; taskStats[idx].items.push(d.title); }
        });
      } catch {}
    }

    for (const r of records) {
      try {
        const duties: string[] = JSON.parse(r.dutyTags || "[]");
        duties.forEach(duty => { if (dutyStats[duty] !== undefined) dutyStats[duty]++; });
        const tasks: string[] = JSON.parse(r.taskTags || "[]");
        tasks.forEach(t => {
          const idx = t.replace(/[^0-9]/g, "");
          if (taskStats[idx]) { taskStats[idx].total++; taskStats[idx].items.push(r.type === "condolence" ? "慰问" : "走访"); }
        });
      } catch {}
    }

    // Timeline (combined, sorted)
    const timeline = [
      ...diaries.map(d => ({ date: d.date, type: "diary" as const, title: d.title, recordType: d.recordType })),
      ...records.map(r => ({ date: r.recordDate, type: r.type as string, title: `${r.type === "condolence" ? "慰问" : "走访"}记录`, recordType: r.type })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

    return NextResponse.json({ dutyStats, taskStats, timeline, projectCount: projects.length, diaryCount: diaries.length, recordCount: records.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
