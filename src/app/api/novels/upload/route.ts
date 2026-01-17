import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import NovelModel from "@/lib/db/models/Novel";
import UserModel from "@/lib/db/models/User"; // NEW
import {
  createNovelFolder,
  generateSlug,
  novelExists,
  writeNovelMetadata,
  writeChaptersMetadata,
} from "@/lib/utils/fileSystem";
import { writeFile } from "fs/promises";
import path from "path";
import type { ApiResponse, ChapterMetadata } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    await connectDB(); // ensure DB ready for permission check

    const user = await UserModel.findById(session.userId).select(
      "isAdmin canUpload"
    );
    if (!user || (!user.isAdmin && !user.canUpload)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" } as ApiResponse,
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const description = formData.get("description") as string;
    const genres = JSON.parse((formData.get("genres") as string) || "[]");
    const status =
      (formData.get("status") as "ongoing" | "completed" | "hiatus") ||
      "ongoing";

    if (!title || !author) {
      return NextResponse.json(
        {
          success: false,
          message: "Title and author are required",
        } as ApiResponse,
        { status: 400 }
      );
    }

    const slug = generateSlug(title);
    if (await novelExists(slug)) {
      return NextResponse.json(
        {
          success: false,
          message: "A novel with this title already exists",
        } as ApiResponse,
        { status: 400 }
      );
    }

    await createNovelFolder(slug);

    let coverFilename = "cover.jpg";
    const coverFile = formData.get("cover") as File | null;
    if (coverFile) {
      const ext = path.extname(coverFile.name);
      coverFilename = `cover${ext}`;
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const coverPath = path.join(
        process.cwd(),
        "data",
        "novels",
        slug,
        coverFilename
      );
      await writeFile(coverPath, coverBuffer);
    }

    const chaptersMetadata: ChapterMetadata[] = [];

    const metadata = {
      title,
      author,
      description,
      genres,
      status,
      coverImage: coverFilename,
      totalChapters: 0,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slug,
    };
    await writeNovelMetadata(slug, metadata);
    await writeChaptersMetadata(slug, chaptersMetadata);

    const novel = await NovelModel.create({
      title,
      author,
      description,
      genres,
      status,
      coverImage: `/api/novels/cover/${slug}/${coverFilename}`,
      customCover: coverFile
        ? `/api/novels/cover/${slug}/${coverFilename}`
        : undefined,
      folderPath: `data/novels/${slug}`,
      addedBy: session.userId,
      isPublic: false,
      totalChapters: 0,
    });

    return NextResponse.json(
      {
        success: true,
        data: { novel, slug },
        message: "Novel created successfully. Now upload chapters.",
      } as ApiResponse,
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Novel upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload novel",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
