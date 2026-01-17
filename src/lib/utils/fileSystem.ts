import { promises as fs } from "fs";
import path from "path";
import { NovelMetadata, ChapterMetadata } from "@/types";

const NOVELS_DIR = path.join(process.cwd(), "data", "novels");

/**
 * Get all novel folders in data/novels
 */
export async function getNovelFolders(): Promise<string[]> {
  try {
    const entries = await fs.readdir(NOVELS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    console.error("Error reading novels directory:", error);
    return [];
  }
}

/**
 * Read novel metadata from folder
 */
export async function readNovelMetadata(
  slug: string
): Promise<NovelMetadata | null> {
  try {
    const metadataPath = path.join(NOVELS_DIR, slug, "metadata.json");
    const data = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading metadata for ${slug}:`, error);
    return null;
  }
}

/**
 * Read chapters.json from novel folder
 */
export async function readChaptersMetadata(
  slug: string
): Promise<ChapterMetadata[]> {
  try {
    const chaptersPath = path.join(NOVELS_DIR, slug, "chapters.json");
    const data = await fs.readFile(chaptersPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading chapters for ${slug}:`, error);
    return [];
  }
}

/**
 * Read chapter content
 */
export async function readChapterContent(
  slug: string,
  filename: string
): Promise<string | null> {
  try {
    const chapterPath = path.join(NOVELS_DIR, slug, "chapters", filename);
    return await fs.readFile(chapterPath, "utf-8");
  } catch (error) {
    console.error(`Error reading chapter ${filename} for ${slug}:`, error);
    return null;
  }
}

/**
 * Write novel metadata
 */
export async function writeNovelMetadata(
  slug: string,
  metadata: NovelMetadata
): Promise<void> {
  const metadataPath = path.join(NOVELS_DIR, slug, "metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
}

/**
 * Write chapters metadata
 */
export async function writeChaptersMetadata(
  slug: string,
  chapters: ChapterMetadata[]
): Promise<void> {
  const chaptersPath = path.join(NOVELS_DIR, slug, "chapters.json");
  await fs.writeFile(chaptersPath, JSON.stringify(chapters, null, 2), "utf-8");
}

/**
 * Create novel folder structure
 */
export async function createNovelFolder(slug: string): Promise<void> {
  const novelPath = path.join(NOVELS_DIR, slug);
  const chaptersPath = path.join(novelPath, "chapters");

  await fs.mkdir(novelPath, { recursive: true });
  await fs.mkdir(chaptersPath, { recursive: true });
}

/**
 * Check if novel exists
 */
export async function novelExists(slug: string): Promise<boolean> {
  try {
    const novelPath = path.join(NOVELS_DIR, slug);
    await fs.access(novelPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cover image path
 */
export function getCoverImagePath(slug: string, filename: string): string {
  return path.join(NOVELS_DIR, slug, filename);
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Detect chapter number from filename
 */
export function detectChapterNumber(filename: string): number | null {
  // Matches: "0001 - 1.txt", "chapter-1.txt", "ch1.txt", etc.
  const patterns = [
    /^(\d+)\s*-/, // "0001 - title.txt"
    /chapter[-_\s]*(\d+)/i, // "chapter-1.txt", "chapter_1.txt"
    /ch[-_\s]*(\d+)/i, // "ch-1.txt", "ch_1.txt"
    /^(\d+)/, // "1.txt"
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}
