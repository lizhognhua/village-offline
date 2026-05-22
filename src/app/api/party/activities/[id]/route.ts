import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;

  try {
    const existing = await prisma.partyActivity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.location !== undefined) data.location = body.location;
    if (body.content !== undefined) data.content = body.content;
    if (body.participants !== undefined) data.participants = body.participants;
    if (body.photos !== undefined) data.photos = typeof body.photos === "string" ? body.photos : JSON.stringify(body.photos);
    if (body.files !== undefined) data.files = typeof body.files === "string" ? body.files : JSON.stringify(body.files);

    const record = await prisma.partyActivity.update({ where: { id }, data });
    return NextResponse.json({ record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  const { id } = await params;

  try {
    const existing = await prisma.partyActivity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.partyActivity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
