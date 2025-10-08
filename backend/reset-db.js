const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...');

    // Delete all data in correct order (respecting foreign key constraints)
    console.log('Deleting insights...');
    await prisma.insight.deleteMany({});

    console.log('Deleting milestones...');
    await prisma.milestone.deleteMany({});

    console.log('Deleting schedules...');
    await prisma.schedule.deleteMany({});

    console.log('Deleting health logs...');
    await prisma.healthLog.deleteMany({});

    console.log('Deleting diaper logs...');
    await prisma.diaperLog.deleteMany({});

    console.log('Deleting sleep logs...');
    await prisma.sleepLog.deleteMany({});

    console.log('Deleting feeding logs...');
    await prisma.feedingLog.deleteMany({});

    console.log('Deleting children...');
    await prisma.child.deleteMany({});

    console.log('Deleting users...');
    await prisma.user.deleteMany({});

    console.log('✅ Database reset completed successfully!');
    console.log('📊 All users, children, and related data have been deleted.');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();