import "dotenv/config";
import { Prisma } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma } from "../config/prisma.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type {
    KycWebhookJson,
    KycWebhookPayload,
} from "../types/kyc.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
}

const redisConnection = new URL(redisUrl);
const idempotencyService = new IdempotencyService();

const worker = new Worker<KycWebhookPayload>(
    "kyc-status-update",
    async (job) => {
        const payload = job.data;

        const webhookPayload: KycWebhookJson = {
            event_id: payload.event_id,
            investor_id: payload.investor_id,
            new_status: payload.new_status,
            timestamp: payload.timestamp,
        };

        console.log(`Processing KYC event: ${payload.event_id}`);

        try {
            const investor = await prisma.investor.findUnique({
                where: {
                    id: payload.investor_id,
                },
            });

            if (!investor) {
                throw new Error(
                    `Investor not found: ${payload.investor_id}`,
                );
            }

            const processed = await prisma.$transaction(async (tx) => {
                // Durable database-level idempotency check
                const existingEvent =
                    await tx.webhookEvent.findUnique({
                        where: {
                            event_id: payload.event_id,
                        },
                        select: {
                            id: true,
                        },
                    });

                if (existingEvent) {
                    console.log(
                        `KYC event already processed: ${payload.event_id}`,
                    );

                    return false;
                }

                await tx.investor.update({
                    where: {
                        id: payload.investor_id,
                    },
                    data: {
                        kyc_status: payload.new_status,
                    },
                });

                await tx.webhookEvent.create({
                    data: {
                        event_id: payload.event_id,
                        provider: "kyc-provider",
                        payload: webhookPayload,
                        investor_id: payload.investor_id,
                    },
                });

                return true;
            });

            // Duplicate event was already processed.
            if (!processed) {
                await idempotencyService.clear(payload.event_id);
                return;
            }

            // Clear Redis only after successful database processing.
            await idempotencyService.clear(payload.event_id);

            console.log(
                `KYC event processed: ${payload.event_id}`,
            );
        } catch (error) {
            // Handle concurrent duplicate processing.
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                console.log(
                    `KYC event already processed concurrently: ${payload.event_id}`,
                );

                await idempotencyService.clear(payload.event_id);
                return;
            }

            console.error(
                `Failed to process KYC event: ${payload.event_id}`,
                error,
            );

            // Rethrow so BullMQ marks the job as failed.
            throw error;
        }
    },
    {
        connection: {
            host: redisConnection.hostname,
            port: Number(redisConnection.port || 6379),
        },
    },
);

worker.on("completed", (job) => {
    console.log(`KYC job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
    console.error(
        `KYC job failed: ${job?.id}`,
        error,
    );
});