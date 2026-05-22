import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const attr = searchParams.get("attr") || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { headName: { contains: search } },
      { headIdCard: { contains: search } },
      { familyCode: { contains: search } },
    ];
  }
  if (attr) where.familyAttr = attr;

  const [total, families] = await Promise.all([
    prisma.family.count({ where }),
    prisma.family.findMany({
      where,
      include: { members: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    families,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
