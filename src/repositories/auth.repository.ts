// Import Repositories
import { client, requireMapped } from "./shared/repository-utils";
// Import Mappers
import { mapAccount, mapSession } from "./shared/mappers";
// Import Types
import type { PendingSessionInput, SessionDto } from "../types/auth.type";
import type { AccountDto } from "../types/shared/account.type";
import type { DbConnection } from "../types/shared/common.type";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่า refresh token hash ชั่วคราวของ pending session ก่อนออก token จริง
const PENDING_REFRESH_TOKEN_HASH = "";

/* -------------------------------------- Functions -------------------------------------- */

// Function ค้นหา account ตาม username จาก DB
export async function findByUsername(username: string, connection?: DbConnection): Promise<AccountDto | null> {
  return mapAccount(await client(connection).account.findUnique({ where: { username } }));
}

// Function สร้าง session ที่ยังไม่มี refresh token hash (ต้องสร้างก่อนเพื่อเอา session id ไปใส่ใน token)
export async function createPending(session: PendingSessionInput, connection?: DbConnection): Promise<SessionDto> {
  const record = await client(connection).userSession.create({
    data: {
      accountId: session.account_id,
      refreshTokenHash: PENDING_REFRESH_TOKEN_HASH,
      ipAddress: session.ip_address ?? null,
      userAgent: session.user_agent ?? null,
      expiresAt: new Date(session.expires_at),
    },
  });

  return requireMapped(mapSession(record), "Session", "create");
}

// Function อัปเดต refresh token hash เฉพาะเมื่อ hash เดิมตรงกัน (กัน refresh ซ้อน) คืน null เมื่อแพ้ race
export async function updateRefreshTokenHash(
  sessionId: number,
  refreshTokenHash: string,
  expectedCurrentHash: string,
  connection?: DbConnection
): Promise<SessionDto | null> {
  const db = client(connection);
  const updatedAt = new Date();
  const updateResult = await db.userSession.updateMany({
    where: {
      id: sessionId,
      isActive: true,
      refreshTokenHash: expectedCurrentHash,
    },
    data: {
      refreshTokenHash,
      lastActiveAt: updatedAt,
      updatedAt,
    },
  });

  if (updateResult.count === 0) {
    return null;
  }

  return requireMapped(mapSession(await db.userSession.findUnique({ where: { id: sessionId } })), "Session", "update");
}
