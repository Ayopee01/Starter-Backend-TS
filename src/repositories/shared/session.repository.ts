// Import Library
import type { Prisma } from "@prisma/client";
// Import Repositories
import { buildRevokeData, client } from "./repository-utils";
// Import Mappers
import { mapSession } from "./mappers";
// Import Types
import type { SessionDto } from "../../types/auth.type";
import type { DbConnection } from "../../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function ประกอบเงื่อนไข where สำหรับ session ที่ยัง active (isActive และยังไม่หมดอายุ)
function buildActiveSessionWhere(where: Prisma.UserSessionWhereInput = {}): Prisma.UserSessionWhereInput {
  return {
    ...where,
    isActive: true,
    expiresAt: {
      gt: new Date(),
    },
  };
}

// Function ค้นหา active session ตาม ID จาก DB
export async function findActiveById(sessionId: number, connection?: DbConnection): Promise<SessionDto | null> {
  return mapSession(await client(connection).userSession.findFirst({ where: buildActiveSessionWhere({ id: sessionId }) }));
}

// Function ค้นหา active session ล่าสุดของ account จาก DB
export async function findActiveByAccountId(accountId: number, connection?: DbConnection): Promise<SessionDto | null> {
  return mapSession(
    await client(connection).userSession.findFirst({
      where: buildActiveSessionWhere({ accountId }),
      orderBy: {
        id: "desc",
      },
    })
  );
}

// Function revoke session ที่ยัง isActive ทั้งหมดของ account (รวมแถวที่หมดอายุแล้วแต่ยังไม่ถูกปิด)
export async function revokeActiveByAccountId(accountId: number, connection?: DbConnection): Promise<number> {
  const result = await client(connection).userSession.updateMany({
    where: {
      accountId,
      isActive: true,
    },
    data: buildRevokeData(),
  });

  return result.count;
}

// Function revoke session ที่ยัง isActive ของ account ยกเว้น session ที่ระบุ
export async function revokeActiveByAccountIdExcept(accountId: number, exceptSessionId: number, connection?: DbConnection): Promise<number> {
  const result = await client(connection).userSession.updateMany({
    where: {
      accountId,
      id: { not: exceptSessionId },
      isActive: true,
    },
    data: buildRevokeData(),
  });

  return result.count;
}

// Function ลบ session ทั้งหมดของ account (ใช้ก่อนลบ account เพราะ FK ไม่ cascade)
export async function deleteByAccountId(accountId: number, connection?: DbConnection): Promise<void> {
  await client(connection).userSession.deleteMany({ where: { accountId } });
}

// Function revoke session ตาม ID ถ้ายัง active อยู่
export async function revoke(sessionId: number, connection?: DbConnection): Promise<void> {
  await client(connection).userSession.updateMany({
    where: {
      id: sessionId,
      isActive: true,
    },
    data: buildRevokeData(),
  });
}
