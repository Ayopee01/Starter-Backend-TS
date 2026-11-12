// Import Library
import "dotenv/config";
// Import Config
import { closePrisma } from "../src/db/prisma";
// Import Services
import { upsertAccount } from "../src/services/shared/account.service";
// Import Seeds
import { SEED_ADMIN_ACCOUNTS } from "./admin-account.seed";

/* -------------------------------------- Functions -------------------------------------- */

// Function รัน seed ทั้งหมดตามลำดับ
async function main(): Promise<void> {
  for (const account of SEED_ADMIN_ACCOUNTS) {
    await upsertAccount(account);
    console.log(`Seeded admin account "${account.username}".`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePrisma();
  });
