import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

export async function getKycStatus(
    req: Request,
    res: Response,
): Promise<Response> {
    console.log("inside")
    const { id } = req.params;

    if (typeof id !== "string") {
        return res.status(400).json({
            error: "Invalid investor id",
        });
    }

    const investorId = id;
    const auth = req.auth;

    if (!auth) {
        return res.status(401).json({
            error: "Authentication required",
        });
    }

    try {
        const investor = await prisma.investor.findUnique({
            where: {
                id: investorId,
            },
            include: {
                webhookEvents: {
                    orderBy: {
                        processed_at: "desc",
                    },
                    take: 1,
                    select: {
                        processed_at: true,
                    },
                },
            },
        });

        if (!investor) {
            return res.status(404).json({
                error: "Investor not found",
            });
        }

        // Tenant isolation
        if (investor.tenant_id !== auth.tenant_id) {
            return res.status(403).json({
                error: "Forbidden",
            });
        }

        // JWT investor must match the requested investor
        if (investor.id !== auth.investor_id) {
            return res.status(403).json({
                error: "Forbidden",
            });
        }

        const latestWebhookEvent = investor.webhookEvents[0];

        return res.status(200).json({
            id: investor.id,
            email: investor.email,
            kyc_status: investor.kyc_status,
            latest_webhook_event_at:
                latestWebhookEvent?.processed_at ?? null,
        });
    } catch (error) {
        console.error("Failed to retrieve investor KYC status", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
}