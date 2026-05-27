import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const record = await prisma.householdRecord.findUnique({
      where: { id },
      include: { family: { select: { headName: true, familyAttr: true, address: true } } },
    });
    if (!record) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;

  try {
    let body: any;
    let photoPaths: string[] = [];

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = sanitizeObject({
        type: fd.get("type") || "visit",
        familyId: fd.get("familyId"),
        recordDate: fd.get("recordDate"),
        content: fd.get("content"),
        statusTags: fd.get("statusTags") || "[]",
        items: fd.get("items") || "[]",
        staff: fd.get("staff") || "",
      });
      // Handle existing photos from form field
      const existingPhotos = fd.get("photos");
      if (existingPhotos) {
        try { photoPaths = JSON.parse(existingPhotos as string); } catch {}
      }
      // Handle new photo uploads
      const photos = fd.getAll("photos") as File[];
      for (const f of photos) {
        if (typeof f === "string" || !f.name) continue;
        let ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        let buf = Buffer.from(await f.arrayBuffer());
        if (ext === "heic" || ext === "heif") {
          try {
            const { default: heicConvert } = await import("heic-convert");
            buf = Buffer.from(await heicConvert({ buffer: buf, format: "JPEG", quality: 0.85 }));
            ext = "jpg";
          } catch (e) {
            console.error("HEIC conversion failed:", e.message);
          }
        }
        const prefix = body.type === "condolence" ? "condolence" : "visit";
        const name = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), buf);
        photoPaths.push(`/api/uploads/${name}`);
      }
    } else {
      body = sanitizeObject(await req.json());
      if (body.photos) {
        try { photoPaths = typeof body.photos === "string" ? JSON.parse(body.photos) : body.photos; } catch {}
      }
    }

    const updateData: any = {
      type: body.type,
      familyId: body.familyId,
      content: body.content,
      statusTags: typeof body.statusTags === "string" ? body.statusTags : JSON.stringify(body.statusTags || []),
      items: typeof body.items === "string" ? body.items : JSON.stringify(body.items || []),
      staff: body.staff || null,
      dutyTags: body.dutyTags || JSON.stringify(["为民服务"]),
      taskTags: body.taskTags || JSON.stringify(["#2 落实入户走访制度"]),
    };
    if (body.visitDate || body.recordDate) {
      updateData.recordDate = new Date(body.visitDate || body.recordDate);
    }
    // 保护照片：仅当有新照片上传或显式传入 photos 时才更新
    if (photoPaths.length > 0 || body.photos !== undefined) {
      updateData.photos = photoPaths.length ? JSON.stringify(photoPaths) : body.photos;
    }

    const record = await prisma.householdRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const record = await prisma.householdRecord.findUnique({ where: { id }, select: { createdById: true } });
    if (!record) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    if (record.createdById !== a.session.user.id && a.session.user.role !== "admin") {
      return NextResponse.json({ error: "只能删除自己的记录" }, { status: 403 });
    }
    await prisma.householdRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
