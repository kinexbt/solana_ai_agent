/*
  Warnings:

  - You are about to drop the column `address` on the `EthereumWallet` table. All the data in the column will be lost.
  - You are about to drop the column `privateKey` on the `EthereumWallet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicKey]` on the table `EthereumWallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chain` to the `EthereumWallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedPrivateKey` to the `EthereumWallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `EthereumWallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `EthereumWallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `EthereumWallet` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EthereumWallet_address_key";

-- AlterTable
ALTER TABLE "EthereumWallet" DROP COLUMN "address",
DROP COLUMN "privateKey",
ADD COLUMN     "chain" TEXT NOT NULL,
ADD COLUMN     "encryptedPrivateKey" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EthereumWallet_publicKey_key" ON "EthereumWallet"("publicKey");
