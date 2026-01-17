import mongoose, { Schema, Model } from "mongoose";
import { Novel } from "@/types";

const NovelSchema = new Schema<Novel>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    customCover: {
      type: String,
      default: "",
    },
    genres: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus"],
      default: "ongoing",
    },
    totalChapters: {
      type: Number,
      default: 0,
    },
    folderPath: {
      type: String,
      required: true,
    },
    addedBy: {
      type: String,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const NovelModel: Model<Novel> =
  mongoose.models.Novel || mongoose.model<Novel>("Novel", NovelSchema);

export default NovelModel;
