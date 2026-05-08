import mongoose, { Schema } from "mongoose"

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["subscribe", "like_video", "comment_video", "like_tweet", "retweet"],
      required: true,
    },
    // reference to the entity (video, tweet, comment)
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    entityModel: {
      type: String,
      enum: ["Video", "Tweet", "Comment", null],
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

export const Notification = mongoose.model("Notification", notificationSchema)