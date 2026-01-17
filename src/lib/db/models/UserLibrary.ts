import mongoose, { Schema, Model } from "mongoose";

export interface IUserLibrary {
  _id?: string;
  userId: string;
  novelId: string; // slug
  status: "plan_to_read" | "reading" | "completed" | "dropped";
  isFavorite: boolean;
  addedAt: Date;
  lastStatusChange?: Date;
  lastReadAt?: Date; // For auto-dropping inactive novels
  rating?: number; // 1-5 stars (optional, for future)
  createdAt?: Date;
  updatedAt?: Date;
}

const UserLibrarySchema = new Schema<IUserLibrary>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    novelId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["plan_to_read", "reading", "completed", "dropped"],
      default: "plan_to_read",
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    lastStatusChange: {
      type: Date,
      default: Date.now,
    },
    lastReadAt: {
      type: Date,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user-novel combination
UserLibrarySchema.index({ userId: 1, novelId: 1 }, { unique: true });
UserLibrarySchema.index({ userId: 1, status: 1 });
UserLibrarySchema.index({ userId: 1, isFavorite: 1 });

const UserLibraryModel: Model<IUserLibrary> =
  mongoose.models.UserLibrary ||
  mongoose.model<IUserLibrary>("UserLibrary", UserLibrarySchema);

export default UserLibraryModel;
