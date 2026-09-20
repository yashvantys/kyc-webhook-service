import "dotenv/config";
import { prisma } from "../config/prisma.js";

async function seed(): Promise<void> {
    try {
        const tenant = await prisma.tenant.create({
            data: {
                name: "Test Tenant",
            },
        });

        const investor = await prisma.investor.create({
            data: {
                tenant_id: tenant.id,
                email: "investor@test.com",
                kyc_status: "pending",
            },
        });

        console.log("Tenant created:");
        console.log(tenant);

        console.log("Investor created:");
        console.log(investor);
    } finally {
        await prisma.$disconnect();
    }
}

void seed();