import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const groups = await prisma.villageGroup.findMany({
      where: {},
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { families: true } } },
    });
    return NextResponse.json(groups);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}
