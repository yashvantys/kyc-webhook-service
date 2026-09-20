import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
}

export const redis = new Redis(redisUrl);

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("error", (error: Error) => {
    console.error("Redis connection error", error);
});