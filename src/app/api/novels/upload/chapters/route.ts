import { NextRequest, NextResponse } from "next/server";
import {
  appendUploadedChapters,
  NovelUploadError,
  readChapterTitles,
  requireNovelUploader,
  uploadFailure,
} from "@/lib/novels/upload";

export async function POST(request: NextRequest) {
  try {
    const access = await requireNovelUploader();
    if (access.response) return access.response;
    const form = await request.formData();
    const slug = form.get("slug");
    if (typeof slug !== "string")
      throw new NovelUploadError("Novel slug is required");
    const titles = readChapterTitles(form.get("titles"));
    const files = form.getAll("chapters");
    if (
      files.some(
        (file) => !(file instanceof File) || !/\.(txt|md)$/i.test(file.name),
      )
    )
      throw new NovelUploadError("Chapter files must use TXT or MD format.");
    const chapters = await Promise.all(
      (files as File[]).map(async (file, index) => ({
        title: titles[index + 1] || `Chapter ${index + 1}`,
        content: await file.text(),
      })),
    );
    const result = await appendUploadedChapters(
      slug,
      chapters,
      access.session.userId,
    );
    return NextResponse.json({
      success: true,
      data: {
        addedChapters: result.added.length,
        totalChapters: result.all.length,
      },
      message: `Successfully uploaded ${result.added.length} chapters`,
    });
  } catch (error) {
    return uploadFailure(error);
  }
}
