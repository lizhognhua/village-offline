import { NextRequest, NextResponse } from "next/server";

// 瓦片代理 — 解决国内访问国外瓦片源的问题
// GET /api/tiles/{z}/{x}/{y} → ArcGIS 卫星图
export async function GET(
  request: NextRequest,
  { params }: { params: { z: string; x: string; y: string } }
) {
  try {
    const { z, x, y } = params;
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const buffer = await resp.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
