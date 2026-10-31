import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import { getObject } from "@/lib/storage/r2";
import { usesR2, allowsLocalFallback } from "@/lib/storage/config";
import { isSafePathSegment } from "@/lib/utils/fileSystem";

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  if (!await getSession()) return new NextResponse("Unauthorized", { status: 401 });
  const { filename } = await params;
  if (!isSafePathSegment(filename) || !/\.(jpe?g|png|webp)$/i.test(filename)) return new NextResponse("Not found", { status: 404 });
  try {
    let file: Buffer | undefined;
    if (usesR2()) {
      await connectDB();
      const user = await UserModel.findOne({ profilePicture: `/api/user/avatar/${filename}` }).select("avatarObjectKey").lean();
      if (user?.avatarObjectKey) file = await getObject(user.avatarObjectKey);
      else if (!allowsLocalFallback()) return new NextResponse("Not found", { status: 404 });
    }
    if (!file) {
      const filepath = path.join(process.cwd(), "data", "uploads", "avatars", filename);
      if (!(await stat(filepath)).isFile()) return new NextResponse("Not found", { status: 404 });
      file = await readFile(filepath);
    }
    const contentType = /\.jpe?g$/i.test(filename) ? "image/jpeg" : `image/${filename.split(".").pop()}`;
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=31536000, immutable", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return new NextResponse("Avatar unavailable", { status: (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500 });
  }
}
