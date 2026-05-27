import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rules } from "@/lib/validators";
import { requireAuth } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// GET /api/public-service — 获取办事登记列表
export async function GET(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  const role = a.session.user.role;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const requestType = searchParams.get("requestType") || "";
  const tag = searchParams.get("tag") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  try {
    const where: any = {};
    if (status) where.status = status;
    if (requestType) where.requestType = requestType;
    if (tag) where.tags = { contains: tag };

    const [items, total] = await Promise.all([
      prisma.publicService.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.publicService.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch {
    return NextResponse.json({ error: "获取列表失败" }, { status: 500 });
  }
}

// POST /api/public-service — 村民提交诉求 (public, no auth required for creation)
export async function POST(request: Request) {
  try {
    const body = sanitizeObject(await request.json());
    const { name, phone, requestType, description, staffIds, staffOther, photos, tags, createdAt } = body;

    if (!name || !description) {
      return NextResponse.json({ error: "姓名和详细描述不能为空" }, { status: 400 });
    }
    const vErr = rules.publicService(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // Offline single-team mode: always use default team
    const item = await prisma.publicService.create({
      data: {
        name: String(name),
        phone: String(phone || ""),
        requestType: String(requestType || "其他"),
        description: String(description),
        teamId: "team-kaoshan",
        staffIds: String(staffIds || ""),
        staffOther: String(staffOther || ""),
        photos: String(photos || ""),
        tags: String(tags || ""),
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, id: item.id });
  } catch (error: any) {
    console.error("PublicService POST error:", error?.message || error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}

// PUT /api/public-service — 更新处理状态
export async function PUT(request: Request) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const body = sanitizeObject(await request.json());
    const { id, status, handlerNote, name, phone, requestType, description, staffIds, staffOther, photos, tags } = body;
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });

    const existing = await prisma.publicService.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

    // Admin can update any record
    const role = a.session.user.role;

    const data: any = {};
    if (status) data.status = status;
    if (handlerNote !== undefined) data.handlerNote = handlerNote;
    if (name !== undefined) data.name = String(name);
    if (phone !== undefined) data.phone = String(phone);
    if (requestType !== undefined) data.requestType = String(requestType);
    if (description !== undefined) data.description = String(description);
    if (staffIds !== undefined) data.staffIds = String(staffIds);
    if (staffOther !== undefined) data.staffOther = String(staffOther);
    if (photos !== undefined) data.photos = String(photos);
    if (tags !== undefined) data.tags = String(tags);
    if (status === "已解决") { data.handledById = a.session.user.id; data.handledAt = new Date(); }

    const updated = await prisma.publicService.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
