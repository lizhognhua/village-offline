import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { getBackupInfo } from "@/lib/backup";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const info = await getBackupInfo();
    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ error: "获取信息失败" }, { status: 500 });
  }
}
