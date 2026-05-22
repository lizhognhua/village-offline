import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) where.family = { headName: { contains: search } };

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where, skip, take: limit, orderBy: { visitDate: "desc" },
        include: { family: { select: { headName: true, familyAttr: true } }, visitor: { select: { name: true } } },
      }),
      prisma.visit.count({ where }),
    ]);
    return NextResponse.json({ visits, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const a = await requireAdmin();
    if (a.error) return a.error;
    const session = a.session;

    let body: any;
    let photoPaths: string[] = [];

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = sanitizeObject({
        familyId: fd.get("familyId"), visitDate: fd.get("visitDate"), content: fd.get("content"), statusTags: fd.get("statusTags") || "[]",
        staff: fd.get("staff") || "",
      });
      const photos = fd.getAll("photos") as File[];
      for (const f of photos) {
        let ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        let buf = Buffer.from(await f.arrayBuffer());
        // Convert HEIC to JPEG (use heic-convert, sharp lacks HEVC on Alpine)
        if (ext === "heic" || ext === "heif") {
          try {
            const { default: heicConvert } = await import("heic-convert");
            buf = Buffer.from(await heicConvert({ buffer: buf, format: "JPEG", quality: 0.85 }));
            ext = "jpg";
          } catch (e) {
            console.error("HEIC conversion failed:", e.message);
          }
        }
        const name = `visit_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), buf);
        photoPaths.push(`/api/uploads/${name}`);
      }
    } else {
      body = await req.json();
    body = sanitizeObject(body);
    }

    const visit = await prisma.visit.create({
      data: {
        familyId: body.familyId, visitDate: new Date(body.visitDate), content: body.content,
        visitorId: session.user.id, photos: JSON.stringify(photoPaths.length ? photoPaths : (body.photos || "[]")),
        statusTags: typeof body.statusTags === "string" ? body.statusTags : JSON.stringify(body.statusTags || []),
        staff: body.staff || null,
      },
      include: { family: { select: { headName: true } }, visitor: { select: { name: true } } },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}