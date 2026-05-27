import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

// GET /api/todos?planType=今日计划&mine=1
export async function GET(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const planType = req.nextUrl.searchParams.get("planType") || "";
    const mine = req.nextUrl.searchParams.get("mine") === "1";
    const where: any = {};
    if (planType) where.planType = planType;
    if (mine) where.createdById = a.session.user.id;

    const todos = await prisma.project.findMany({
      where,
      orderBy: [{ priority: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(todos);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/todos — 创建个人待办
export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const body = await req.json();
    const todo = await prisma.project.create({
      data: {
        title: body.title,
        planType: body.planType || "一般任务",
        priority: body.priority || "中",
        status: body.status || "pending",
        deadline: body.deadline ? new Date(body.deadline) : null,
        category: "todo",
        createdById: a.session.user.id,
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/todos — 更新待办（状态/进度切换）
export async function PUT(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const body = await req.json();
    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.progress !== undefined) data.progress = body.progress;
    if (body.title !== undefined) data.title = body.title;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.planType !== undefined) data.planType = body.planType;

    const todo = await prisma.project.update({ where: { id: body.id }, data });
    return NextResponse.json(todo);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/todos?id=xxx
export async function DELETE(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
