import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

export function login(req: Request, res: Response): Response {
    const { tenant_id, investor_id } = req.body;

    if (!tenant_id || !investor_id) {
        return res.status(400).json({
            error: "tenant_id and investor_id are required",
        });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            error: "JWT_SECRET is not configured",
        });
    }

    const token = jwt.sign(
        {
            tenant_id,
            investor_id,
        },
        secret,
        {
            expiresIn: "1h",
        },
    );

    return res.status(200).json({
        access_token: token,
        token_type: "Bearer",
        expires_in: 3600,
    });
}