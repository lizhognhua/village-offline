import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const family = await prisma.family.findFirst({
      where: { id },
      include: {
        members: { orderBy: [{ relation: "asc" }, { name: "asc" }] },
        group: { select: { name: true } },
      },
    });
    if (!family) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(family);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const a = await requireAuth(); if (a.error) return a.error;
    const { id } = await params;
    const ct = req.headers.get("content-type") || "";
    let body: any = {};
    let newPhotoPaths: string[] = [];
    let newFilePaths: string[] = [];

    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body.headName = sanitizeString(fd.get("headName"))
      body.headGender = sanitizeString(fd.get("headGender"))
      body.headPhone = sanitizeString(fd.get("headPhone"))
      body.headIdCard = sanitizeString(fd.get("headIdCard"))
      body.address = sanitizeString(fd.get("address"))
      body.population = fd.get("population") ? parseInt(fd.get("population") as string) : undefined;
      body.familyAttr = sanitizeString(fd.get("familyAttr"))
      body.existingPhotos = sanitizeString(fd.get("existingPhotos"))
      body.existingFiles = sanitizeString(fd.get("existingFiles"))

      const photos = fd.getAll("photos") as File[];
      for (const f of photos) {
        if (!f.size) continue;
        const ext = f.name.split(".").pop() || "jpg";
        const name = "family_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        const buf = Buffer.from(await f.arrayBuffer());
        await writeFile(path.join(dir, name), buf);
        newPhotoPaths.push("/uploads/" + name);
      }

      // Also handle URL-based photos
      const photoUrlsRaw = fd.get("photoUrls") as string | null;
      if (photoUrlsRaw) {
        try {
          const urls = JSON.parse(photoUrlsRaw);
          if (Array.isArray(urls)) {
            newPhotoPaths.push(...urls);
          }
        } catch (e) {
          // ignore invalid JSON
        }
      }

      // 处理附件文件
      const files = fd.getAll("files") as File[];
      for (const f of files) {
        if (!f.size) continue;
        const ext = f.name.split(".").pop() || "bin";
        const name = "file_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const dir2 = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir2, { recursive: true });
        const buf2 = Buffer.from(await f.arrayBuffer());
        await writeFile(path.join(dir2, name), buf2);
        newFilePaths.push("/uploads/" + name);
      }
      const fileUrlsRaw = fd.get("fileUrls") as string | null;
      if (fileUrlsRaw) {
        try {
          const urls = JSON.parse(fileUrlsRaw);
          if (Array.isArray(urls)) newFilePaths.push(...urls);
        } catch {}
      }
    } else {
      body = sanitizeObject(await req.json());
    }

    // Build update data — only set fields that are provided
    var updateData: any = {};
    if (body.headName !== undefined) updateData.headName = body.headName;
    if (body.headGender !== undefined) updateData.headGender = body.headGender;
    if (body.headPhone !== undefined) updateData.headPhone = body.headPhone;
    if (body.headIdCard !== undefined) updateData.headIdCard = body.headIdCard;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.population !== undefined) updateData.population = body.population;
    if (body.familyAttr !== undefined) updateData.familyAttr = body.familyAttr;
    if (body.latitude !== undefined) updateData.latitude = body.latitude;
    if (body.longitude !== undefined) updateData.longitude = body.longitude;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.spouseName !== undefined) updateData.spouseName = body.spouseName;
    if (body.spousePhone !== undefined) updateData.spousePhone = body.spousePhone;
    if (body.spouseIdCard !== undefined) updateData.spouseIdCard = body.spouseIdCard;
    if (body.income !== undefined) updateData.income = body.income;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Merge photos
    if (newPhotoPaths.length > 0 || body.existingPhotos !== undefined) {
      var existing: string[] = [];
      if (body.existingPhotos) {
        try { existing = JSON.parse(body.existingPhotos); } catch(e) { existing = []; }
      } else {
        var current = await prisma.family.findUnique({ where: { id }, select: { photos: true } });
        try { existing = JSON.parse(current?.photos || "[]"); } catch(e) { existing = []; }
      }
      updateData.photos = JSON.stringify(existing.concat(newPhotoPaths));
    }

    // Merge files (档案文件)
    if (newFilePaths.length > 0 || body.existingFiles !== undefined) {
      var existingFiles: string[] = [];
      if (body.existingFiles) {
        try { existingFiles = JSON.parse(body.existingFiles); } catch(e) { existingFiles = []; }
      } else {
        var currentF = await prisma.family.findUnique({ where: { id }, select: { files: true } });
        try { existingFiles = JSON.parse(currentF?.files || "[]"); } catch(e) { existingFiles = []; }
      }
      updateData.files = JSON.stringify(existingFiles.concat(newFilePaths));
    }

    const family = await prisma.family.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(family);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const a = await requireAuth(); if (a.error) return a.error;
    // Check ownership
    const existing = await prisma.family.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.family.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
