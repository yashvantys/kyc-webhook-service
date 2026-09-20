import { kycQueue } from "./kyc.queue.js";

async function testQueue(): Promise<void> {
    const job = await kycQueue.add("kyc-status-update", {
        event_id: `test-event-${Date.now()}`,
        investor_id: "6bdb2431-b2e7-4ccb-9b96-e1151741c1ad",
        new_status: "approved",
        timestamp: new Date().toISOString(),
    });

    console.log("Job added:", job.id);

    await kycQueue.close();
}

void testQueue();