import type { Request, Response } from "express";
import { z } from "zod";
import { kycQueue } from "../queues/kyc.queue.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import { verifyKycSignature } from "../services/hmac.service.js";

const kycWebhookSchema = z.object({
    event_id: z.string().min(1),
    investor_id: z.string().min(1),
    new_status: z.string().min(1),
    timestamp: z.string().datetime(),
});

const idempotencyService = new IdempotencyService();

export async function handleKycWebhook(
    req: Request,
    res: Response,
): Promise<Response> {
    const signature = req.header("X-KYC-Signature");

    if (!signature || !req.rawBody) {
        console.warn("KYC webhook signature missing");
        return res.status(401).json({
            error: "Invalid signature",
        });
    }

    if (!verifyKycSignature(req.rawBody, signature)) {
        console.warn("Invalid KYC webhook signature");
        return res.status(401).json({
            error: "Invalid signature",
        });
    }

    const result = kycWebhookSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: "Invalid payload",
        });
    }

    const payload = result.data;

    try {
        const acquired = await idempotencyService.tryAcquire(
            payload.event_id,
        );

        if (!acquired) {
            return res.sendStatus(200);
        }

        await kycQueue.add("kyc-status-update", payload);

        return res.sendStatus(200);
    } catch (error) {
        console.error("Failed to enqueue KYC webhook", error);
        await idempotencyService.clear(payload.event_id)
        return res.status(500).json({
            error: "Internal server error",
        });
    }
}