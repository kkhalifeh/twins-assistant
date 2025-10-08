const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🧹 Cleaning database...');

  try {
    // Delete all data in the correct order (respecting foreign key constraints)
    await prisma.healthLog.deleteMany();
    await prisma.diaperLog.deleteMany();
    await prisma.sleepLog.deleteMany();
    await prisma.feedingLog.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.insight.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.child.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Database completely cleaned!');
    console.log('🎉 Ready for fresh data!');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
