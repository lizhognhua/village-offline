import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(2000, parseInt(searchParams.get("limit") || "200"));
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const attr = searchParams.get("attr");
    const groupId = searchParams.get("groupId");
    const hasCoords = searchParams.get("hasCoords");

    const where: any = {};
    if (search) { where.headName = { contains: search, mode: "insensitive" }; }
    if (attr === "一般农户") { where.OR = [{ familyAttr: "一般农户" }, { familyAttr: null }]; } else if (attr) { where.familyAttr = attr; }
    if (groupId) { where.groupId = groupId; }
    if (hasCoords === "true") { where.latitude = { not: null }; where.longitude = { not: null }; }

    const [families, total] = await Promise.all([
      prisma.family.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { headName: "asc" },
        include: { group: { select: { name: true } } },
      }),
      prisma.family.count({ where }),
    ]);

    return NextResponse.json({ families, total, totalPages: Math.ceil(total / limit), page });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const ct = req.headers.get("content-type") || "";
    let body: any = {};
    let photoPaths: string[] = [];

    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body.headName = sanitizeString(fd.get("headName"))
      body.headGender = sanitizeString(fd.get("headGender") || null)
      body.headIdCard = sanitizeString(fd.get("headIdCard") || null)
      body.headPhone = sanitizeString(fd.get("headPhone") || null)
      body.population = parseInt(fd.get("population") as string || "0");
      body.familyAttr = sanitizeString(fd.get("familyAttr") || null)
      body.tags = fd.get("tags") || "[]";
      body.registeredAddr = sanitizeString(fd.get("registeredAddr") || null)
      body.actualAddr = sanitizeString(fd.get("actualAddr") || null)
      body.residenceStatus = sanitizeString(fd.get("residenceStatus"))
      body.riskLevel = sanitizeString(fd.get("riskLevel"))
      body.incomeSource = sanitizeString(fd.get("incomeSource") || null)
      body.groupId = sanitizeString(fd.get("groupId") || null)
      body.spouseName = sanitizeString(fd.get("spouseName") || null)
      body.spousePhone = sanitizeString(fd.get("spousePhone") || null)
      body.spouseIdCard = sanitizeString(fd.get("spouseIdCard") || null)
      body.address = sanitizeString(fd.get("address") || null)
      body.income = sanitizeString(fd.get("income") || null)
      body.notes = sanitizeString(fd.get("notes") || null)
      body.latitude = fd.get("latitude") ? parseFloat(fd.get("latitude") as string) : null
      body.longitude = fd.get("longitude") ? parseFloat(fd.get("longitude") as string) : null

      const photos = fd.getAll("photos") as File[];
      for (const f of photos) {
        if (!f.size) continue;
        if (f.size > 20 * 1024 * 1024) continue; // 跳过超过20MB的文件
        const ext = f.name.split(".").pop() || "jpg";
        const name = "family_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        const buf = Buffer.from(await f.arrayBuffer());
        await writeFile(path.join(dir, name), buf);
        photoPaths.push("/uploads/" + name);
      }

      // Also handle URL-based photos
      const photoUrlsRaw = fd.get("photoUrls") as string | null;
      if (photoUrlsRaw) {
        try {
          const urls = JSON.parse(photoUrlsRaw);
          if (Array.isArray(urls)) {
            photoPaths.push(...urls);
          }
        } catch (e) {
          // ignore invalid JSON
        }
      }

      // 处理附件文件
      let filePaths: string[] = [];
      const filesArr = fd.getAll("files") as File[];
      for (const f of filesArr) {
        if (!f.size) continue;
        if (f.size > 50 * 1024 * 1024) continue; // 跳过超过50MB的文件
        const ext = f.name.split(".").pop() || "bin";
        const name = "file_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        const buf = Buffer.from(await f.arrayBuffer());
        await writeFile(path.join(dir, name), buf);
        filePaths.push("/uploads/" + name);
      }

      const fileUrlsRaw = fd.get("fileUrls") as string | null;
      if (fileUrlsRaw) {
        try {
          const urls = JSON.parse(fileUrlsRaw);
          if (Array.isArray(urls)) {
            filePaths.push(...urls);
          }
        } catch (e) {
          // ignore invalid JSON
        }
      }
      body.files = filePaths.length > 0 ? JSON.stringify(filePaths) : "[]";
    } else {
      body = await req.json();
    }

    if (!body.headName) {
      return NextResponse.json({ error: "缺少姓名" }, { status: 400 });
    }

    const family = await prisma.family.create({
      data: {
        headName: body.headName,
        headGender: body.headGender || null,
        headIdCard: body.headIdCard || null,
        headPhone: body.headPhone || null,
        population: body.population || 0,
        familyAttr: body.familyAttr || null,
        tags: body.tags || "[]",
        registeredAddr: body.registeredAddr || null,
        actualAddr: body.actualAddr || null,
        residenceStatus: body.residenceStatus || "常住户",
        riskLevel: body.riskLevel || "低",
        incomeSource: body.incomeSource || null,
        groupId: body.groupId || null,
        spouseName: body.spouseName || null,
        spousePhone: body.spousePhone || null,
        spouseIdCard: body.spouseIdCard || null,
        address: body.address || null,
        income: body.income || null,
        photos: photoPaths.length > 0 ? JSON.stringify(photoPaths) : "[]",
        files: body.files || "[]",
        notes: body.notes || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
      },
    });

    return NextResponse.json(family, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
