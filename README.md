KYC Webhook Service

A backend service that receives KYC provider webhooks, validates HMAC signatures, provides Redis-backed idempotency, processes updates asynchronously through BullMQ, persists audit events in PostgreSQL using Prisma, and exposes a tenant-isolated KYC status API.

Tech Stack

Node.js

TypeScript

Express

PostgreSQL

Prisma

Redis

BullMQ

JWT

Zod

Docker / Docker Compose

Architecture

KYC Provider
     |
     | POST /webhooks/kyc
     v
Express API
     |
     +--> HMAC-SHA256 validation
     |
     +--> Payload validation
     |
     +--> Redis idempotency (SET NX)
     |
     +--> BullMQ
     |
     +--> 200 immediately
     |
     v
BullMQ Worker
     |
     +--> Durable event_id check in PostgreSQL
     |
     +--> Update Investor KYC status
     |
     +--> Create WebhookEvent audit record
     |
     +--> Clear Redis idempotency key
     |
     v
PostgreSQL

The GET endpoint uses JWT claims containing tenant_id and investor_id. Access is allowed only when the authenticated tenant and investor match the requested resource.

Prerequisites

Node.js 20+

Docker Desktop

npm

Setup

1. Start PostgreSQL and Redis

docker compose up -d

2. Install dependencies and configure the application

npm install

Create a .env file in the project root:

DATABASE_URL=postgresql://postgres:<password>@localhost:5432/webhook_db
REDIS_URL=redis://localhost:6379
KYC_WEBHOOK_SECRET=<webhook-secret>
JWT_SECRET=<jwt-secret>
PORT=3000

Run the Prisma migration:

npx prisma migrate dev

Generate the Prisma client if required:

npx prisma generate

Running the Application

Start the API:

npm run dev

Start the KYC worker in a separate terminal:

npx tsx src/workers/kyc.worker.ts

Health check:

GET http://localhost:3000/health

Expected response:

{
  "status": "ok"
}

API Endpoints

Login

Development/test helper used to generate a JWT for local testing.

POST /auth/login
Content-Type: application/json

Example:

{
  "tenant_id": "<tenant-id>",
  "investor_id": "<investor-id>"
}

Response:

{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}

KYC Webhook

POST /webhooks/kyc
Content-Type: application/json
X-KYC-Signature: <hmac-sha256-hex>

Example:

{
  "event_id": "evt-uuid-abc123",
  "investor_id": "inv-uuid-456",
  "new_status": "approved",
  "timestamp": "2026-06-20T14:30:00Z"
}

Processing behavior:

Validate the HMAC-SHA256 signature against the raw request body.

Validate the webhook payload.

Atomically acquire the Redis idempotency key.

Return 200 immediately for an already-seen event.

Enqueue a BullMQ job.

Return 200 after successful enqueue.

Process the database update asynchronously.

Store the webhook event as an audit record.

Clear the Redis idempotency key only after successful processing.

Get KYC Status

GET /investors/:id/kyc-status
Authorization: Bearer <jwt>

Response:

{
  "id": "<investor-id>",
  "email": "investor@example.com",
  "kyc_status": "approved",
  "latest_webhook_event_at": "2026-06-20T14:30:00.000Z"
}

Authorization checks include:

Missing/invalid JWT → 401

Tenant mismatch → 403

Investor mismatch → 403

Investor not found → 404

Error Responses

Scenario

HTTP Status

Successful webhook enqueue

200

Already processed webhook

200

Invalid payload

400

Invalid/missing webhook signature

401

Missing/invalid JWT

401

Tenant/investor authorization failure

403

Investor not found

404

Unexpected server/queue error

500

Idempotency and Reliability

The service uses two layers of idempotency:

Redis provides fast request-level deduplication using an atomic SET NX operation with a TTL.

PostgreSQL provides durable protection through the unique WebhookEvent.event_id constraint.

The investor update and webhook audit record are written in a single Prisma transaction. Redis is cleared only after successful database processing.

BullMQ handles asynchronous processing and can retry failed jobs using configured retry/backoff settings.

Database

The Prisma schema contains:

Tenant

Investor

WebhookEvent

WebhookEvent.event_id is unique to provide durable duplicate protection.

The following index supports retrieving the most recent webhook event for an investor:

@@index([investor_id, processed_at])

Testing

Recommended verification flow:

GET /health → 200

POST /auth/login → JWT

GET KYC status without JWT → 401

GET KYC status with valid JWT → 200

Test wrong tenant/investor → 403

Test nonexistent investor → 404

Send valid KYC webhook → 200

Verify BullMQ worker processes the event

Verify investor KYC status changes

Send the same event again and verify no duplicate database effect

Send invalid signature → 401

Send invalid payload → 400

Environment Variables

Variable

Description

DATABASE_URL

PostgreSQL connection string

REDIS_URL

Redis connection URL

KYC_WEBHOOK_SECRET

Secret used for webhook HMAC validation

JWT_SECRET

Secret used to sign/verify JWTs

docker-compose.yml

Build

Run the TypeScript build before submission:

npm run build

The build should complete without TypeScript errors.

Security Notes

HMAC verification is performed against the raw request body.

JWTs are verified using the configured JWT_SECRET.

Tenant and investor claims are enforced at the API layer.

Secrets are supplied through environment variables.

Bearer tokens and webhook secrets must not be logged.