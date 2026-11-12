// Import Repositories
import { client, requireMapped } from "./repository-utils";
// Import Mappers
import { mapPasswordResetToken } from "./mappers";
// Import Types
import type { PasswordResetTokenCreateInput, PasswordResetTokenDto } from "../../types/auth.type";
import type { DbConnection } from "../../types/shared/common.type";

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึง reset token ล่าสุดที่ยังไม่ถูกใช้ของ account (ใช้เช็ค cooldown ลิงก์ที่ถูกยกเลิกแล้วไม่นับ)
export async function findLatestUnusedPasswordResetToken(accountId: number, connection?: DbConnection): Promise<PasswordResetTokenDto | null> {
  return mapPasswordResetToken(
    await client(connection).passwordResetToken.findFirst({
      where: { accountId, usedAt: null },
      orderBy: { createdAt: "desc" },
    })
  );
}

// Function ค้นหา reset token ตาม hash
export async function findPasswordResetTokenByHash(tokenHash: string, connection?: DbConnection): Promise<PasswordResetTokenDto | null> {
  return mapPasswordResetToken(await client(connection).passwordResetToken.findUnique({ where: { tokenHash } }));
}

// Function ปิด reset token ที่ยังไม่ถูกใช้ทั้งหมดของ account (ลิงก์เก่าใช้ไม่ได้เมื่อขอลิงก์ใหม่หรือเปลี่ยนรหัสแล้ว)
export async function invalidateUnusedPasswordResetTokens(accountId: number, connection?: DbConnection): Promise<void> {
  await client(connection).passwordResetToken.updateMany({
    where: { accountId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

// Function สร้าง reset token ใหม่
export async function createPasswordResetToken(input: PasswordResetTokenCreateInput, connection?: DbConnection): Promise<PasswordResetTokenDto> {
  const record = await client(connection).passwordResetToken.create({
    data: {
      accountId: input.account_id,
      tokenHash: input.token_hash,
      expiresAt: input.expires_at,
      ipAddress: input.ip_address,
    },
  });

  return requireMapped(mapPasswordResetToken(record), "PasswordResetToken", "create");
}

// Function mark reset token ว่าใช้แล้ว เฉพาะเมื่อยังไม่ถูกใช้และยังไม่หมดอายุ (คืน false เมื่อแพ้ race)
export async function consumePasswordResetToken(id: number, connection?: DbConnection): Promise<boolean> {
  const now = new Date();
  const result = await client(connection).passwordResetToken.updateMany({
    where: { id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  return result.count > 0;
}
