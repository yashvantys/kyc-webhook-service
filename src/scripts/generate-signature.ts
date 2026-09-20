import "dotenv/config";
import crypto from "node:crypto";

const secret = process.env.KYC_WEBHOOK_SECRET;

if (!secret) {
    throw new Error("KYC_WEBHOOK_SECRET is not configured");
}

const body = `{
    "event_id": "evt-postman-001",
  "investor_id": "6bdb2431-b2e7-4ccb-9b96-e1151741c1ad",
  "new_status": "approved",
  "timestamp": "2026-09-20T10:00:00Z"
 }`;

const signature = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

console.log(signature);