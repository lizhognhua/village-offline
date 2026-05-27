import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rules, clean } from "@/lib/validators";
import { requireAuth } from "@/lib/auth-utils";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const member = await prisma.partyMember.findUnique({ where: { id: (await params).id } });
    if (!member) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    let body = await req.json();
    body = sanitizeObject(body);
    const vErr = rules.partyMember(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    if (body.name) body.name = clean.name(body.name);
    if (body.phone) body.phone = clean.phone(body.phone);
    const member = await prisma.partyMember.update({ where: { id: (await params).id }, data: body });
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const existing = await prisma.partyMember.findUnique({ where: { id: (await params).id } });
    if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
    await prisma.partyMember.delete({ where: { id: (await params).id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
