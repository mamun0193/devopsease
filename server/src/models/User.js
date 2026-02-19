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

    password: {
      type: String,
      select: false,
    },

    name: {
      type: String,
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
      enum: ["operator", "admin"],
      default: "operator",
    },

    plan: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    storageUsedMB: {
      type: Number,
      default: 0,
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

// Auto-cleanup stale indexes on startup (e.g. old `email_1` index)
const User = mongoose.model("User", userSchema);

User.collection.indexes().then(async (indexes) => {
  const KEEP = new Set(['_id_', 'primaryEmail_1']);
  for (const idx of indexes) {
    if (!KEEP.has(idx.name)) {
      try {
        await User.collection.dropIndex(idx.name);
        console.log(`Dropped stale index: ${idx.name}`);
      } catch (error) {
        console.error(`Failed to drop index ${idx.name}:`, error.message);
      }
    }
  }
}).catch((error) => {
  console.error('Failed to list indexes:', error.message);
});

export default User;
