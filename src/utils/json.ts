import type { Prisma } from "@prisma/client";

export function toPrismaJson<T extends Record<string, string | number | boolean | null>>(
    value: T,
): Prisma.InputJsonObject {
    return value;
}