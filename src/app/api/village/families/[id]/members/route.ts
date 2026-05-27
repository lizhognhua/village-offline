import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { rules } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const { id: familyId } = await params;
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) return NextResponse.json({ error: "无权操作" }, { status: 403 });

    const body = await req.json();
    if (!body.name || !body.relation) {
      return NextResponse.json({ error: "姓名和与户主关系为必填" }, { status: 400 });
    }
    const vErr = rules.familyMember(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const data: any = { name: body.name, relation: body.relation, familyId };
    if (body.gender) data.gender = body.gender;
    if (body.idCard) data.idCard = body.idCard;
    if (body.phone) data.phone = body.phone;
    if (body.birthDate) data.birthDate = new Date(body.birthDate);
    if (body.education) data.education = body.education;
    if (body.occupation) data.occupation = body.occupation;
    if (body.healthStatus) data.healthStatus = body.healthStatus;
    if (body.healthNote) data.healthNote = body.healthNote;

    const member = await prisma.familyMember.create({ data });
    return NextResponse.json({ member }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "创建失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    const { id: familyId } = await params;
    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "缺少成员ID" }, { status: 400 });

    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) return NextResponse.json({ error: "无权操作" }, { status: 403 });

    await prisma.familyMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "删除失败" }, { status: 500 });
  }
}
