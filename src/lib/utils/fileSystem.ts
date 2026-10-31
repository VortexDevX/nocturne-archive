import { usesR2, allowsLocalFallback } from "@/lib/storage/config";
import { promises as fs } from "fs";
import path from "path";
import { NovelMetadata, ChapterMetadata } from "@/types";

const NOVELS_DIR = path.join(process.cwd(), "uploads", "novels");
const LEGACY_NOVELS_DIR = path.join(process.cwd(), "data", "novels");

export function isSafePathSegment(value: string): boolean {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !/[\\/\0]/.test(value) &&
    path.basename(value) === value
  );
}

function requireSafeSegment(value: string) {
  if (!isSafePathSegment(value)) throw new Error("Invalid novel path");
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

/** Resolve existing uploads first, then verified legacy storage. Never move books. */
export async function getNovelDirectory(slug: string): Promise<string> {
  requireSafeSegment(slug);
  for (const root of [NOVELS_DIR, LEGACY_NOVELS_DIR]) {
    const directory = path.join(root, slug);
    try {
      if ((await fs.stat(directory)).isDirectory()) return directory;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
  return path.join(NOVELS_DIR, slug);
}

/**
 * List both storage roots. An empty installation has no novels yet.
 */
export async function getNovelFolders(): Promise<string[]> {
  const folders = new Set<string>();
  if (usesR2()) {
    for (const slug of await (await import("@/lib/storage/catalog")).remoteSlugs()) folders.add(slug);
    if (!allowsLocalFallback()) return [...folders];
  }
  for (const root of [NOVELS_DIR, LEGACY_NOVELS_DIR]) {
    try {
      await fs.stat(root);
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const entry of entries)
        if (entry.isDirectory()) folders.add(entry.name);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
  return [...folders].sort();
}

/**
 * Read novel metadata from folder
 */
export async function readNovelMetadata(
  slug: string,
): Promise<NovelMetadata | null> {
  requireSafeSegment(slug);
  if (usesR2()) {
    const metadata = await (await import("@/lib/storage/catalog")).remoteMetadata(slug);
    if (metadata || !allowsLocalFallback()) return metadata;
  }
  try {
    const metadataPath = path.join(
      await getNovelDirectory(slug),
      "metadata.json",
    );
    const data = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

/**
 * Read chapters.json from novel folder
 */
export async function readChaptersMetadata(
  slug: string,
): Promise<ChapterMetadata[]> {
  requireSafeSegment(slug);
  if (usesR2()) {
    const chapters = await (await import("@/lib/storage/catalog")).remoteChapters(slug);
    if (chapters || !allowsLocalFallback()) return chapters || [];
  }
  try {
    const chaptersPath = path.join(
      await getNovelDirectory(slug),
      "chapters.json",
    );
    const data = await fs.readFile(chaptersPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
}

/**
 * Read chapter content
 */
export async function readChapterContent(
  slug: string,
  filename: string,
): Promise<string | null> {
  requireSafeSegment(slug);
  requireSafeSegment(filename);
  if (usesR2()) {
    const number = Number(filename.match(/^(?:chapter-)?(\d+)\.txt$/)?.[1]);
    const chapter = number ? await (await import("@/lib/storage/catalog")).remoteChapter(slug, number) : null;
    if (chapter || !allowsLocalFallback()) return chapter?.content || null;
  }
  try {
    requireSafeSegment(filename);
    const chapterPath = path.join(
      await getNovelDirectory(slug),
      "chapters",
      filename,
    );
    return await fs.readFile(chapterPath, "utf-8");
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

/**
 * Write novel metadata
 */
export async function writeNovelMetadata(
  slug: string,
  metadata: NovelMetadata,
): Promise<void> {
  const metadataPath = path.join(
    await getNovelDirectory(slug),
    "metadata.json",
  );
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
}

/**
 * Write chapters metadata
 */
export async function writeChaptersMetadata(
  slug: string,
  chapters: ChapterMetadata[],
): Promise<void> {
  const chaptersPath = path.join(
    await getNovelDirectory(slug),
    "chapters.json",
  );
  await fs.writeFile(chaptersPath, JSON.stringify(chapters, null, 2), "utf-8");
}

/**
 * Create novel folder structure
 */
export async function createNovelFolder(slug: string): Promise<void> {
  requireSafeSegment(slug);
  await fs.mkdir(NOVELS_DIR, { recursive: true });
  const novelPath = path.join(NOVELS_DIR, slug);
  const chaptersPath = path.join(novelPath, "chapters");

  // Reserve the folder atomically; simultaneous imports cannot overwrite each other.
  await fs.mkdir(novelPath);
  await fs.mkdir(chaptersPath, { recursive: true });
}

/**
 * Check if novel exists
 */
export async function novelExists(slug: string): Promise<boolean> {
  if (usesR2()) return Boolean(await readNovelMetadata(slug));
  try {
    const novelPath = await getNovelDirectory(slug);
    await fs.access(novelPath);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/**
 * Get cover image path
 */
export async function getCoverImagePath(
  slug: string,
  filename: string,
): Promise<string> {
  requireSafeSegment(filename);
  return path.join(await getNovelDirectory(slug), filename);
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
