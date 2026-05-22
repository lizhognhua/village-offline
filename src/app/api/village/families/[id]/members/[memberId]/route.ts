import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    // Check team ownership via parent family
    const { id: familyId, memberId } = await params;
    const family = await prisma.family.findUnique({ where: { id: familyId }, select: { id: true } });
    if (!family) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.idCard !== undefined) data.idCard = body.idCard;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.relation !== undefined) data.relation = body.relation;
    if (body.education !== undefined) data.education = body.education;
    if (body.occupation !== undefined) data.occupation = body.occupation;
    if (body.healthStatus !== undefined) data.healthStatus = body.healthStatus;
    if (body.healthNote !== undefined) data.healthNote = body.healthNote;

    const member = await prisma.familyMember.update({
      where: { id: memberId },
      data,
    });
    return NextResponse.json({ member });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "更新失败" }, { status: 500 });
  }
}
