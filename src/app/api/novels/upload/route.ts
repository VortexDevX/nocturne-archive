import { usesR2 } from "@/lib/storage/config";
import { NextRequest, NextResponse } from "next/server";
import {
  createUploadedNovel,
  NovelUploadError,
  requireNovelUploader,
  uploadFailure,
} from "@/lib/novels/upload";

export async function POST(request: NextRequest) {
  try {
    const access = await requireNovelUploader();
    if (access.response) return access.response;
    if (usesR2()) return NextResponse.json({ success: false, message: "Use direct storage uploads" }, { status: 409 });
    const form = await request.formData();
    let genres: unknown;
    try {
      genres = JSON.parse(String(form.get("genres") || "[]"));
    } catch {
      throw new NovelUploadError("Invalid genres");
    }
    const cover = form.get("cover");
    if (cover !== null && !(cover instanceof File))
      throw new NovelUploadError("Invalid cover image");
    const data = await createUploadedNovel(
      {
        title: form.get("title"),
        author: form.get("author"),
        description: form.get("description") || "",
        genres,
        status: form.get("status") || "ongoing",
      },
      access.session.userId,
      cover || undefined,
    );
    return NextResponse.json(
      {
        success: true,
        data,
        message: "Novel created successfully. Now upload chapters.",
      },
      { status: 201 },
    );
  } catch (error) {
    return uploadFailure(error);
  }
}
