import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  if (!ids) return NextResponse.json({});

  const idArr = ids.split(",");
  const where: any = { familyId: { in: idArr } };
  const records = await prisma.condolenceRecord.findMany({
    where,
    select: { id: true, familyId: true, condolenceDate: true, visitorName: true },
    orderBy: { condolenceDate: "desc" },
    take: 50,
  });
  
  const grouped: Record<string, any[]> = {};
  for (const r of records) {
    if (!grouped[r.familyId]) grouped[r.familyId] = [];
    grouped[r.familyId].push(r);
  }
  return NextResponse.json(grouped);
}

