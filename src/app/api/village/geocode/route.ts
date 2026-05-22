import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject } from "@/lib/sanitize";

const TDK = process.env.TIANDITU_KEY;

export async function GET(req: NextRequest) {
  if (!TDK) return NextResponse.json({ error: "天地图未配置" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return NextResponse.json({ error: "缺少关键词" }, { status: 400 });
  }

  try {
    const url = `https://api.tianditu.gov.cn/geocoder?ds={"keyWord":"${encodeURIComponent(keyword)}"}&tk=${TDK}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== "0" && data.status !== 0) {
      return NextResponse.json({ error: data.msg || "地理编码失败" }, { status: 400 });
    }

    const locations = data.result?.location || [];
    return NextResponse.json({ locations });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
