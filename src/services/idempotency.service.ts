import { redis } from "../config/redis.js";

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export class IdempotencyService {
    async tryAcquire(eventId: string): Promise<boolean> {
        const key = `kyc:webhook:${eventId}`;

        const result = await redis.set(
            key,
            "processing",
            "EX",
            IDEMPOTENCY_TTL_SECONDS,
            "NX",
        );

        return result === "OK";
    }

    async clear(eventId: string): Promise<void> {
        const key = `kyc:webhook:${eventId}`;

        await redis.del(key);
    }
}