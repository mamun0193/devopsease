import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    primaryEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    authProviders: {
      github: {
        id: String,
        email: String,
      },
      google: {
        id: String,
        email: String,
      },
    },

    role: {
      type: String,
      enum: ["viewer", "operator", "admin"],
      default: "operator",
    },

    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  { versionKey: false }
);

export default mongoose.model("User", userSchema);
