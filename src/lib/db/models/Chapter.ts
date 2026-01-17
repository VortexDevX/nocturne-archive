import mongoose, { Schema, Model } from "mongoose";
import { Chapter } from "@/types";

const ChapterSchema = new Schema<Chapter>(
  {
    novelId: {
      type: String,
      required: true,
      index: true,
    },
    chapterNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster queries
ChapterSchema.index({ novelId: 1, chapterNumber: 1 }, { unique: true });

const ChapterModel: Model<Chapter> =
  mongoose.models.Chapter || mongoose.model<Chapter>("Chapter", ChapterSchema);

export default ChapterModel;
