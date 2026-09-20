import express, { type NextFunction, type Request, type Response } from "express";
import { handleKycWebhook } from "./controllers/kyc-webhook.controller.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { getKycStatus } from "./controllers/investor.controller.js";
import { login } from "./auth/login.js";

const app = express();

app.use(
    express.json({
        verify: (
            req: Request,
            _res: Response,
            buf: Buffer,
        ): void => {
            req.rawBody = Buffer.from(buf);
        },
    }),
);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError) {
        return res.status(400).json({ error: "Invalid JSON" });
    }
    console.error("Unhandled error", err);
    return res.status(500).json({ error: "Internal server error" });
});
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
    });
});
// login to get access token
app.post("/auth/login", login);
// kyc webhook endpoint
app.post("/webhooks/kyc", handleKycWebhook);
// investor kyc status endpoint
app.get(
    "/investors/:id/kyc-status",
    authenticate,
    getKycStatus,
);

export default app;