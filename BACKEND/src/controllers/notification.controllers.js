import { Notification } from "../models/notification.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// ─── Create Notification (called internally from other controllers) ───────────
export const createNotification = async ({
  recipientId,
  senderId,
  type,
  entityId = null,
  entityModel = null,
  message,
}) => {
  // Don't notify yourself
  if (recipientId.toString() === senderId.toString()) return

  await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    entityId,
    entityModel,
    message,
  })
}

// ─── GET /api/v1/notifications ────────────────────────────────────────────────
// Returns all notifications for the logged-in user (newest first)
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query

  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("sender", "username fullName avatar")

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  })

  return res.status(200).json(
    new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched")
  )
})

// ─── PATCH /api/v1/notifications/read-all ────────────────────────────────────
// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  )

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"))
})

// ─── PATCH /api/v1/notifications/:notificationId/read ────────────────────────
// Mark a single notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  )

  if (!notification) {
    throw new ApiError(404, "Notification not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"))
})

// ─── DELETE /api/v1/notifications/:notificationId ────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: req.user._id,
  })

  if (!notification) {
    throw new ApiError(404, "Notification not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Notification deleted"))
})

// ─── DELETE /api/v1/notifications ────────────────────────────────────────────
const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications cleared"))
})

export {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
}