import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  // Verify project belongs to user's team
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }
  const milestones = await prisma.projectMilestone.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(milestones);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;
  // Verify project belongs to user's team
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }
  let body = await req.json()
    body = sanitizeObject(body);
  const milestone = await prisma.projectMilestone.create({ data: { ...body, projectId: id } });
  return NextResponse.json(milestone, { status: 201 });
}