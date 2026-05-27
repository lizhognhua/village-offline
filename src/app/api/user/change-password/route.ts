import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "请填写当前密码和新密码" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少6位" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { hashedPassword: true } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    const valid = await compare(currentPassword, user.hashedPassword);
    if (!valid) {
      return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
    }
    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: { hashedPassword } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
