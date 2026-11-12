// Import Config
import { withTransaction } from "../../db/prisma";
// Import Repositories
import * as accountRepository from "../../repositories/shared/account.repository";
import * as permissionRepository from "../../repositories/shared/permission.repository";
// Import Mappers
import { sanitizeAccount } from "../../repositories/shared/mappers";
// Import Types
import type { SafeAccountDto, UpsertAccountInput } from "../../types/shared/account.type";
// Import Utils
import { hashPassword } from "../../utils/password";

/* -------------------------------------- Functions -------------------------------------- */

// Function hash password แล้วสร้างหรืออัปเดต account พร้อมระดับสิทธิ์และ permissions ตาม username
export async function upsertAccount(input: UpsertAccountInput): Promise<SafeAccountDto> {
  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (transaction) => {
    const account = await accountRepository.upsertByUsername(
      {
        username: input.username,
        password_hash: passwordHash,
        full_name: input.full_name,
        email: input.email,
        status: "active",
        permission_level: input.permission_level,
      },
      transaction
    );

    await permissionRepository.replaceAccountPermissions(account.id, input.permissions, transaction);

    return sanitizeAccount(account);
  });
}
