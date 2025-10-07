import { PrismaClient, FeedingType, SleepType, DiaperType, HealthType, MilestoneType, ItemCategory, EventType, ScheduleStatus, RecurrenceType, PatternType, SleepQuality, Consistency } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { subDays, subHours, addHours, startOfDay, setHours } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');
  
  // Clean existing data
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
  
  // Create users
  const hashedPassword = await bcryptjs.hash('password123', 10);
  
  const khaled = await prisma.user.create({
    data: {
      email: 'khaled@example.com',
      name: 'Khaled',
      password: hashedPassword,
      role: 'PARENT',
      phone: '+962777777777'
    }
  });
  
  const amira = await prisma.user.create({
    data: {
      email: 'amira@example.com',
      name: 'Amira',
      password: hashedPassword,
      role: 'PARENT',
      phone: '+962788888888'
    }
  });
  
  console.log('✅ Created users: Khaled and Amira');
  
  // Create twins
  const birthDate = subDays(new Date(), 90); // 3 months old
  
  const samar = await prisma.child.create({
    data: {
      name: 'Samar',
      dateOfBirth: birthDate,
      gender: 'FEMALE',
      medicalNotes: 'Healthy, no allergies'
    }
  });
  
  const maryam = await prisma.child.create({
    data: {
      name: 'Maryam',
      dateOfBirth: birthDate,
      gender: 'FEMALE',
      medicalNotes: 'Healthy, sensitive to formula brand X'
    }
  });
  
  console.log('✅ Created twins: Samar and Maryam');
  
  // Generate feeding logs for the past 2 weeks
  const feedingLogs: any[] = [];
  const now = new Date();
  
  for (let day = 14; day >= 0; day--) {
    const currentDay = subDays(now, day);
    
    // 6-8 feedings per day per child
    for (let feeding = 0; feeding < 7; feeding++) {
      const feedTime = addHours(startOfDay(currentDay), 6 + (feeding * 3));
      
      // Samar's feeding
      feedingLogs.push({
        childId: samar.id,
        userId: feeding % 2 === 0 ? khaled.id : amira.id,
        startTime: feedTime,
        endTime: addHours(feedTime, 0.5),
        type: (feeding % 3 === 0 ? 'BREAST' : feeding % 3 === 1 ? 'FORMULA' : 'BOTTLE') as FeedingType,
        amount: 120 + Math.floor(Math.random() * 40), // 120-160ml
        duration: 20 + Math.floor(Math.random() * 10),
        notes: feeding === 0 ? 'Morning feed' : feeding === 6 ? 'Night feed' : null,
        createdAt: feedTime
      });
      
      // Maryam's feeding (slightly offset)
      feedingLogs.push({
        childId: maryam.id,
        userId: feeding % 2 === 1 ? khaled.id : amira.id,
        startTime: addHours(feedTime, 0.25),
        endTime: addHours(feedTime, 0.75),
        type: (feeding % 3 === 0 ? 'BREAST' : feeding % 3 === 1 ? 'FORMULA' : 'BOTTLE') as FeedingType,
        amount: 110 + Math.floor(Math.random() * 40), // 110-150ml
        duration: 20 + Math.floor(Math.random() * 10),
        notes: feeding === 0 ? 'Morning feed - fussy' : null,
        createdAt: addHours(feedTime, 0.25)
      });
    }
  }
  
  await prisma.feedingLog.createMany({ data: feedingLogs });
  console.log(`✅ Created ${feedingLogs.length} feeding logs`);
  
  // Generate sleep logs
  const sleepLogs: any[] = [];
  
  for (let day = 14; day >= 0; day--) {
    const currentDay = subDays(now, day);
    
    // Morning nap (both twins)
    const morningNap = setHours(currentDay, 9);
    sleepLogs.push({
      childId: samar.id,
      userId: khaled.id,
      startTime: morningNap,
      endTime: addHours(morningNap, 1.5),
      duration: 90,
      type: 'NAP' as SleepType,
      quality: 'DEEP' as SleepQuality,
      notes: 'Good morning nap',
      createdAt: morningNap
    });
    
    sleepLogs.push({
      childId: maryam.id,
      userId: khaled.id,
      startTime: addHours(morningNap, 0.25),
      endTime: addHours(morningNap, 1.75),
      duration: 90,
      type: 'NAP' as SleepType,
      quality: (day % 3 === 0 ? 'RESTLESS' : 'DEEP') as SleepQuality,
      notes: null,
      createdAt: addHours(morningNap, 0.25)
    });
    
    // Afternoon nap
    const afternoonNap = setHours(currentDay, 14);
    sleepLogs.push({
      childId: samar.id,
      userId: amira.id,
      startTime: afternoonNap,
      endTime: addHours(afternoonNap, 2),
      duration: 120,
      type: 'NAP' as SleepType,
      quality: 'DEEP' as SleepQuality,
      notes: null,
      createdAt: afternoonNap
    });
    
    sleepLogs.push({
      childId: maryam.id,
      userId: amira.id,
      startTime: addHours(afternoonNap, 0.5),
      endTime: addHours(afternoonNap, 2),
      duration: 90,
      type: 'NAP' as SleepType,
      quality: 'DEEP' as SleepQuality,
      notes: 'Woke up happy',
      createdAt: addHours(afternoonNap, 0.5)
    });
    
    // Night sleep
    const nightSleep = setHours(currentDay, 20);
    sleepLogs.push({
      childId: samar.id,
      userId: day % 2 === 0 ? khaled.id : amira.id,
      startTime: nightSleep,
      endTime: addHours(nightSleep, 10),
      duration: 600,
      type: 'NIGHT' as SleepType,
      quality: (day % 4 === 0 ? 'INTERRUPTED' : 'DEEP') as SleepQuality,
      notes: day % 4 === 0 ? 'Woke up twice' : null,
      createdAt: nightSleep
    });
    
    sleepLogs.push({
      childId: maryam.id,
      userId: day % 2 === 1 ? khaled.id : amira.id,
      startTime: addHours(nightSleep, 0.5),
      endTime: addHours(nightSleep, 10.5),
      duration: 600,
      type: 'NIGHT' as SleepType,
      quality: 'DEEP' as SleepQuality,
      notes: null,
      createdAt: addHours(nightSleep, 0.5)
    });
  }
  
  await prisma.sleepLog.createMany({ data: sleepLogs });
  console.log(`✅ Created ${sleepLogs.length} sleep logs`);
  
  // Generate diaper logs
  const diaperLogs: any[] = [];
  
  for (let day = 14; day >= 0; day--) {
    const currentDay = subDays(now, day);
    
    // 8-10 diaper changes per day per child
    for (let change = 0; change < 9; change++) {
      const changeTime = addHours(startOfDay(currentDay), 6 + (change * 1.5));
      
      // Samar's diaper
      diaperLogs.push({
        childId: samar.id,
        userId: change % 2 === 0 ? khaled.id : amira.id,
        timestamp: changeTime,
        type: (change % 3 === 0 ? 'WET' : change % 3 === 1 ? 'DIRTY' : 'MIXED') as DiaperType,
        consistency: change % 3 !== 0 ? ((change % 2 === 0 ? 'NORMAL' : 'WATERY') as Consistency) : null,
        color: change % 3 !== 0 ? 'normal' : null,
        notes: change === 0 ? 'First morning change' : null,
        createdAt: changeTime
      });
      
      // Maryam's diaper
      diaperLogs.push({
        childId: maryam.id,
        userId: change % 2 === 1 ? khaled.id : amira.id,
        timestamp: addHours(changeTime, 0.25),
        type: (change % 3 === 0 ? 'WET' : change % 3 === 1 ? 'DIRTY' : 'MIXED') as DiaperType,
        consistency: change % 3 !== 0 ? ('NORMAL' as Consistency) : null,
        color: change % 3 !== 0 ? 'normal' : null,
        notes: null,
        createdAt: addHours(changeTime, 0.25)
      });
    }
  }
  
  await prisma.diaperLog.createMany({ data: diaperLogs });
  console.log(`✅ Created ${diaperLogs.length} diaper logs`);
  
  // Generate health logs
  const healthLogs: any[] = [];
  
  for (let day = 14; day >= 0; day -= 2) { // Every 2 days
    const currentDay = subDays(now, day);
    
    // Temperature checks
    healthLogs.push({
      childId: samar.id,
      userId: khaled.id,
      timestamp: setHours(currentDay, 8),
      type: 'TEMPERATURE' as HealthType,
      value: (36.5 + Math.random() * 0.5).toFixed(1),
      unit: '°C',
      notes: 'Morning check',
      createdAt: setHours(currentDay, 8)
    });
    
    healthLogs.push({
      childId: maryam.id,
      userId: khaled.id,
      timestamp: setHours(currentDay, 8),
      type: 'TEMPERATURE' as HealthType,
      value: (36.4 + Math.random() * 0.5).toFixed(1),
      unit: '°C',
      notes: 'Morning check',
      createdAt: setHours(currentDay, 8)
    });
  }
  
  // Weight logs (weekly)
  for (let week = 2; week >= 0; week--) {
    const weekDay = subDays(now, week * 7);
    
    healthLogs.push({
      childId: samar.id,
      userId: amira.id,
      timestamp: weekDay,
      type: 'WEIGHT' as HealthType,
      value: (5.5 + (0.2 * (2 - week))).toFixed(1),
      unit: 'kg',
      notes: 'Weekly weigh-in',
      createdAt: weekDay
    });
    
    healthLogs.push({
      childId: maryam.id,
      userId: amira.id,
      timestamp: weekDay,
      type: 'WEIGHT' as HealthType,
      value: (5.3 + (0.2 * (2 - week))).toFixed(1),
      unit: 'kg',
      notes: 'Weekly weigh-in',
      createdAt: weekDay
    });
    
    // Height
    healthLogs.push({
      childId: samar.id,
      userId: amira.id,
      timestamp: weekDay,
      type: 'HEIGHT' as HealthType,
      value: (60 + (2 * (2 - week))).toString(),
      unit: 'cm',
      notes: null,
      createdAt: weekDay
    });
    
    healthLogs.push({
      childId: maryam.id,
      userId: amira.id,
      timestamp: weekDay,
      type: 'HEIGHT' as HealthType,
      value: (59 + (2 * (2 - week))).toString(),
      unit: 'cm',
      notes: null,
      createdAt: weekDay
    });
  }
  
  // Medicine logs
  healthLogs.push({
    childId: samar.id,
    userId: khaled.id,
    timestamp: subDays(now, 3),
    type: 'MEDICINE' as HealthType,
    value: 'Vitamin D drops',
    unit: 'drops',
    notes: 'Daily supplement',
    createdAt: subDays(now, 3)
  });
  
  await prisma.healthLog.createMany({ data: healthLogs });
  console.log(`✅ Created ${healthLogs.length} health logs`);
  
  // Create milestones
  const milestones = [
    {
      childId: samar.id,
      type: 'MOTOR' as MilestoneType,
      name: 'Lifts head during tummy time',
      dateAchieved: subDays(now, 60),
      notes: 'Strong neck control!',
      createdAt: subDays(now, 60)
    },
    {
      childId: maryam.id,
      type: 'MOTOR' as MilestoneType,
      name: 'Lifts head during tummy time',
      dateAchieved: subDays(now, 55),
      notes: 'Getting stronger!',
      createdAt: subDays(now, 55)
    },
    {
      childId: samar.id,
      type: 'SOCIAL' as MilestoneType,
      name: 'First smile',
      dateAchieved: subDays(now, 45),
      notes: 'Beautiful moment!',
      createdAt: subDays(now, 45)
    },
    {
      childId: maryam.id,
      type: 'SOCIAL' as MilestoneType,
      name: 'First smile',
      dateAchieved: subDays(now, 42),
      notes: 'So precious!',
      createdAt: subDays(now, 42)
    },
    {
      childId: samar.id,
      type: 'LANGUAGE' as MilestoneType,
      name: 'Coos and gurgles',
      dateAchieved: subDays(now, 30),
      notes: 'Starting to vocalize',
      createdAt: subDays(now, 30)
    },
    {
      childId: maryam.id,
      type: 'LANGUAGE' as MilestoneType,
      name: 'Coos and gurgles',
      dateAchieved: subDays(now, 28),
      notes: 'Very talkative!',
      createdAt: subDays(now, 28)
    },
    {
      childId: samar.id,
      type: 'COGNITIVE' as MilestoneType,
      name: 'Tracks objects with eyes',
      dateAchieved: subDays(now, 20),
      notes: 'Following toys well',
      createdAt: subDays(now, 20)
    },
    {
      childId: maryam.id,
      type: 'COGNITIVE' as MilestoneType,
      name: 'Tracks objects with eyes',
      dateAchieved: subDays(now, 18),
      notes: 'Very alert and observant',
      createdAt: subDays(now, 18)
    }
  ];
  
  await prisma.milestone.createMany({ data: milestones });
  console.log(`✅ Created ${milestones.length} milestones`);
  
  // Create inventory items
  const inventory = [
    {
      category: 'DIAPERS' as ItemCategory,
      itemName: 'Diapers Size 2',
      brand: 'Pampers',
      unitSize: '30 diapers per pack',
      currentStock: 120,
      minimumStock: 60,
      consumptionRate: 18, // per day for both twins
      lastRestocked: subDays(now, 5),
      nextReorderDate: addHours(now, 6 * 24), // 6 days from now
      notes: 'Buy in bulk for discount'
    },
    {
      category: 'FORMULA' as ItemCategory,
      itemName: 'Formula Powder',
      brand: 'Similac',
      unitSize: '800g per tin',
      currentStock: 3.2, // in kg
      minimumStock: 1.5,
      consumptionRate: 0.3, // kg per day
      lastRestocked: subDays(now, 7),
      nextReorderDate: addHours(now, 10 * 24),
      notes: 'Maryam sensitive to other brands'
    },
    {
      category: 'WIPES' as ItemCategory,
      itemName: 'Baby Wipes',
      brand: 'Huggies',
      unitSize: '80 wipes per pack',
      currentStock: 400,
      minimumStock: 200,
      consumptionRate: 40, // per day
      lastRestocked: subDays(now, 3),
      nextReorderDate: addHours(now, 10 * 24),
      notes: null
    },
    {
      category: 'MEDICINE' as ItemCategory,
      itemName: 'Vitamin D Drops',
      brand: 'Wellbaby',
      unitSize: '30ml bottle',
      currentStock: 2, // bottles
      minimumStock: 1,
      consumptionRate: 0.03, // bottles per day
      lastRestocked: subDays(now, 30),
      nextReorderDate: addHours(now, 30 * 24),
      notes: 'Prescription required'
    },
    {
      category: 'FEEDING_SUPPLIES' as ItemCategory,
      itemName: 'Bottles',
      brand: 'Dr. Brown',
      unitSize: '6 bottles',
      currentStock: 8,
      minimumStock: 6,
      consumptionRate: 0, // Not consumed, just used
      lastRestocked: subDays(now, 60),
      notes: 'Have enough, just need cleaning'
    }
  ];
  
  await prisma.inventory.createMany({ data: inventory });
  console.log(`✅ Created ${inventory.length} inventory items`);
  
  // Create schedules/reminders
  const schedules = [
    {
      childId: null,
      userId: khaled.id,
      eventType: 'VACCINATION' as EventType,
      dueTime: addHours(now, 7 * 24), // Next week
      recurrence: 'ONCE' as RecurrenceType,
      status: 'PENDING' as ScheduleStatus,
      notes: '4-month vaccination for both twins'
    },
    {
      childId: samar.id,
      userId: amira.id,
      eventType: 'FEEDING' as EventType,
      dueTime: addHours(now, 3),
      recurrence: 'DAILY' as RecurrenceType,
      frequency: 'every 3 hours',
      status: 'PENDING' as ScheduleStatus,
      notes: 'Regular feeding schedule'
    },
    {
      childId: maryam.id,
      userId: amira.id,
      eventType: 'FEEDING' as EventType,
      dueTime: addHours(now, 3.25),
      recurrence: 'DAILY' as RecurrenceType,
      frequency: 'every 3 hours',
      status: 'PENDING' as ScheduleStatus,
      notes: 'Regular feeding schedule'
    }
  ];
  
  await prisma.schedule.createMany({ data: schedules });
  console.log(`✅ Created ${schedules.length} schedules`);
  
  // Create AI insights
  const insights = [
    {
      childId: samar.id,
      patternType: 'SLEEP' as PatternType,
      description: 'Samar tends to sleep better after evening baths. She has shown a consistent pattern of falling asleep 30% faster and sleeping 1 hour longer on bath nights.',
      confidence: 0.85,
      suggestion: 'Consider making evening baths part of the daily routine for better sleep quality.',
      validFrom: subDays(now, 7),
      validUntil: addHours(now, 7 * 24)
    },
    {
      childId: maryam.id,
      patternType: 'FEEDING' as PatternType,
      description: 'Maryam shows signs of hunger approximately 15-20 minutes after Samar, creating a predictable feeding pattern.',
      confidence: 0.78,
      suggestion: 'Prepare Maryam\'s bottle while feeding Samar to optimize feeding routine.',
      validFrom: subDays(now, 5),
      validUntil: addHours(now, 14 * 24)
    },
    {
      childId: null,
      patternType: 'CORRELATION' as PatternType,
      description: 'Both twins are showing synchronized sleep patterns, with 70% overlap in their nap times.',
      confidence: 0.72,
      suggestion: 'This is a good opportunity to maintain synchronized schedules for easier management.',
      validFrom: subDays(now, 3),
      validUntil: addHours(now, 10 * 24)
    },
    {
      childId: samar.id,
      patternType: 'HEALTH' as PatternType,
      description: 'Samar\'s weight gain is progressing well, tracking at the 60th percentile for her age.',
      confidence: 0.90,
      suggestion: 'Continue current feeding routine as growth is on track.',
      validFrom: now,
      validUntil: addHours(now, 30 * 24)
    },
    {
      childId: maryam.id,
      patternType: 'BEHAVIOR' as PatternType,
      description: 'Maryam is most alert and interactive in the morning hours between 9-11 AM.',
      confidence: 0.82,
      suggestion: 'Schedule playtime and developmental activities during this peak alertness window.',
      validFrom: subDays(now, 2),
      validUntil: addHours(now, 21 * 24)
    }
  ];
  
  await prisma.insight.createMany({ data: insights });
  console.log(`✅ Created ${insights.length} AI insights`);
  
  // Add one active sleep session for demo
  await prisma.sleepLog.create({
    data: {
      childId: samar.id,
      userId: khaled.id,
      startTime: subHours(now, 1),
      endTime: null, // Still sleeping
      type: 'NAP',
      notes: 'Currently napping'
    }
  });
  
  console.log('✅ Added active sleep session for demo');
  
  console.log('\n🎉 Comprehensive seed completed successfully!');
  console.log('📊 Database now contains:');
  console.log(`   - 2 users (Khaled & Amira)`);
  console.log(`   - 2 children (Samar & Maryam)`);
  console.log(`   - ${feedingLogs.length} feeding logs`);
  console.log(`   - ${sleepLogs.length} sleep logs`);
  console.log(`   - ${diaperLogs.length} diaper logs`);
  console.log(`   - ${healthLogs.length} health logs`);
  console.log(`   - ${milestones.length} milestones`);
  console.log(`   - ${inventory.length} inventory items`);
  console.log(`   - ${schedules.length} schedules`);
  console.log(`   - ${insights.length} AI insights`);
  console.log('\n🚀 Ready to explore the dashboard with real data!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
