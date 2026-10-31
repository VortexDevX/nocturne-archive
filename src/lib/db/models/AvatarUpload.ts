import mongoose, { Schema, type Model } from "mongoose";
interface AvatarUpload { userId: string; filename: string; objectKey: string; bytes: number; sha256: string; contentType: string; expiresAt: Date }
const schema = new Schema<AvatarUpload>({ userId: { type: String, required: true }, filename: { type: String, required: true, unique: true }, objectKey: String, bytes: Number, sha256: String, contentType: String, expiresAt: { type: Date, expires: 0 } });
const AvatarUploadModel: Model<AvatarUpload> = mongoose.models.AvatarUpload || mongoose.model<AvatarUpload>("AvatarUpload", schema);
export default AvatarUploadModel;
