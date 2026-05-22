import { requireAdmin } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const baseUrl = process.env.SIYUAN_BASE_URL || "NOT_SET";
    
    let result: any = { baseUrl };
    
    try {
      const res = await fetch(baseUrl + "/api/system/version", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      result.siyuanVersion = data;
    } catch(e: any) {
      result.siyuanError = e.message;
    }
    
    return NextResponse.json(result);
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}