/*
  Warnings:

  - The primary key for the `EthereumWallet` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "EthereumWallet" DROP CONSTRAINT "EthereumWallet_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "EthereumWallet_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EthereumWallet_id_seq";
