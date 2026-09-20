export interface KycWebhookPayload {
    event_id: string;
    investor_id: string;
    new_status: string;
    timestamp: string;
}

export type KycWebhookJson = {
    [key: string]: string;
};