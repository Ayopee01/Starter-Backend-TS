// Import Library
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Import Config
import { readRequiredEnv } from "../config/env";
// Import Types
import type { TransactionCallback } from "../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง Prisma client พร้อม adapter ของ PostgreSQL
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: readRequiredEnv("DATABASE_URL") });

  return new PrismaClient({
    adapter,
    log: process.env.PRISMA_QUERY_LOG === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });
}

// Function คืน Prisma client ตัวเดียวของ process (เก็บใน global กัน hot reload สร้าง connection ซ้ำ)
export function getPrisma(): PrismaClient {
  if (!global.prismaClient) {
    global.prismaClient = createPrismaClient();
  }

  return global.prismaClient;
}

// Function proxy ให้ import prisma ได้ทันที แต่สร้าง client จริงแบบ lazy
export const prisma = new Proxy({} as PrismaClient, {
  get(target, property, receiver) {
    return Reflect.get(getPrisma(), property, receiver ?? target);
  },
});

// Function ครอบ workflow ที่ต้องเขียนหลาย table ให้อยู่ใน transaction เดียว
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  return getPrisma().$transaction(callback);
}

// Function ปิด Prisma client สำหรับ seed, test หรือ graceful shutdown
export async function closePrisma(): Promise<void> {
  if (!global.prismaClient) {
    return;
  }

  await global.prismaClient.$disconnect();
  global.prismaClient = null;
}
