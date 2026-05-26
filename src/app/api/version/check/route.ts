import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

const CURRENT_VERSION = "2.2";
const UPDATE_URL = "https://zc.lizhonghua.vip:8002/api/version";

export async function GET() {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    // Fetch latest version info from NAS
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(UPDATE_URL, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);

    if (!r.ok) {
      return NextResponse.json({ current: CURRENT_VERSION, latest: null, hasUpdate: false });
    }

    const remote = await r.json();
    const hasUpdate = remote.latest && remote.latest !== CURRENT_VERSION;

    return NextResponse.json({
      current: CURRENT_VERSION,
      latest: remote.latest,
      hasUpdate,
      url: remote.url || "",
      size: remote.size || 0,
      notes: remote.notes || "",
    });
  } catch {
    return NextResponse.json({ current: CURRENT_VERSION, latest: null, hasUpdate: false, offline: true });
  }
}
