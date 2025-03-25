const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllData() {
  await prisma.$transaction([
    prisma.conversation.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.tokenStat.deleteMany(),
    prisma.savedPrompt.deleteMany(),
    prisma.telegramChat.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

deleteAllData()
  .then(() => {
    console.log('All data has been removed successfully!');
    prisma.$disconnect();
  })
  .catch((error) => {
    console.error('Error removing data:', error);
    prisma.$disconnect();
  });
