// Import Library
import type { ZodError, ZodType } from "zod";
// Import Types
import type { ParseOptions, ValidationIssueResponse } from "../types/shared/common.type";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Parsers -------------------------------------- */

// Function แปลง zod issues เป็นรายการ error ราย field
function formatZodIssues(error: ZodError): ValidationIssueResponse[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : null,
    message: issue.message,
  }));
}

// Function สร้าง ApiError จาก zod error พร้อม validation_errors
function createValidationError(error: ZodError, options: ParseOptions = {}): ApiError {
  return new ApiError(options.statusCode ?? 400, options.code ?? "VALIDATION_ERROR", options.message ?? "Invalid request data.", {
    validation_errors: formatZodIssues(error),
  });
}

// Function อ่าน input ด้วย Zod schema และ throw ApiError มาตรฐานเมื่อ validation ไม่ผ่าน
export function parseWithSchema<T>(schema: ZodType<T>, input: unknown, options?: ParseOptions): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw createValidationError(result.error, options);
  }

  return result.data;
}
