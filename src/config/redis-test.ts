import { redis } from "./redis.js";

async function testRedis(): Promise<void> {
    try {
        await redis.set("kyc:test", "connected", "EX", 30);
        const value = await redis.get("kyc:test");
        console.log("Redis value:", value);
    } catch (error) {
        console.error("Redis connection failed", error);
        process.exitCode = 1;
    } finally {
        await redis.quit();
    }
}

void testRedis();