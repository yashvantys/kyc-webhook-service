import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtClaims } from "../types/auth.js";

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return secret;
}

function isJwtClaims(value: jwt.JwtPayload): value is JwtClaims & jwt.JwtPayload {
    return (
        typeof value.tenant_id === "string" &&
        typeof value.investor_id === "string"
    );
}

declare global {
    namespace Express {
        interface Request {
            auth?: JwtClaims;
        }
    }
}

export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const authorization = req.header("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
        res.status(401).json({
            error: "Authentication required",
        });
        return;
    }
    console.log("Authorization header:", authorization);
    const token = authorization.substring("Bearer ".length).trim();

    if (!token) {
        res.status(401).json({
            error: "Authentication required",
        });
        return;
    }

    try {       
        const decoded = jwt.verify(token, getJwtSecret());
        if (typeof decoded === "string" || !isJwtClaims(decoded)) {
            res.status(401).json({
                error: "Invalid token",
            });
            return;
        }
        req.auth = {
            tenant_id: decoded.tenant_id,
            investor_id: decoded.investor_id,
        };
        next();
    } catch (error) {
        console.warn("JWT authentication failed", error);
        res.status(401).json({
            error: "Invalid token",
        });
    }
}