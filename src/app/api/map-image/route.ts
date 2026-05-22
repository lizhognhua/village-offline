import { NextResponse } from "next/server";

// 高德静态地图 API — 服务端代理（API Key 不暴露给前端）
const AMAP_KEY = process.env.AMAP_KEY;

export async function GET() {
  if (!AMAP_KEY) return NextResponse.json({ error: "AMAP_KEY 未配置" }, { status: 500 });
  try {
    // 绥棱县中心坐标 127.111°E, 47.236°N | zoom=12 县级视图
    const url = `https://restapi.amap.com/v3/staticmap?location=127.111,47.236&zoom=12&size=1920*1080&scale=1&key=${AMAP_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Amap returned ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
