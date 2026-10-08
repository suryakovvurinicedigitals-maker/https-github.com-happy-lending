import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export async function saveUpload(
  loanId: number,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, "loans", String(loanId));
  await mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, buffer);

  return path.relative(UPLOADS_ROOT, filePath);
}

export function resolveUploadPath(relativePath: string): string {
  const resolved = path.resolve(UPLOADS_ROOT, relativePath);
  if (!resolved.startsWith(UPLOADS_ROOT)) {
    throw new Error("Invalid upload path");
  }
  return resolved;
}
