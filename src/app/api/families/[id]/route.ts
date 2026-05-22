import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const family = await prisma.family.findFirst({
    where: { id },
    include: {
      members: {
        orderBy: [{ relation: "asc" }, { name: "asc" }],
      },
      group: true,
      policies: { orderBy: { createdAt: "desc" } },
      alerts: { orderBy: { createdAt: "desc" }, take: 10 },
      visits: {
        include: { visitor: true },
        orderBy: { visitDate: "desc" },
        take: 10,
      },
    },
  });

  if (!family) {
    return NextResponse.json({ error: "农户不存在" }, { status: 404 });
  }

  return NextResponse.json({ family });
}
