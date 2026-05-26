import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

// GET /api/public-service/search-families?q=xxx — 模糊搜索农户姓名+电话
export async function GET(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    // Search in family headName and familyMember name
    const families = await prisma.family.findMany({
      where: {
        headName: { contains: q },
      },
      select: { headName: true, phone: true },
      take: 8,
    });

    const members = await prisma.familyMember.findMany({
      where: {
        name: { contains: q },
      },
      select: { name: true, phone: true, family: { select: { headName: true } } },
      take: 5,
    });

    const results = [
      ...families.map(f => ({ name: f.headName, phone: f.phone || "", label: f.headName })),
      ...members.map(m => ({ name: m.name, phone: m.phone || "", label: `${m.name} (${m.family.headName}户)` })),
    ];

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = results.filter(r => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    });

    return NextResponse.json(unique.slice(0, 8));
  } catch {
    return NextResponse.json([]);
  }
}
