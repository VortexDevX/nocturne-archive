import mongoose, { Schema, Model } from "mongoose";
import { ReadingSession } from "@/types";

const ReadingSessionSchema = new Schema<ReadingSession>(
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
    chapterNumber: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    wordsRead: {
      type: Number,
      default: 0,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ReadingSessionModel: Model<ReadingSession> =
  mongoose.models.ReadingSession ||
  mongoose.model<ReadingSession>("ReadingSession", ReadingSessionSchema);

export default ReadingSessionModel;
