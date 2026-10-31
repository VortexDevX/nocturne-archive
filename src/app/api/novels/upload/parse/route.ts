import { usesR2 } from "@/lib/storage/config";
import { NextRequest, NextResponse } from "next/server";
import { parseChaptersFromText } from "@/lib/utils/chapterParser";
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
    if (usesR2()) return NextResponse.json({ success: false, message: "Use direct storage uploads" }, { status: 409 });
    const form = await request.formData();
    const slug = form.get("slug");
    const file = form.get("file");
    if (typeof slug !== "string" || !(file instanceof File))
      throw new NovelUploadError("Slug and file required");
    if (!/\.(txt|md)$/i.test(file.name))
      throw new NovelUploadError("Unsupported file type (use TXT or MD)");
    const titles = readChapterTitles(form.get("titles"));
    const parsed = parseChaptersFromText(await file.text());
    if (!parsed.length)
      throw new NovelUploadError(
        "No chapters found in file. Check chapter markers.",
      );
    const result = await appendUploadedChapters(
      slug,
      parsed.map((chapter) => ({
        title:
          titles[chapter.number] ||
          chapter.title ||
          `Chapter ${chapter.number}`,
        content: chapter.content,
      })),
      access.session.userId,
    );
    return NextResponse.json({
      success: true,
      data: {
        parsedChapters: result.added.length,
        totalChapters: result.all.length,
        chapters: result.added,
      },
      message: `Successfully parsed and uploaded ${result.added.length} chapters`,
    });
  } catch (error) {
    return uploadFailure(error);
  }
}
