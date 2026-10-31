import connectDB from "@/lib/db/mongodb";
import NovelModel from "@/lib/db/models/Novel";
import ChapterModel from "@/lib/db/models/Chapter";
import { getObject } from "./r2";
import type { NovelMetadata, ChapterMetadata } from "@/types";

export async function remoteSlugs() {
  await connectDB();
  return (await NovelModel.find({ storageBackend: "r2", uploadState: "ready" }).select("slug").lean()).map((n) => n.slug!);
}
export async function remoteMetadata(slug: string): Promise<NovelMetadata | null> {
  await connectDB();
  const novel = await NovelModel.findOne({ slug, storageBackend: "r2", uploadState: "ready" }).lean();
  if (!novel) return null;
  return { slug, title: novel.title, author: novel.author, description: novel.description, genres: novel.genres,
    status: novel.status, coverImage: novel.coverObjectKey?.split("/").pop() || "", totalChapters: novel.totalChapters,
    addedAt: novel.createdAt.toISOString(), updatedAt: novel.updatedAt.toISOString() };
}
export async function remoteChapters(slug: string): Promise<ChapterMetadata[] | null> {
  if (!await remoteMetadata(slug)) return null;
  return (await ChapterModel.find({ novelSlug: slug, verified: true }).select("number title objectKey").sort({ number: 1 }).lean())
    .map((chapter) => ({ number: chapter.number, title: chapter.title, file: chapter.objectKey.split("/").pop()! }));
}
export async function remoteChapter(slug: string, number: number) {
  if (!await remoteMetadata(slug)) return null;
  const chapter = await ChapterModel.findOne({ novelSlug: slug, number, verified: true }).lean();
  if (!chapter) return null;
  return { number, title: chapter.title, content: (await getObject(chapter.objectKey)).toString("utf8") };
}
