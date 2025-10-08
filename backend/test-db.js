const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    console.log('Users:', JSON.stringify(users, null, 2));

    console.log('\nChecking children...');
    const children = await prisma.child.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        dateOfBirth: true
      }
    });
    console.log('Children:', JSON.stringify(children, null, 2));

    console.log('\nChecking feeding logs...');
    const feedingLogs = await prisma.feedingLog.findMany({
      select: {
        id: true,
        userId: true,
        childId: true,
        amount: true,
        type: true,
        startTime: true,
        child: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });
    console.log('Recent Feeding Logs:', JSON.stringify(feedingLogs, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();