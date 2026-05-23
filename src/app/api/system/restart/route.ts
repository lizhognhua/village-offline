import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST() {
  const a = await requireAdmin();
  if (a.error) return a.error;

  // Return response first, then exit
  const response = NextResponse.json({ success: true, message: "系统正在重启..." });

  // Schedule process exit after response is sent
  setTimeout(() => {
    process.exit(0);
  }, 500);

  return response;
}
