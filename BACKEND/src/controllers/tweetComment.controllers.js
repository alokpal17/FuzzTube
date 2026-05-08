import mongoose from "mongoose"
import Tweet from "../models/tweet.models.js"
import { TweetComment } from "../models/tweetComment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getTweetComments = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  const page = parseInt(String(req.query.page ?? "1"), 10) || 1
  const limit = parseInt(String(req.query.limit ?? "20"), 10) || 20

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id")
  }

  const tweet = await Tweet.findById(tweetId).select("_id owner")
  if (!tweet) throw new ApiError(404, "Tweet not found")

  const skip = (page - 1) * limit
  const comments = await TweetComment.find({ tweet: tweetId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("owner", "username fullName avatar")

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Tweet comments fetched successfully"))
})

const addTweetComment = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  const { content } = req.body

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id")
  }
  if (!content || String(content).trim() === "") {
    throw new ApiError(400, "Content is required")
  }

  const tweet = await Tweet.findById(tweetId).select("_id owner")
  if (!tweet) throw new ApiError(404, "Tweet not found")

  const comment = await TweetComment.create({
    tweet: tweetId,
    owner: req.user._id,
    content: String(content).trim(),
  })

  const populated = await TweetComment.findById(comment._id).populate(
    "owner",
    "username fullName avatar"
  )

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Tweet comment added successfully"))
})

const deleteTweetComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id")
  }

  const comment = await TweetComment.findById(commentId)
  if (!comment) throw new ApiError(404, "Comment not found")

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this comment")
  }

  await TweetComment.findByIdAndDelete(commentId)

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet comment deleted successfully"))
})

export { getTweetComments, addTweetComment, deleteTweetComment }

