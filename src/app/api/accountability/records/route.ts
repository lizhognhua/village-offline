import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  

  try {
    const { searchParams } = new URL(req.url);
    const taskType = parseInt(searchParams.get("taskType") || "0");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const where: any = {};
    if (taskType > 0) where.taskType = taskType;

    const [records, total] = await Promise.all([
      prisma.accountabilityRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.accountabilityRecord.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const fd = await req.formData();
    const title = (fd.get("title") as string || "").trim();
    const dateStr = fd.get("date") as string || "";
    const taskType = parseInt(fd.get("taskType") as string || "0");
    const description = fd.get("description") as string || "";

    if (!title || !dateStr || !taskType) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // Save uploaded photos
    const photoPaths: string[] = [];
    const photos = fd.getAll("photos") as File[];
    const now = new Date();
    const dateDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "accountability", dateDir);
    await mkdir(uploadDir, { recursive: true });

    for (const f of photos) {
      if (!f.size) continue;
      if (f.size > 20 * 1024 * 1024) continue;
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg","jpeg","png","gif","webp","heic"].includes(ext)) continue;
      const name = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buf = Buffer.from(await f.arrayBuffer());
      await writeFile(path.join(uploadDir, name), buf);
      photoPaths.push(`/uploads/accountability/${dateDir}/${name}`);
    }

    const urlsRaw = fd.get("urls") as string || "[]";
    let urls: string[] = [];
    try { urls = JSON.parse(urlsRaw); } catch {}

    const filesRaw = fd.get("files") as string || "[]";
    let files: any[] = [];
    try { files = JSON.parse(filesRaw); } catch {}

    const record = await prisma.accountabilityRecord.create({
      data: {
        taskType,
        title,
        description: description || null,
        date: new Date(dateStr),
        photos: JSON.stringify(photoPaths),
        urls: JSON.stringify(urls),
        files: JSON.stringify(files),
        createdById: (a.session as any).user?.id || null,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
