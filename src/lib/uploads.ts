import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

/**
 * Persist an uploaded File under UPLOAD_DIR (or ./uploads).
 * Returns a web-relative path like `/uploads/{subdir}/{unique}-{name}`.
 */
export async function saveUpload(
  file: File,
  subdir: string
): Promise<{ fileName: string; filePath: string; mimeType: string }> {
  const safeSubdir = subdir.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
  if (!safeSubdir) throw new Error("subdir is required");

  const originalName = sanitizeFileName(file.name || "upload.bin");
  const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const storedName = `${unique}-${originalName}`;

  const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  const absDir = path.join(uploadRoot, safeSubdir);
  await mkdir(absDir, { recursive: true });

  const absPath = path.join(absDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  const mimeType = file.type || "application/octet-stream";
  const filePath = `/uploads/${safeSubdir}/${storedName}`;

  return {
    fileName: originalName,
    filePath,
    mimeType,
  };
}
