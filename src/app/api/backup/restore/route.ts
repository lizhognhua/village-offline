import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { restoreBackup } from "@/lib/backup";

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const fd = await req.formData();
    const file = fd.get("file") as File;
    if (!file || !file.size) {
      return NextResponse.json({ error: "请选择备份文件" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length < 100) {
      return NextResponse.json({ error: "备份文件无效" }, { status: 400 });
    }

    const result = await restoreBackup(buf);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "数据已恢复，请重启系统" });
  } catch {
    return NextResponse.json({ error: "恢复失败" }, { status: 500 });
  }
}
