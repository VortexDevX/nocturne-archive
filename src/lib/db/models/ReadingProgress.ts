import mongoose, { Schema, Model } from "mongoose";
import { ReadingProgress } from "@/types";

const ReadingProgressSchema = new Schema<ReadingProgress>(
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
    currentChapter: {
      type: Number,
      default: 1,
    },
    currentPosition: {
      type: Number,
      default: 0,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    chaptersRead: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user-novel combination
ReadingProgressSchema.index({ userId: 1, novelId: 1 }, { unique: true });

const ReadingProgressModel: Model<ReadingProgress> =
  mongoose.models.ReadingProgress ||
  mongoose.model<ReadingProgress>("ReadingProgress", ReadingProgressSchema);

export default ReadingProgressModel;
