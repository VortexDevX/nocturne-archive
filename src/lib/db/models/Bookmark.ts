import mongoose, { Schema, Model } from "mongoose";

export interface IBookmark {
  _id?: string;
  userId: string;
  novelId: string;
  chapterNumber: number;
  chapterTitle: string;
  position: number; // scroll position or paragraph index
  selectedText?: string; // the actual text that was bookmarked/highlighted
  note?: string; // user's personal note
  tags?: string[]; // e.g., ["Important", "Character Arc"]
  color?: string; // for highlighting
  createdAt?: Date;
  updatedAt?: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
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
    chapterTitle: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    selectedText: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    color: {
      type: String,
      default: "yellow",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
BookmarkSchema.index({ userId: 1, novelId: 1 });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

const BookmarkModel: Model<IBookmark> =
  mongoose.models.Bookmark ||
  mongoose.model<IBookmark>("Bookmark", BookmarkSchema);

export default BookmarkModel;
