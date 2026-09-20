import { Queue } from "bullmq";
import "dotenv/config";
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
}

const redisConnection = new URL(redisUrl);

export const kycQueue = new Queue("kyc-status-update", {
    connection: {
        host: redisConnection.hostname,
        port: Number(redisConnection.port || 6379),
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
    },
});