// Import Library
import type { NextFunction, Request, Response } from "express";
// Import Repositories
import * as accountRepository from "../repositories/shared/account.repository";
import * as sessionRepository from "../repositories/shared/session.repository";
// Import Utils
import ApiError from "../utils/api-error";

/* -------------------------------------- Functions -------------------------------------- */

// Function ตรวจว่า session ใน token ยัง active และ account ยังใช้งานได้ แล้วแนบ session ให้ request
export default async function sessionMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;

  if (!auth) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }

  // session ถูก revoke เมื่อ login ซ้ำหรือ logout และหมดอายุตาม expires_at
  const session = await sessionRepository.findActiveById(auth.session_id);

  if (!session || session.account_id !== auth.account_id) {
    throw new ApiError(401, "INVALID_TOKEN", "Session is no longer active.");
  }

  const account = await accountRepository.findById(auth.account_id);

  if (!account || account.status !== "active") {
    throw new ApiError(401, "INVALID_TOKEN", "Account is inactive.");
  }

  req.session = session;
  next();
}
