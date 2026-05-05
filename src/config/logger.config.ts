import winston from "winston";
import "winston-daily-rotate-file";
import { env } from "./env.config";

// ── Log levels ───────────────────────────────────────────────────────────────
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// ── Level based on env ───────────────────────────────────────────────────────
const getLevel = (): string => {
  switch (env.NODE_ENV) {
    case "production":
      return "http"; // info + warn + error + http
    case "test":
      return "warn"; // only warn + error in tests
    default:
      return "debug"; // everything in dev
  }
};

// ── Formats ──────────────────────────────────────────────────────────────────

// Development — colorized, human readable
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level}]: ${message}${
        Object.keys(meta).length ? "\n" + JSON.stringify(meta, null, 2) : ""
      }`
  )
);

// Production — JSON structured (machine readable, easy to parse)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ── Transports ───────────────────────────────────────────────────────────────
const transports: winston.transport[] = [
  // Always log to console
  new winston.transports.Console({
    format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  }),
];

// Production — also write to rotating files
if (env.NODE_ENV === "production") {
  // All logs
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d", // keep 14 days
      format: prodFormat,
    })
  );

  // Error logs only
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d", // keep 30 days for errors
      format: prodFormat,
    })
  );
}

// ── Logger instance ──────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: getLevel(),
  levels,
  transports,
  exitOnError: false,
});

// Morgan stream — HTTP logs route through Winston
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
