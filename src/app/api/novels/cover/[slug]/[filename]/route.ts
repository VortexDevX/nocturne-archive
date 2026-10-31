import { getSession } from "@/lib/auth/session";
import { usesR2, allowsLocalFallback } from "@/lib/storage/config";
import connectDB from "@/lib/db/mongodb";
import NovelModel from "@/lib/db/models/Novel";
import { getObject } from "@/lib/storage/r2";
import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getCoverImagePath, isSafePathSegment } from "@/lib/utils/fileSystem";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> },
) {
  try {
    if (!await getSession()) return new NextResponse("Unauthorized", { status: 401 });
    const { slug, filename } = await params;
    if (
      !isSafePathSegment(slug) ||
      !isSafePathSegment(filename) ||
      !/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
    )
      return new NextResponse("Cover not found", { status: 404 });
    if (usesR2()) {
      await connectDB();
      const novel = await NovelModel.findOne({ slug, storageBackend: "r2", uploadState: "ready" }).select("coverObjectKey").lean();
      if (novel?.coverObjectKey && novel.coverObjectKey.split("/").pop() === filename) {
        const type = /\.jpe?g$/i.test(filename) ? "image/jpeg" : `image/${filename.split(".").pop()}`;
        return new NextResponse(new Uint8Array(await getObject(novel.coverObjectKey)), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" } });
      }
      if (!allowsLocalFallback()) return new NextResponse("Cover not found", { status: 404 });
    }
    const filepath = await getCoverImagePath(slug, filename);

    if (!(await stat(filepath)).isFile()) {
      return new NextResponse("Cover not found", { status: 404 });
    }

    const file = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();

    const contentTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new NextResponse("Cover not found", { status: 404 });
    console.error("Cover serve error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
