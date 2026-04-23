import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

const defaultOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
  "https://fuzztube.netlify.app",
]

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : []

const allowedOrigins = new Set([...defaultOrigins, ...envOrigins])

app.use(
  cors({
    origin(origin, cb) {
      // allow non-browser requests (curl/postman) where Origin may be undefined
      if (!origin) return cb(null, true)
      if (allowedOrigins.has(origin)) return cb(null, true)
      return cb(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  })
)

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import
import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

// http://localhost:8000/api/v1/users/register

app.use((err, _req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }
    const statusCode = err.statusCode || 500
    return res.status(statusCode).json({
        statusCode,
        message: err.message || "Internal Server Error",
        success: false,
        errors: err.errors || [],
    })
})

export { app }