import { PrismaClient } from '@prisma/client';
import { differenceInHours, differenceInMinutes, format, parseISO } from 'date-fns';

const prisma = new PrismaClient();

interface ChatContext {
  userId: string;
  lastChildMentioned?: string;
  lastActivityType?: string;
}

export class AIChatService {
  private context: ChatContext = { userId: '' };

  async processMessage(message: string, userId: string): Promise<string> {
    // Store userId in context
    this.context.userId = userId;
    const lowerMessage = message.toLowerCase();

    // Parse different types of messages
    if (this.isLoggingActivity(lowerMessage)) {
      return await this.handleActivityLogging(message);
    } else if (this.isAskingQuestion(lowerMessage)) {
      return await this.handleQuestion(message);
    } else if (this.isCommand(lowerMessage)) {
      return await this.handleCommand(message);
    } else {
      return await this.handleGeneralConversation(message);
    }
  }

  private isLoggingActivity(message: string): boolean {
    const logKeywords = [
      'fed', 'feeding', 'bottle', 'breast', 'nursed',
      'sleep', 'sleeping', 'nap', 'woke', 'wake',
      'diaper', 'changed', 'wet', 'dirty', 'poop',
      'temperature', 'temp', 'medicine', 'gave'
    ];
    return logKeywords.some(keyword => message.includes(keyword));
  }

  private isAskingQuestion(message: string): boolean {
    const questionWords = ['when', 'what', 'how', 'who', 'where', 'why', 'is', 'are', 'did', 'do'];
    return questionWords.some(word => message.startsWith(word)) || message.includes('?');
  }

  private isCommand(message: string): boolean {
    const commands = ['show', 'list', 'get', 'find', 'check', 'track'];
    return commands.some(cmd => message.startsWith(cmd));
  }

  private async handleActivityLogging(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Ensure we have a userId
    if (!this.context.userId) {
      return "❌ Authentication error. Please refresh and try again.";
    }

    // Detect child name
    const children = await prisma.child.findMany();
    let childId = this.context.lastChildMentioned;
    
    for (const child of children) {
      if (lowerMessage.includes(child.name.toLowerCase())) {
        childId = child.id;
        this.context.lastChildMentioned = child.id;
        break;
      }
    }

    if (!childId && children.length === 1) {
      childId = children[0].id;
    }

    if (!childId) {
      return "Which twin are you logging this for? Please mention Samar or Maryam.";
    }

    const child = children.find(c => c.id === childId);
    const childName = child?.name || 'the baby';

    try {
      // Handle feeding
      if (lowerMessage.includes('fed') || lowerMessage.includes('feeding') || lowerMessage.includes('bottle') || lowerMessage.includes('breast')) {
        const amount = this.extractNumber(message);
        const type = lowerMessage.includes('breast') ? 'BREAST' : 
                     lowerMessage.includes('formula') ? 'FORMULA' : 'BOTTLE';
        
        const feeding = await prisma.feedingLog.create({
          data: {
            childId: childId,
            userId: this.context.userId,
            startTime: new Date(),
            endTime: new Date(),
            type: type,
            amount: amount || 120,
            duration: 20,
            notes: `Logged via chat: ${message}`
          }
        });

        const todayCount = await this.getTodaysFeedingCount(childId);
        return `✅ Logged feeding for ${childName}: ${amount || 120}ml ${type.toLowerCase()}. Total feedings today: ${todayCount}.`;
      }

      // Handle sleep
      if (lowerMessage.includes('sleep') || lowerMessage.includes('nap')) {
        if (lowerMessage.includes('woke') || lowerMessage.includes('wake')) {
          // End sleep
          const activeSleep = await prisma.sleepLog.findFirst({
            where: { childId, endTime: null },
            orderBy: { startTime: 'desc' }
          });

          if (activeSleep) {
            const duration = differenceInMinutes(new Date(), activeSleep.startTime);
            await prisma.sleepLog.update({
              where: { id: activeSleep.id },
              data: { 
                endTime: new Date(),
                duration
              }
            });
            return `✅ ${childName} woke up! Slept for ${Math.round(duration / 60 * 10) / 10} hours.`;
          } else {
            return `No active sleep session found for ${childName}.`;
          }
        } else {
          // Start sleep
          const sleepLog = await prisma.sleepLog.create({
            data: {
              childId: childId,
              userId: this.context.userId,
              startTime: new Date(),
              type: lowerMessage.includes('nap') ? 'NAP' : 'NIGHT',
              notes: `Logged via chat: ${message}`
            }
          });
          return `✅ Started ${lowerMessage.includes('nap') ? 'nap' : 'sleep'} tracking for ${childName}. I'll track the duration.`;
        }
      }

      // Handle diaper
      if (lowerMessage.includes('diaper') || lowerMessage.includes('changed')) {
        const type = lowerMessage.includes('poop') || lowerMessage.includes('dirty') ? 'DIRTY' :
                     lowerMessage.includes('wet') ? 'WET' : 'MIXED';
        
        const diaperLog = await prisma.diaperLog.create({
          data: {
            childId: childId,
            userId: this.context.userId,
            timestamp: new Date(),
            type: type,
            notes: `Logged via chat: ${message}`
          }
        });

        const todayCount = await this.getTodaysDiaperCount(childId);
        return `✅ Logged ${type.toLowerCase()} diaper change for ${childName}. Total changes today: ${todayCount}.`;
      }

      // Handle temperature
      if (lowerMessage.includes('temp')) {
        const temp = this.extractNumber(message);
        if (temp && temp > 30 && temp < 45) {
          const healthLog = await prisma.healthLog.create({
            data: {
              childId: childId,
              userId: this.context.userId,
              timestamp: new Date(),
              type: 'TEMPERATURE',
              value: temp.toString(),
              unit: '°C',
              notes: `Logged via chat: ${message}`
            }
          });
          
          const assessment = temp > 37.5 ? "⚠️ That's a bit high. Monitor closely." :
                            temp < 36.5 ? "⚠️ That's a bit low. Keep baby warm." :
                            "👍 Temperature is normal.";
          
          return `✅ Logged temperature for ${childName}: ${temp}°C. ${assessment}`;
        } else {
          return "Please provide a valid temperature (e.g., '37.2 temp' or 'temperature 37.2').";
        }
      }

      // Handle medicine
      if (lowerMessage.includes('medicine') || lowerMessage.includes('gave')) {
        const medicineMatch = message.match(/gave\s+(\w+)/i) || message.match(/(\w+)\s+medicine/i);
        const medicineName = medicineMatch ? medicineMatch[1] : 'Medicine';
        
        const healthLog = await prisma.healthLog.create({
          data: {
            childId: childId,
            userId: this.context.userId,
            timestamp: new Date(),
            type: 'MEDICINE',
            value: medicineName,
            unit: 'dose',
            notes: `Logged via chat: ${message}`
          }
        });
        
        return `✅ Logged medicine for ${childName}: ${medicineName}`;
      }

    } catch (error) {
      console.error('Error logging activity:', error);
      return "❌ Sorry, there was an error logging this activity. Please try again.";
    }

    return "I understood you want to log an activity. Could you be more specific? For example: 'Fed Samar 120ml' or 'Maryam is sleeping'.";
  }

  private async handleQuestion(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    try {
      // Last feeding
      if (lowerMessage.includes('last fed') || lowerMessage.includes('last feeding')) {
        const childId = await this.getChildIdFromMessage(message);
        if (!childId) {
          // Get for both twins
          const children = await prisma.child.findMany();
          const responses = [];
          
          for (const child of children) {
            const lastFeeding = await prisma.feedingLog.findFirst({
              where: { childId: child.id },
              orderBy: { startTime: 'desc' }
            });
            
            if (lastFeeding) {
              const hoursAgo = differenceInHours(new Date(), lastFeeding.startTime);
              const minutesAgo = differenceInMinutes(new Date(), lastFeeding.startTime) % 60;
              responses.push(`${child.name}: ${hoursAgo}h ${minutesAgo}m ago (${lastFeeding.amount}ml)`);
            } else {
              responses.push(`${child.name}: No feeding records found`);
            }
          }
          
          return `Last feedings:\n${responses.join('\n')}`;
        } else {
          const child = await prisma.child.findUnique({ where: { id: childId } });
          const lastFeeding = await prisma.feedingLog.findFirst({
            where: { childId },
            orderBy: { startTime: 'desc' }
          });
          
          if (lastFeeding) {
            const hoursAgo = differenceInHours(new Date(), lastFeeding.startTime);
            const minutesAgo = differenceInMinutes(new Date(), lastFeeding.startTime) % 60;
            return `${child?.name} was last fed ${hoursAgo}h ${minutesAgo}m ago (${lastFeeding.amount}ml ${lastFeeding.type.toLowerCase()}).`;
          } else {
            return `No feeding records found for ${child?.name}.`;
          }
        }
      }

      // Sleep status
      if (lowerMessage.includes('sleeping') || lowerMessage.includes('asleep')) {
        const activeSleeps = await prisma.sleepLog.findMany({
          where: { endTime: null },
          include: { child: true }
        });

        if (activeSleeps.length === 0) {
          return "No one is sleeping right now.";
        }

        const sleepInfo = activeSleeps.map(sleep => {
          const duration = differenceInMinutes(new Date(), sleep.startTime);
          return `${sleep.child.name} - sleeping for ${Math.round(duration)} minutes`;
        });

        return `Currently sleeping:\n${sleepInfo.join('\n')}`;
      }

      // Today's summary
      if (lowerMessage.includes('today') || lowerMessage.includes('summary')) {
        return await this.getTodaysSummary();
      }

      // Diaper count
      if (lowerMessage.includes('diaper') && lowerMessage.includes('how many')) {
        const childId = await this.getChildIdFromMessage(message);
        const count = childId ? 
          await this.getTodaysDiaperCount(childId) :
          await this.getTodaysDiaperCount();
        
        return `Diaper changes today: ${count}`;
      }

      // Next feeding time prediction
      if (lowerMessage.includes('next') && lowerMessage.includes('feed')) {
        const children = await prisma.child.findMany();
        const predictions = [];
        
        for (const child of children) {
          const lastFeeding = await prisma.feedingLog.findFirst({
            where: { childId: child.id },
            orderBy: { startTime: 'desc' }
          });
          
          if (lastFeeding) {
            const avgInterval = 3.5; // Average feeding interval in hours
            const nextFeedingTime = new Date(lastFeeding.startTime.getTime() + avgInterval * 60 * 60 * 1000);
            const timeUntil = differenceInMinutes(nextFeedingTime, new Date());
            
            if (timeUntil > 0) {
              predictions.push(`${child.name}: in about ${Math.round(timeUntil / 60 * 10) / 10} hours`);
            } else {
              predictions.push(`${child.name}: may be due now`);
            }
          }
        }
        
        return `Next feeding predictions:\n${predictions.join('\n')}`;
      }

    } catch (error) {
      console.error('Error handling question:', error);
      return "❌ Sorry, I had trouble finding that information. Please try again.";
    }

    return "I can help you track feedings, sleep, diapers, and health data. What would you like to know?";
  }

  private async handleCommand(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    try {
      if (lowerMessage.includes('show feedings')) {
        const feedings = await prisma.feedingLog.findMany({
          where: {
            startTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          include: { child: true },
          orderBy: { startTime: 'desc' },
          take: 5
        });

        if (feedings.length === 0) {
          return "No feedings logged today yet.";
        }

        const feedingList = feedings.map(f => 
          `• ${f.child.name}: ${format(f.startTime, 'h:mm a')} - ${f.amount}ml ${f.type.toLowerCase()}`
        );

        return `Today's feedings:\n${feedingList.join('\n')}`;
      }

      if (lowerMessage.includes('check supplies') || lowerMessage.includes('inventory')) {
        const lowStock = await prisma.inventory.findMany({
          where: {
            currentStock: {
              lte: prisma.inventory.fields.minimumStock
            }
          }
        });

        if (lowStock.length === 0) {
          return "✅ All supplies are well stocked!";
        }

        const items = lowStock.map(item => 
          `⚠️ ${item.itemName}: ${item.currentStock} left (minimum: ${item.minimumStock})`
        );

        return `Low supplies:\n${items.join('\n')}`;
      }

      if (lowerMessage.includes('help')) {
        return `I can help you with:
📝 Logging activities:
  • "Fed Samar 120ml"
  • "Maryam is sleeping"
  • "Changed wet diaper for Samar"
  
❓ Asking questions:
  • "When was Maryam last fed?"
  • "Is anyone sleeping?"
  • "How many diapers today?"
  
📊 Commands:
  • "Show today's summary"
  • "Show feedings"
  • "Check supplies"`;
      }

    } catch (error) {
      console.error('Error handling command:', error);
      return "❌ Sorry, I couldn't process that command. Try 'help' for available commands.";
    }

    return "Available commands: 'show feedings', 'check supplies', 'today's summary', 'help'";
  }

  private async handleGeneralConversation(message: string): Promise<string> {
    const responses = [
      "I'm here to help you track Samar and Maryam's activities. You can tell me about feedings, diaper changes, sleep times, or ask questions!",
      "Try saying things like 'Fed Samar 120ml' or 'When was Maryam last fed?'",
      "I can track feeding, sleep, diapers, and health data. What would you like to log?",
      "Need help? Say 'help' to see what I can do!"
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Helper methods
  private extractNumber(message: string): number | null {
    const numbers = message.match(/\d+(\.\d+)?/);
    return numbers ? parseFloat(numbers[0]) : null;
  }

  private async getChildIdFromMessage(message: string): Promise<string | null> {
    const children = await prisma.child.findMany();
    const lowerMessage = message.toLowerCase();
    
    for (const child of children) {
      if (lowerMessage.includes(child.name.toLowerCase())) {
        return child.id;
      }
    }
    
    return this.context.lastChildMentioned || null;
  }

  private async getTodaysFeedingCount(childId?: string): Promise<number> {
    const where: any = {
      startTime: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    };
    
    if (childId) {
      where.childId = childId;
    }
    
    return await prisma.feedingLog.count({ where });
  }

  private async getTodaysDiaperCount(childId?: string): Promise<number> {
    const where: any = {
      timestamp: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    };
    
    if (childId) {
      where.childId = childId;
    }
    
    return await prisma.diaperLog.count({ where });
  }

  private async getTodaysSummary(): Promise<string> {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const children = await prisma.child.findMany();
    
    const summary = [];
    
    for (const child of children) {
      const feedings = await prisma.feedingLog.count({
        where: { childId: child.id, startTime: { gte: startOfDay } }
      });
      
      const diapers = await prisma.diaperLog.count({
        where: { childId: child.id, timestamp: { gte: startOfDay } }
      });
      
      const sleepLogs = await prisma.sleepLog.findMany({
        where: { childId: child.id, startTime: { gte: startOfDay } }
      });
      
      const totalSleep = sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const sleepHours = Math.round(totalSleep / 60 * 10) / 10;
      
      summary.push(`📊 ${child.name}:\n• Feedings: ${feedings}\n• Diapers: ${diapers}\n• Sleep: ${sleepHours}h`);
    }
    
    return `Today's Summary:\n\n${summary.join('\n\n')}`;
  }
}

export const aiChatService = new AIChatService();
