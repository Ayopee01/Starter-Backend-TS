// Import Library
import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
// Import Types
import type { ErrorResponse } from "../types/shared/common.type";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Config -------------------------------------- */

// Config แปลง Prisma error code ที่พบบ่อยเป็น HTTP status/code (code อื่นเป็น 500)
const PRISMA_ERROR_STATUS_MAP: Record<string, { statusCode: number; code: string }> = {
  P2002: { statusCode: 409, code: "DUPLICATE_ENTRY" },
  P2025: { statusCode: 404, code: "RECORD_NOT_FOUND" },
  P2003: { statusCode: 409, code: "FOREIGN_KEY_CONSTRAINT_VIOLATION" },
  P2034: { statusCode: 409, code: "TRANSACTION_CONFLICT" },
};

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่า value เป็น plain object (ไม่ใช่ array หรือ null)
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

// Function แปลง error ทุกแบบเป็น ApiError
function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERROR_STATUS_MAP[error.code];

    return mapped
      ? new ApiError(mapped.statusCode, mapped.code, "The request conflicts with existing data.")
      : new ApiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error.");
  }

  // JSON body ผิดรูปแบบจาก express.json()
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return new ApiError(400, "INVALID_JSON", "Malformed JSON body.");
  }

  return new ApiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error.");
}

// Function สร้าง JSON response จาก ApiError (details ที่เป็น object รวมเข้า response ระดับบนสุด)
function buildErrorResponse(error: ApiError): ErrorResponse {
  const response: ErrorResponse = {
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
  };

  if (!error.details) {
    return response;
  }

  if (isPlainObject(error.details)) {
    return Object.assign(response, error.details);
  }

  response.details = error.details;
  return response;
}

// Function ตอบ 404 เมื่อไม่พบ route
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, "NOT_FOUND", "Route not found."));
}

// Function แปลง error ทุกแบบเป็น JSON response (5xx ซ่อนรายละเอียดและเขียน log)
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    console.error(`[${req.method} ${req.path}] Request failed.`, error);
    res.status(normalized.statusCode).json({ statusCode: normalized.statusCode, code: normalized.code, message: "Unexpected server error." });
    return;
  }

  res.status(normalized.statusCode).json(buildErrorResponse(normalized));
}
