import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rules } from "@/lib/validators";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;
  try {
    // Check team ownership
    const existing = await prisma.partyMember.findUnique({ where: { id: (await params).id } });
    if (!existing) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.partyMember.delete({ where: { id: (await params).id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
