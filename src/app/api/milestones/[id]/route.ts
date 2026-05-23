import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  // Check team ownership via parent project
  const existing = await prisma.projectMilestone.findUnique({ where: { id }, include: { project: true } });
  if (!existing) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }
  let body = await req.json()
    body = sanitizeObject(body);
  const milestone = await prisma.projectMilestone.update({ where: { id }, data: body });
  return NextResponse.json(milestone);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  // Check team ownership via parent project
  const existing = await prisma.projectMilestone.findUnique({ where: { id }, include: { project: true } });
  if (!existing) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }
  await prisma.projectMilestone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}