import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  // 未登录时返回空列表（不阻塞页面加载）

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const where: any = {};
    if (type) where.type = type;

    const [records, total] = await Promise.all([
      prisma.partyActivity.findMany({
        where, orderBy: { date: "desc" }, skip: (page - 1) * limit, take: limit,
      }),
      prisma.partyActivity.count({ where }),
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
    const type = fd.get("type") as string || "";
    const location = fd.get("location") as string || "";
    const content = fd.get("content") as string || "";
    const participants = fd.get("participants") as string || "[]";

    if (!title || !dateStr || !type) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // Save photos locally
    const photoPaths: string[] = [];
    const photos = fd.getAll("photos") as File[];
    const now = new Date();
    const dateDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "party", dateDir);
    await mkdir(uploadDir, { recursive: true });

    for (const f of photos) {
      if (!f.size || f.size > 20 * 1024 * 1024) continue;
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg","jpeg","png","gif","webp"].includes(ext)) continue;
      const name = `party_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buf = Buffer.from(await f.arrayBuffer());
      await writeFile(path.join(uploadDir, name), buf);
      photoPaths.push(`/api/uploads/party/${dateDir}/${name}`);
    }

    const filesRaw = fd.get("files") as string || "[]";
    let files: any[] = [];
    try { files = JSON.parse(filesRaw); } catch {}

    const record = await prisma.partyActivity.create({
      data: {
        type, title, date: new Date(dateStr),
        location: location || null, content: content || null,
        participants, photos: JSON.stringify(photoPaths), files: JSON.stringify(files),
        createdById: (a.session as any).user?.id || null,
      },
    });

    // Sync to accountability dashboard (taskType=5 建强党组织)
    await prisma.accountabilityRecord.create({
      data: {
        taskType: 5, title,
        description: content?.substring(0, 500) || null,
        date: new Date(dateStr),
        photos: JSON.stringify(photoPaths),
        files: JSON.stringify(files),
        urls: "[]",
        createdById: (a.session as any).user?.id || null,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
