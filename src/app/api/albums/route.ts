import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAIN_CATS = ["scenery", "culture", "portrait", "activity"];

export async function GET(request: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "48");

    const where: any = {};
    if (category && category !== "uncategorized") {
      where.category = category;
    } else if (category === "uncategorized") {
      where.category = { notIn: MAIN_CATS };
    }
    if (search) {
      where.title = { contains: search };
    }

    const [images, total, countsRaw] = await Promise.all([
      prisma.carouselImage.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.carouselImage.count({ where }),
      prisma.carouselImage.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of countsRaw) {
      counts[row.category] = row._count.id;
    }

    return NextResponse.json({
      success: true,
      images,
      total,
      totalPages: Math.ceil(total / limit),
      counts,
    });
  } catch (error) {
    console.error("Albums API error:", error);
    return NextResponse.json({ success: false, error: "获取相册失败" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const { ids, category } = await req.json();
    if (!ids || !Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ success: false, error: "请选择图片" }, { status: 400 });
    }

    await prisma.carouselImage.updateMany({
      where: { id: { in: ids } },
      data: { category: category || "scenery" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "批量更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ success: false, error: "请选择图片" }, { status: 400 });
    }

    await prisma.carouselImage.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "批量删除失败" }, { status: 500 });
  }
}
