import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeObject } from "@/lib/sanitize";

export async function GET() {
  try {
    const session = await auth();
    const where: any = {};
    const markers = await prisma.mapMarker.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ markers });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    let body = await req.json()
    body = sanitizeObject(body);

    if (!body.name || !body.latitude || !body.longitude) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const marker = await prisma.mapMarker.create({
      data: {
        name: body.name,
        category: body.category || "general",
        description: body.description || "",
        latitude: body.latitude,
        longitude: body.longitude,
        createdBy: session?.user?.id || body.createdBy || null,
      },
    });

    return NextResponse.json(marker, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
