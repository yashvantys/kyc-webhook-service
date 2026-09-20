import "dotenv/config";
import crypto from "node:crypto";

const secret = process.env.KYC_WEBHOOK_SECRET;

if (!secret) {
    throw new Error("KYC_WEBHOOK_SECRET is not configured");
}

const payload = {
    event_id: `evt-${Date.now()}`,
    investor_id: "6bdb2431-b2e7-4ccb-9b96-e1151741c1ad",
    new_status: "approved",
    timestamp: new Date().toISOString(),
};

const body = JSON.stringify(payload);


const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

const response = await fetch("http://localhost:3000/webhooks/kyc", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-KYC-Signature": signature,
    },
    body,
});

console.log("Status:", response.status);
console.log("Response:", await response.text());