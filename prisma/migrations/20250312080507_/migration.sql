/*
  Warnings:

  - You are about to drop the column `ownerId` on the `EthereumWallet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EthereumWallet" DROP COLUMN "ownerId",
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "balance" DROP NOT NULL,
ALTER COLUMN "balance" DROP DEFAULT;
