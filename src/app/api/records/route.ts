import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";

    const where: any = {};
    if (search) where.family = { headName: { contains: search } };
    if (type && (type === "visit" || type === "condolence")) where.type = type;

    const [records, total] = await Promise.all([
      prisma.householdRecord.findMany({
        where, skip, take: limit, orderBy: { recordDate: "desc" },
        include: { family: { select: { headName: true, familyAttr: true } } },
      }),
      prisma.householdRecord.count({ where }),
    ]);
    return NextResponse.json({ records, total, page, totalPages: Math.ceil(total / limit) });
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
        type: fd.get("type") || "visit",
        familyId: fd.get("familyId"),
        recordDate: fd.get("visitDate") || fd.get("recordDate"),
        content: fd.get("content"),
        statusTags: fd.get("statusTags") || "[]",
        items: fd.get("items") || "[]",
        staff: fd.get("staff") || "",
      });
      const photos = fd.getAll("photos") as File[];
      for (const f of photos) {
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
        const name = prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), buf);
        photoPaths.push("/api/uploads/" + name);
      }
    } else {
      body = sanitizeObject(await req.json());
    }

    const record = await prisma.householdRecord.create({
      data: {
        type: body.type || "visit",
        familyId: body.familyId,
        recordDate: new Date(body.recordDate),
        content: body.content,
        photos: JSON.stringify(photoPaths.length ? photoPaths : (body.photos || "[]")),
        statusTags: typeof body.statusTags === "string" ? body.statusTags : JSON.stringify(body.statusTags || []),
        items: typeof body.items === "string" ? body.items : JSON.stringify(body.items || []),
        staff: body.staff || null,
        createdById: session.user.id,
      },
      include: { family: { select: { headName: true } } },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}