import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import logger from "./config/logger.config";
import { errorHandler } from "./middleware/error.middleware";
import { registerRoutes } from "./routes";
import { registerDocs } from "./config/swagger.config";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.config";
import "./config/redis.config";

const app: Application = express();

// ── Better Auth handler — before express.json() ─────────────────────────
app.all("/api/auth/*", toNodeHandler(auth));

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────
registerRoutes(app);

// ── Docs ────────────────────────────────────────────────────────────────────
registerDocs(app);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ── Global Error Handler (must be last) ────────────────────────────────────
app.use(errorHandler);

export default app;
