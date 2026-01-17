import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function writeChapter(
  novelFolderPath: string,
  chapterNumber: number,
  content: string
): Promise<string> {
  await ensureDir(novelFolderPath);
  const filename = `chapter-${chapterNumber}.txt`;
  const filePath = path.join(novelFolderPath, filename);
  await fs.writeFile(filePath, content, "utf-8");
  return filename;
}

export async function readChapter(
  novelFolderPath: string,
  fileName: string
): Promise<string> {
  const filePath = path.join(novelFolderPath, fileName);
  return await fs.readFile(filePath, "utf-8");
}

export async function deleteNovelFolder(folderPath: string): Promise<void> {
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
  }
}

export async function saveUploadedFile(
  file: File,
  uploadDir: string
): Promise<string> {
  await ensureDir(uploadDir);

  const fileExtension = file.name.split(".").pop();
  const filename = `${uuidv4()}.${fileExtension}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return filename;
}
