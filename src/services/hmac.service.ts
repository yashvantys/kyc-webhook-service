import "dotenv/config";
import crypto from "node:crypto";

function getWebhookSecret(): string {
    const secret = process.env.KYC_WEBHOOK_SECRET;

    if (!secret) {
        throw new Error("KYC_WEBHOOK_SECRET is not configured");
    }

    return secret;
}

export function verifyKycSignature(
    rawBody: Buffer,
    signature: string,
): boolean {
    const secret = getWebhookSecret();

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

    const expected = Buffer.from(expectedSignature, "utf8");
    const received = Buffer.from(signature, "utf8");

    if (expected.length !== received.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, received);
}