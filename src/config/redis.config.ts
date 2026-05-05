import Redis from "ioredis";
import { env } from "./env.config";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("connect", () => {
  console.log("✅  Redis connected");
});

redis.on("error", (err) => {
  console.error("❌  Redis error:", err.message);
});

redis.on("reconnecting", () => {
  console.warn("🔄  Redis reconnecting...");
});

export default redis;