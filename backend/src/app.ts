import express from "express";
import cors from "cors";
import videoRouter from "./modules/video/video.route.js";
import jobsRouter from "./modules/jobs/jobs.route.js";
import healthRouter from "./modules/jobs/health.route.js";
import { sseNotificationRouter } from "./modules/notifications/sse.route.js";

// ── Middleware ───────────────────────────────────────────
import { authMiddleware } from "./middleware/auth.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
import { correlationIdMiddleware } from "./middleware/correlationId.middleware.js";

const app = express();

// ── 0. CORS ──────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3003",
  "https://creatorjot.com",
  "https://www.creatorjot.com",
  "https://semidecadently-nonmountainous-dorinda.ngrok-free.dev"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
    credentials: true,
    maxAge: 86400, // preflight cache: 24 h
  })
);


// ── 1. Body parsers ──────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 2. Correlation ID tracking ───────────────────────────
app.use(correlationIdMiddleware);

// ── 3. Security middleware ───────────────────────────────
app.use(rateLimitMiddleware);

// ── 4. Public routes (no auth required) ──────────────────
// Health-check (keep this simple; no business logic)
app.get("/health", (_req, res) => {
  res.send({ status: "ok" });
});

// Advanced health check with queue statistics
app.use("/api/v1/health", healthRouter);

// ── 5. Protected routes (auth required) ──────────────────
// Apply auth middleware only to /api routes

// Per-user rate limiter for the video submission endpoint — each submission
// triggers expensive AI calls, so we enforce a tighter per-user limit on top
// of the global IP-based limit.
const userVideoRateLimitStore = new Map<string, { count: number; resetTime: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of userVideoRateLimitStore.entries()) {
    if (now > entry.resetTime) userVideoRateLimitStore.delete(key)
  }
}, 5 * 60 * 1000)

function userVideoRateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const userId = (req as any).user?.id
  if (!userId) { next(); return }
  const now = Date.now()
  const windowMs = 60 * 1000
  const maxPerUser = 10
  let entry = userVideoRateLimitStore.get(userId)
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
    userVideoRateLimitStore.set(userId, entry)
  }
  entry.count++
  if (entry.count > maxPerUser) {
    res.status(429).json({ error: 'TooManyRequests', message: 'Video submission limit reached. Please wait before submitting again.', status: 429 })
    return
  }
  next()
}

app.use("/api/v1/yt", authMiddleware, userVideoRateLimit, videoRouter);
app.use("/api/v1/jobs", authMiddleware, jobsRouter);
app.use("/api/v1/notifications", authMiddleware, sseNotificationRouter);

// ── 6. Error handler (must be last) ──────────────────────
app.use(errorMiddleware);

export default app;
