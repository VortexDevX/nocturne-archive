import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import AvatarUploadModel from "@/lib/db/models/AvatarUpload";
import UserModel from "@/lib/db/models/User";
import { verifyObject } from "@/lib/storage/verify";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { filename } = await request.json();
    if (typeof filename !== "string") return NextResponse.json({ success: false }, { status: 400 });
    await connectDB();
    const upload = await AvatarUploadModel.findOne({ filename, userId: session.userId, expiresAt: { $gt: new Date() } });
    if (!upload) return NextResponse.json({ success: false, message: "Avatar upload expired; choose the file again" }, { status: 404 });
    await verifyObject(upload.objectKey, upload.bytes, upload.sha256, upload.contentType);
    const user = await UserModel.findByIdAndUpdate(session.userId, { $set: { avatarObjectKey: upload.objectKey, profilePicture: `/api/user/avatar/${filename}` } }, { new: true }).select("-password");
    if (!user) return NextResponse.json({ success: false }, { status: 404 });
    return NextResponse.json({ success: true, data: { user, avatarUrl: user.profilePicture } });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to verify avatar. Retry upload." }, { status: 409 });
  }
}
