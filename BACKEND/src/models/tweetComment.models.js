import mongoose, { Schema } from "mongoose"

const tweetCommentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
      required: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
)

export const TweetComment = mongoose.model("TweetComment", tweetCommentSchema)

