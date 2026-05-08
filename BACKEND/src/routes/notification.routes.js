import { Router } from "express"
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()

// All notification routes require login
router.use(verifyJWT)

router.get("/", getNotifications)                                      // GET    /api/v1/notifications
router.patch("/read-all", markAllAsRead)                               // PATCH  /api/v1/notifications/read-all
router.patch("/:notificationId/read", markAsRead)                      // PATCH  /api/v1/notifications/:id/read
router.delete("/", deleteAllNotifications)                             // DELETE /api/v1/notifications
router.delete("/:notificationId", deleteNotification)                  // DELETE /api/v1/notifications/:id

export default router