import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    const session = await auth();
    

    const MAIN_CATS = ["scenery", "culture", "portrait", "activity"];
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    } else {
      where.category = { in: MAIN_CATS };
    }

    const images = await prisma.carouselImage.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ images }, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    console.error("Carousel API error:", error);
    return NextResponse.json({ error: "获取轮播图失败" }, { status: 500, headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } });
  }
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    let body = await req.json()
    body = sanitizeObject(body);
    const image = await prisma.carouselImage.create({
      data: {
        url: body.url,
        title: body.title,
        category: body.category || "scenery",
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ image }, { status: 201, headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } });
  } catch (error) {
    console.error("Carousel create error:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500, headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } });
  }
}
