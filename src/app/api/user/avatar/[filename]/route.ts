import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filepath = path.join(
      process.cwd(),
      "data",
      "uploads",
      "avatars",
      filename
    );

    if (!existsSync(filepath)) {
      return new NextResponse("File not found", { status: 404 });
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

    // Convert buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Avatar serve error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
