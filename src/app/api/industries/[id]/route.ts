import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const industry = await prisma.industry.findUnique({ where: { id } });
    if (!industry) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(industry);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

function mapBody(body: any) {
  const data: any = { ...body };
  // Map frontend field names to DB columns
  if (body.images !== undefined) { data.photos = body.images; delete data.images; }
  if (body.videos !== undefined) { /* videos stored as-is */ }
  if (body.links !== undefined) { /* links stored as-is */ }
  if (body.startDate !== undefined) { data.startDate = body.startDate ? new Date(body.startDate) : null; }
  return data;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const existing = await prisma.industry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "产业不存在" }, { status: 404 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const data = mapBody(body);
    const industry = await prisma.industry.update({ where: { id }, data });
    return NextResponse.json(industry);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  try {
    const existing = await prisma.industry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "产业不存在" }, { status: 404 });
    }
    let body = await req.json()
    body = sanitizeObject(body);
    const data = mapBody(body);
    const industry = await prisma.industry.update({ where: { id }, data });
    return NextResponse.json(industry);
  } catch (error: any) { return NextResponse.json({ error: "服务器内部错误" }, { status: 500 }); }
}

