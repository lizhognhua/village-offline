import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const where: any = {};
    if (category) where.category = category;
    if (search) where.title = { contains: search };

    const [files, total] = await Promise.all([
      prisma.fileDoc.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fileDoc.count({ where }),
    ]);

    return NextResponse.json({ files, total, page });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const fd = await req.formData();
    const file = fd.get("file") as File;
    const title = (fd.get("title") as string) || file?.name || "未命名";
    const category = fd.get("category") as string || undefined;
    const tags = fd.get("tags") as string || "[]";

    if (!file || !file.size) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const dateDir = new Date().toISOString().slice(0, 7).replace("-", "/");
    const rand = Math.random().toString(36).slice(2, 8);
    const fileName = `${Date.now()}_${rand}.${ext}`;
    const dir = path.join(process.cwd(), "data", "files", dateDir);
    await mkdir(dir, { recursive: true });

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, fileName), buf);

    const doc = await prisma.fileDoc.create({
      data: {
        title,
        category,
        tags,
        filePath: `${dateDir}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });

    return NextResponse.json({ success: true, file: doc });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
