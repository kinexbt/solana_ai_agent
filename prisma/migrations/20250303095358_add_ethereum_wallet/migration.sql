-- CreateTable
CREATE TABLE "TokenInfo" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "holderCount" INTEGER NOT NULL,
    "topHolders" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EthereumWallet" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EthereumWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenInfo_contractAddress_key" ON "TokenInfo"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "EthereumWallet_address_key" ON "EthereumWallet"("address");
