import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { generateTemplate } from "@/lib/import-templates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const type = req.nextUrl.searchParams.get("type") || "";
    if (!["family", "member", "party"].includes(type)) {
      return NextResponse.json({ error: "无效类型，可选: family, member, party" }, { status: 400 });
    }

    // Get village groups for family template
    let groups: { name: string }[] = [];
    if (type === "family") {
      groups = await prisma.villageGroup.findMany({
        where: { type: "tun" },
        select: { name: true },
      });
    }

    const buf = generateTemplate(type, groups);
    const names: Record<string, string> = {
      family: "村民户数据导入样表.xlsx",
      member: "家庭成员导入样表.xlsx",
      party: "党员信息导入样表.xlsx",
    };

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(names[type])}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: `生成样表失败: ${e.message}` }, { status: 500 });
  }
}
