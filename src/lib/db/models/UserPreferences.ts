import mongoose, { Schema, Model } from "mongoose";
import { UserPreferences } from "@/types";

const UserPreferencesSchema = new Schema<UserPreferences>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "amoled", "night"],
      default: "dark",
    },
    accentColor: {
      type: String,
      default: "default",
    },
    fontSize: {
      type: Number,
      default: 18,
      min: 12,
      max: 32,
    },
    fontFamily: {
      type: String,
      enum: ["inter", "roboto", "fira-code", "system", "josephin"],
      default: "system",
    },
    lineHeight: {
      type: Number,
      default: 1.8,
      min: 1.2,
      max: 2.5,
    },
    brightness: {
      type: Number,
      default: 100,
      min: 50,
      max: 120,
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
    offlineMode: {
      type: Boolean,
      default: false,
    },
    ttsEnabled: {
      type: Boolean,
      default: false,
    },
    ttsVoice: {
      type: String,
      default: "",
    },
    ttsSpeed: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0,
    },
  },
  {
    timestamps: true,
  }
);

const UserPreferencesModel: Model<UserPreferences> =
  mongoose.models.UserPreferences ||
  mongoose.model<UserPreferences>("UserPreferences", UserPreferencesSchema);

export default UserPreferencesModel;
