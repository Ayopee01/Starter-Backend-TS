-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "permission_level" VARCHAR(50);

-- CreateTable
CREATE TABLE "account_permissions" (
    "id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "permission" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_permissions_permission_idx" ON "account_permissions"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "account_permissions_account_id_permission_key" ON "account_permissions"("account_id", "permission");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_permissions" ADD CONSTRAINT "account_permissions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
