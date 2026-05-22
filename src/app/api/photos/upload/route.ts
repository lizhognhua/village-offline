import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { saveUploadWithThumb } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const fd = await req.formData();
    const files = fd.getAll("file") as File[];
    if (!files.length) {
      return NextResponse.json({ success: false, error: "未选择文件" }, { status: 400 });
    }

    const results = [];
    for (const file of files) {
      if (!file.size) continue;
      const { path, thumbPath } = await saveUploadWithThumb(file, "photos");
      results.push({ url: path, thumbUrl: thumbPath, name: file.name });
    }

    if (!results.length) {
      return NextResponse.json({ success: false, error: "没有有效文件" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: results[0].url,
      thumbUrl: results[0].thumbUrl,
      name: results[0].name,
      urls: results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
