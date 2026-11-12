// Import Config
import { prisma } from "../../db/prisma";
// Import Types
import type { DbConnection } from "../../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function เลือก Prisma client ปกติ หรือ transaction client ที่ส่งเข้ามา
export function client(connection?: DbConnection): DbConnection {
  return connection ?? prisma;
}

// Function ตรวจว่า record ที่ map แล้วไม่เป็น null มิฉะนั้น throw error
export function requireMapped<T>(record: T | null | undefined, subject: string, action: string): T {
  if (!record) {
    throw new Error(`${subject} ${action} did not return a record.`);
  }

  return record;
}

// Function สร้าง data สำหรับ revoke session (isActive=false, revokedAt/updatedAt=ปัจจุบัน)
export function buildRevokeData(): { isActive: false; revokedAt: Date; updatedAt: Date } {
  const revokedAt = new Date();

  return {
    isActive: false,
    revokedAt,
    updatedAt: revokedAt,
  };
}
