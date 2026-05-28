import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    const where: any = {};
    if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);
      where.time = { gte: start, lt: end };
    }
    // 多租户过滤

    const records = await prisma.trainingRecord.findMany({
      where,
      orderBy: { time: "desc" },
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    let body = await req.json()
    body = sanitizeObject(body);

    if (!body.time || !body.location || !body.content || !body.participants) {
      return NextResponse.json({ error: "缺少必填字段(时间/地点/内容/参与人员)" }, { status: 400 });
    }

    // 合并照片和文件到 files 字段
    let allFiles: any[] = [];
    try {
      if (body.files) allFiles = typeof body.files === "string" ? JSON.parse(body.files) : body.files;
    } catch {}
    if (body.photos && Array.isArray(body.photos) && body.photos.length > 0) {
      allFiles = [...allFiles, ...body.photos.map((url: string) => ({ title: "培训照片", fileName: url, downloadUrl: url, docId: null }))];
    }

    const record = await prisma.trainingRecord.create({
      data: {
        title: body.title || null,
        time: new Date(body.time),
        endTime: body.endTime ? new Date(body.endTime) : null,
        createdById: session?.user?.id || null,
        location: body.location,
        content: body.content,
        participants: JSON.stringify(body.participants),
        files: allFiles.length > 0 ? JSON.stringify(allFiles) : null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
