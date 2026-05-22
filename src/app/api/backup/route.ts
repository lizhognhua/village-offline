import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { createBackup } from "@/lib/backup";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const buf = await createBackup();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="village-backup-${date}.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "备份失败" }, { status: 500 });
  }
}
