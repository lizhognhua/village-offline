import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { readFile, unlink } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const { id } = await params;
    const doc = await prisma.fileDoc.findUnique({ where: { id } });
    if (!doc || !doc.filePath) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "data", "files", doc.filePath);
    const buf = await readFile(filePath);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAuth();
  if (a.error) return a.error;

  try {
    const { id } = await params;
    const doc = await prisma.fileDoc.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    if (doc.filePath) {
      try {
        await unlink(path.join(process.cwd(), "data", "files", doc.filePath));
      } catch {}
    }

    await prisma.fileDoc.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
