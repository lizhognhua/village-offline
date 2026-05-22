import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const where: any = {};
    const families = await prisma.family.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ families });
  } catch (error) {
    console.error("Map families error:", error);
    return NextResponse.json({ error: "获取农户数据失败" }, { status: 500 });
  }
}
