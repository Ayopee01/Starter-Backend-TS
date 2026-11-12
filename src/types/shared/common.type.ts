// Import Library
import type { Prisma, PrismaClient } from "@prisma/client";

/* -------------------------------------- Types -------------------------------------- */

// Type connection ที่ repository ใช้ได้ทั้ง Prisma client ปกติและ transaction client
export type DbConnection = PrismaClient | Prisma.TransactionClient;

// Type callback สำหรับ workflow ที่ต้องทำงานใน transaction
export type TransactionCallback<T> = (transaction: Prisma.TransactionClient) => Promise<T>;

// Type ส่วน Response ของ error มาตรฐานที่ส่งออกจาก error middleware
export type ErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
} & Record<string, unknown>;

// Type รายละเอียด validation error ราย field
export interface ValidationIssueResponse {
  field: string | null;
  message: string;
}

// Type option กลางสำหรับ parser ที่แปลง validation error เป็น ApiError
export interface ParseOptions {
  statusCode?: number;
  code?: string;
  message?: string;
}
