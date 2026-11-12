// Import Library
import type { NextFunction, Request, Response } from "express";
// Import Config
import type { AdminPermission } from "../config/permission.config";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง middleware ตรวจว่า admin มีสิทธิ์ครบทุกตัวที่ route ต้องการ (อ่านจาก access token)
export default function permissionMiddleware(requiredPermissions: AdminPermission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const permissions = req.auth?.permissions ?? [];
    const hasPermission = requiredPermissions.every((permission) => permissions.includes(permission));

    if (!hasPermission) {
      throw new ApiError(403, "FORBIDDEN", "Permission denied.");
    }

    next();
  };
}
