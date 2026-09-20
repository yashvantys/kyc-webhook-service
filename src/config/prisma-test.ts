import { prisma } from "./prisma.js";

async function testConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("PostgreSQL connection successful");
  } catch (error) {
    console.error("PostgreSQL connection failed", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void testConnection();