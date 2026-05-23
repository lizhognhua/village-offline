import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
    const userId = a.session.user.id;
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    const [condolences, total] = await Promise.all([
      prisma.condolence.findMany({
        where, skip, take: limit, orderBy: { condolenceDate: "desc" },
        include: { family: { select: { headName: true, familyAttr: true } } },
      }),
      prisma.condolence.count({ where }),
    ]);
    return NextResponse.json({ condolences, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
    const userId = a.session.user.id;
  try {
    let body: any;
    let photoPaths: string[] = [];

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = sanitizeObject({ familyId: fd.get("familyId"), condolenceDate: fd.get("condolenceDate"), content: fd.get("content"), items: fd.get("items") || "[]", staff: fd.get("staff") || "" });
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
        const name = `condolence_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), buf);
        photoPaths.push(`/api/uploads/${name}`);
      }
    } else {
      body = sanitizeObject(await req.json());
    }

    const condolence = await prisma.condolence.create({
      data: {
        createdById: userId,
        familyId: body.familyId, condolenceDate: new Date(body.condolenceDate), content: body.content,
        items: typeof body.items === "string" ? body.items : JSON.stringify(body.items || []),
        staff: body.staff || "", photos: JSON.stringify(photoPaths),
      },
      include: { family: { select: { headName: true } } },
    });

    return NextResponse.json(condolence, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}