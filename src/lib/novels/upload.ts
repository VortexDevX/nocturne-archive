import path from "path";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import NovelModel from "@/lib/db/models/Novel";
import UserLibraryModel from "@/lib/db/models/UserLibrary";
import {
  createNovelFolder,
  generateSlug,
  getNovelDirectory,
  isSafePathSegment,
  novelExists,
  readNovelMetadata,
  readChaptersMetadata,
  writeNovelMetadata,
  writeChaptersMetadata,
} from "@/lib/utils/fileSystem";
import type { ChapterMetadata, NovelMetadata } from "@/types";

export class NovelUploadError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function requireNovelUploader() {
  const session = await getSession();
  if (!session)
    return {
      response: NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 },
      ),
    };
  await connectDB();
  const user = await UserModel.findById(session.userId).select(
    "isAdmin canUpload",
  );
  if (!user || (!user.isAdmin && !user.canUpload))
    return {
      response: NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      ),
    };
  return { session };
}

const novelInput = z.object({
  title: z.string().trim().min(1),
  author: z.string().trim().min(1),
  description: z.string().default(""),
  genres: z.array(z.string()).default([]),
  status: z.enum(["ongoing", "completed", "hiatus"]).default("ongoing"),
});

export async function createUploadedNovel(
  input: unknown,
  userId: string,
  cover?: File,
) {
  const parsed = novelInput.safeParse(input);
  if (!parsed.success)
    throw new NovelUploadError(
      "Enter a title, author, valid genres and publication status.",
    );
  const details = parsed.data;
  const slug =
    generateSlug(details.title).slice(0, 100) || `novel_${randomUUID()}`;
  const extension = cover ? path.extname(cover.name).toLowerCase() : "";
  if (cover && ![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    throw new NovelUploadError(
      "Invalid cover image type. Allowed: jpg, jpeg, png, webp",
    );
  }
  if (await novelExists(slug))
    throw new NovelUploadError("A novel with this title already exists", 409);
  await createNovelFolder(slug);
  const directory = await getNovelDirectory(slug);
  const coverImage = cover ? `cover${extension}` : "";
  if (cover)
    await writeFile(
      path.join(directory, coverImage),
      Buffer.from(await cover.arrayBuffer()),
      { flag: "wx" },
    );
  const metadata: NovelMetadata = {
    ...details,
    slug,
    coverImage,
    totalChapters: 0,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeNovelMetadata(slug, metadata);
  await writeChaptersMetadata(slug, []);
  const coverUrl = coverImage ? `/api/novels/cover/${slug}/${coverImage}` : "";
  const novel = await NovelModel.create({
    ...details,
    slug,
    coverImage: coverUrl,
    customCover: coverUrl,
    folderPath: path
      .relative(process.cwd(), directory)
      .split(path.sep)
      .join("/"),
    addedBy: userId,
    isPublic: false,
    totalChapters: 0,
  });
  return { novel, slug };
}

export function readChapterTitles(
  value: FormDataEntryValue | null,
): Record<string, string> {
  if (value === null) return {};
  if (typeof value !== "string")
    throw new NovelUploadError("Invalid chapter titles");
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.values(parsed).some((title) => typeof title !== "string")
    )
      throw new Error();
    return parsed as Record<string, string>;
  } catch {
    throw new NovelUploadError("Invalid chapter titles");
  }
}

export async function appendUploadedChapters(
  slug: string,
  chapters: { title: string; content: string }[],
  userId: string,
) {
  if (!isSafePathSegment(slug))
    throw new NovelUploadError("Invalid novel slug");
  const metadata = await readNovelMetadata(slug);
  if (!metadata)
    throw new NovelUploadError(
      "Novel not found. Create novel details first.",
      404,
    );
  if (!chapters.length || chapters.some((chapter) => !chapter.content.trim()))
    throw new NovelUploadError("Select at least one non-empty chapter file.");
  const existing = await readChaptersMetadata(slug);
  const start = existing.reduce(
    (max, chapter) => Math.max(max, chapter.number),
    0,
  );
  const directory = await getNovelDirectory(slug);
  const added: ChapterMetadata[] = [];
  await mkdir(path.join(directory, "chapters"), { recursive: true });
  for (const [index, chapter] of chapters.entries()) {
    const number = start + index + 1;
    const file = `chapter-${number}.txt`;
    await writeFile(path.join(directory, "chapters", file), chapter.content, {
      encoding: "utf-8",
      flag: "wx",
    });
    added.push({
      number,
      title: chapter.title.trim() || `Chapter ${number}`,
      file,
    });
  }
  const all = [...existing, ...added];
  await writeChaptersMetadata(slug, all);
  await writeNovelMetadata(slug, {
    ...metadata,
    totalChapters: all.length,
    updatedAt: new Date().toISOString(),
  });
  await NovelModel.updateOne(
    {
      $or: [
        { slug },
        { folderPath: `data/novels/${slug}` },
        { folderPath: `uploads/novels/${slug}` },
      ],
    },
    { $set: { slug, totalChapters: all.length } },
  );
  await UserLibraryModel.findOneAndUpdate(
    { userId, novelId: slug },
    {
      $setOnInsert: {
        userId,
        novelId: slug,
        status: "plan_to_read",
        isFavorite: false,
        addedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
  return { added, all };
}

export function uploadFailure(error: unknown) {
  const known = error instanceof NovelUploadError;
  const collision =
    (error as NodeJS.ErrnoException)?.code === "EEXIST" ||
    (error as { code?: number })?.code === 11000;
  if (!known && !collision) console.error("Novel upload failed:", error);
  return NextResponse.json(
    {
      success: false,
      message: known
        ? error.message
        : collision
          ? "This novel or chapter already exists. Refresh before uploading again."
          : "Failed to save novel files. Check storage permissions and try again.",
    },
    { status: known ? error.status : collision ? 409 : 500 },
  );
}
