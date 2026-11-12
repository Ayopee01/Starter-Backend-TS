// Import Library
import type { NextFunction, Request, Response } from "express";
// Import Utils
import { extractBearerToken } from "../utils/bearer-token";
import { isAccessTokenNearingExpiry, verifyAccessToken } from "../utils/jwt";

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจ access token และแนบ auth payload ให้ request
export default function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const payload = verifyAccessToken(extractBearerToken(req.headers.authorization));
  req.auth = payload;

  // แค่เตือนให้ client ไป /refresh เอง (ไม่เซ็น token ใหม่ให้ที่นี่)
  if (isAccessTokenNearingExpiry(payload.exp)) {
    res.setHeader("X-Should-Refresh", "true");
  }

  next();
}
