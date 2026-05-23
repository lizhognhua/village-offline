import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveUploadWithThumb(
  file: File,
  module: string
): Promise<{ path: string; thumbPath: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const dateDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

  // Validate extension
  const allowed = ["jpg", "jpeg", "png", "gif", "webp", "heic"];
  const safeExt = allowed.includes(ext) ? ext : "jpg";

  const baseName = `${Date.now()}_${rand}`;
  const dir = path.join(UPLOADS_ROOT, module);
  const thumbDir = path.join(UPLOADS_ROOT, "thumb");
  await mkdir(dir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });

  // Compress original: max width 1920, quality 80%
  const compressed = await sharp(buf)
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const fileName = `${baseName}.jpg`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, compressed);

  // Generate thumbnail: 300px wide, quality 60%
  const thumb = await sharp(buf)
    .resize({ width: 300, withoutEnlargement: true })
    .jpeg({ quality: 60 })
    .toBuffer();

  const thumbName = `${baseName}_thumb.jpg`;
  const thumbPath = path.join(thumbDir, thumbName);
  await writeFile(thumbPath, thumb);

  return {
    path: `/api/uploads/${module}/${fileName}`,
    thumbPath: `/api/uploads/thumb/${thumbName}`,
  };
}
