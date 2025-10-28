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
      'temperature', 'temp', 'medicine', 'gave',
      'add inventory', 'restock', 'bought', 'purchased'
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
    const children = await prisma.child.findMany({ where: { userId: this.context.userId } });
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
      if (children.length === 0) {
        return "You haven't added any children yet. Please add your child/children first.";
      }
      const childNames = children.map(c => c.name).join(', ');
      return `Which child are you logging this for? Please mention one of: ${childNames}`;
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

      // Handle inventory restocking
      if (lowerMessage.includes('restock') || lowerMessage.includes('bought') || lowerMessage.includes('purchased') || lowerMessage.includes('add inventory')) {
        // Try to extract item name and quantity
        const quantityMatch = message.match(/(\d+\.?\d*)\s*(?:pieces|ml|grams?|g|bottles?|packs?)?/i);
        const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : null;

        // Find mentioned inventory items
        const userInventory = await prisma.inventory.findMany({
          where: { userId: this.context.userId }
        });

        let matchedItem = null;
        for (const item of userInventory) {
          if (lowerMessage.includes(item.itemName.toLowerCase())) {
            matchedItem = item;
            break;
          }
        }

        if (!matchedItem) {
          return "I couldn't find that item in your inventory. Please add it first using the inventory page, or tell me more about which item you restocked.";
        }

        if (!quantity || quantity <= 0) {
          return `How many ${matchedItem.unitSize} of ${matchedItem.itemName} did you add?`;
        }

        // Update the inventory
        const newStock = matchedItem.currentStock + quantity;
        let nextReorderDate = null;
        if (matchedItem.consumptionRate && matchedItem.consumptionRate > 0) {
          const daysUntilReorder = (newStock - matchedItem.minimumStock) / matchedItem.consumptionRate;
          if (daysUntilReorder > 0) {
            nextReorderDate = new Date();
            nextReorderDate.setDate(nextReorderDate.getDate() + Math.floor(daysUntilReorder));
          }
        }

        await prisma.inventory.update({
          where: { id: matchedItem.id },
          data: {
            currentStock: newStock,
            lastRestocked: new Date(),
            nextReorderDate
          }
        });

        const daysText = nextReorderDate
          ? ` Next reorder around ${nextReorderDate.toLocaleDateString()}.`
          : '';

        return `✅ Restocked ${matchedItem.itemName}: Added ${quantity} ${matchedItem.unitSize}. New total: ${newStock} ${matchedItem.unitSize}.${daysText}`;
      }

    } catch (error) {
      console.error('Error logging activity:', error);
      return "❌ Sorry, there was an error logging this activity. Please try again.";
    }

    const userChildren = await prisma.child.findMany({ where: { userId: this.context.userId } });
    const exampleName = userChildren.length > 0 ? userChildren[0].name : '[child name]';
    return `I understood you want to log an activity. Could you be more specific? For example: 'Fed ${exampleName} 120ml', '${exampleName} is sleeping', or 'Restocked diapers 50 pieces'.`;
  }

  private async handleQuestion(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    try {
      // Last feeding
      if (lowerMessage.includes('last fed') || lowerMessage.includes('last feeding')) {
        const childId = await this.getChildIdFromMessage(message);
        if (!childId) {
          // Get for all children
          const children = await prisma.child.findMany({ where: { userId: this.context.userId } });
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

      if (lowerMessage.includes('check supplies') || lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
        const userId = this.context.userId;

        // Get all inventory items
        const allItems = await prisma.inventory.findMany({
          where: { userId },
          orderBy: { category: 'asc' }
        });

        if (allItems.length === 0) {
          return "You haven't added any inventory items yet. Add items to start tracking your supplies!";
        }

        // Find low stock items (current stock <= minimum stock)
        const lowStock = allItems.filter(item => item.currentStock <= item.minimumStock);

        if (lowerMessage.includes('low') || lowerMessage.includes('running out')) {
          if (lowStock.length === 0) {
            return "✅ All supplies are well stocked! No items running low.";
          }

          const items = lowStock.map(item => {
            const daysRemaining = item.consumptionRate && item.consumptionRate > 0
              ? (item.currentStock - item.minimumStock) / item.consumptionRate
              : null;
            const daysText = daysRemaining !== null && daysRemaining > 0
              ? ` (${daysRemaining.toFixed(1)} days left)`
              : '';
            return `⚠️ ${item.itemName}: ${item.currentStock} ${item.unitSize} (min: ${item.minimumStock})${daysText}`;
          });

          return `Low supplies:\n${items.join('\n')}`;
        }

        // Show all inventory
        const itemsByCategory: { [key: string]: typeof allItems } = {};
        allItems.forEach(item => {
          if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
          }
          itemsByCategory[item.category].push(item);
        });

        const summary = Object.entries(itemsByCategory).map(([category, items]) => {
          const itemList = items.map(item => {
            const status = item.currentStock <= item.minimumStock ? '🔴' : '🟢';
            return `  ${status} ${item.itemName}: ${item.currentStock} ${item.unitSize}`;
          }).join('\n');
          return `${category}:\n${itemList}`;
        });

        const lowStockWarning = lowStock.length > 0
          ? `\n\n⚠️ ${lowStock.length} item(s) running low!`
          : '';

        return `📦 Inventory Summary:\n\n${summary.join('\n\n')}${lowStockWarning}`;
      }

      if (lowerMessage.includes('help')) {
        const children = await prisma.child.findMany({ where: { userId: this.context.userId } });
        const exampleName = children.length > 0 ? children[0].name : '[child name]';

        return `I can help you with:
📝 Logging activities:
  • "Fed ${exampleName} 120ml"
  • "${exampleName} is sleeping"
  • "Changed wet diaper for ${exampleName}"
  • "Restocked diapers 50 pieces"
  • "Bought formula 800g"

❓ Asking questions:
  • "When was ${exampleName} last fed?"
  • "Is anyone sleeping?"
  • "How many diapers today?"

📊 Commands:
  • "Show today's summary"
  • "Show feedings"
  • "Check supplies" or "Check inventory"
  • "What's running low?"`;
      }

    } catch (error) {
      console.error('Error handling command:', error);
      return "❌ Sorry, I couldn't process that command. Try 'help' for available commands.";
    }

    return "Available commands: 'show feedings', 'check supplies', 'today's summary', 'help'";
  }

  private async handleGeneralConversation(message: string): Promise<string> {
    const children = await prisma.child.findMany({ where: { userId: this.context.userId } });
    const exampleName = children.length > 0 ? children[0].name : '[child name]';
    const childrenNames = children.length > 0 ? children.map(c => c.name).join(' and ') : 'your children';

    const responses = [
      `I'm here to help you track ${childrenNames}'s activities. You can tell me about feedings, diaper changes, sleep times, or ask questions!`,
      `Try saying things like 'Fed ${exampleName} 120ml' or 'When was ${exampleName} last fed?'`,
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
    const children = await prisma.child.findMany({ where: { userId: this.context.userId } });
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
