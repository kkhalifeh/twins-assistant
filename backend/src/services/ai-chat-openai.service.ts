import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes, differenceInHours } from 'date-fns';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || '').trim(),
});

// Store conversation history per user
const conversationHistory = new Map<string, any[]>();

// Define available functions for OpenAI to call
const availableFunctions: Record<string, (args: any) => Promise<string>> = {
  logFeeding: async (args: any): Promise<string> => {
    const { childName, amount, type, notes, userId } = args;
    const child = await prisma.child.findFirst({
      where: {
        name: { contains: childName, mode: 'insensitive' },
        userId
      }
    });
    
    if (!child) throw new Error(`Child ${childName} not found`);
    
    // Map common terms to valid enum values
    const feedingType = type?.toUpperCase() === 'MILK' ? 'BOTTLE' : 
                       type?.toUpperCase() || 'BOTTLE';
    
    const feeding = await prisma.feedingLog.create({
      data: {
        childId: child.id,
        userId: args.userId,
        startTime: new Date(),
        endTime: new Date(),
        type: feedingType as any,
        amount: amount || 120,
        duration: 20,
        notes: notes || `Logged via AI chat`
      }
    });
    
    const todayCount = await prisma.feedingLog.count({
      where: {
        childId: child.id,
        userId,
        startTime: { gte: startOfDay(new Date()) }
      }
    });
    
    return `✅ Logged feeding for ${child.name}: ${amount}ml ${feedingType.toLowerCase()}. Total feedings today: ${todayCount}`;
  },
  
  startSleep: async (args: any): Promise<string> => {
    const { childName, type, userId } = args;
    const child = await prisma.child.findFirst({
      where: {
        name: { contains: childName, mode: 'insensitive' },
        userId
      }
    });
    
    if (!child) throw new Error(`Child ${childName} not found`);
    
    // Check if already sleeping
    const activeSleep = await prisma.sleepLog.findFirst({
      where: {
        childId: child.id,
        userId,
        endTime: null
      }
    });

    if (activeSleep) {
      return `${child.name} is already sleeping (started ${format(activeSleep.startTime, 'h:mm a')})`;
    }
    
    await prisma.sleepLog.create({
      data: {
        childId: child.id,
        userId: args.userId,
        startTime: new Date(),
        type: type?.toUpperCase() || 'NAP'
      }
    });
    
    return `✅ Started ${type || 'sleep'} tracking for ${child.name}`;
  },
  
  endSleep: async (args: any): Promise<string> => {
    const { childName, userId } = args;
    const child = await prisma.child.findFirst({
      where: {
        name: { contains: childName, mode: 'insensitive' },
        userId
      }
    });
    
    if (!child) throw new Error(`Child ${childName} not found`);
    
    const activeSleep = await prisma.sleepLog.findFirst({
      where: {
        childId: child.id,
        userId,
        endTime: null
      }
    });

    if (!activeSleep) {
      return `${child.name} is not currently sleeping`;
    }
    
    const duration = differenceInMinutes(new Date(), activeSleep.startTime);
    
    await prisma.sleepLog.update({
      where: { id: activeSleep.id },
      data: {
        endTime: new Date(),
        duration
      }
    });
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return `✅ ${child.name} woke up! Slept for ${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  },
  
  logDiaper: async (args: any): Promise<string> => {
    const { childName, type, userId } = args;
    const child = await prisma.child.findFirst({
      where: {
        name: { contains: childName, mode: 'insensitive' },
        userId
      }
    });
    
    if (!child) throw new Error(`Child ${childName} not found`);
    
    await prisma.diaperLog.create({
      data: {
        childId: child.id,
        userId: args.userId,
        timestamp: new Date(),
        type: type?.toUpperCase() || 'WET'
      }
    });
    
    const todayCount = await prisma.diaperLog.count({
      where: {
        childId: child.id,
        userId,
        timestamp: { gte: startOfDay(new Date()) }
      }
    });
    
    return `✅ Logged ${type} diaper change for ${child.name}. Total changes today: ${todayCount}`;
  },
  
  logTemperature: async (args: any): Promise<string> => {
    const { childName, temperature, userId } = args;
    const child = await prisma.child.findFirst({
      where: {
        name: { contains: childName, mode: 'insensitive' },
        userId
      }
    });
    
    if (!child) throw new Error(`Child ${childName} not found`);
    
    await prisma.healthLog.create({
      data: {
        childId: child.id,
        userId: args.userId,
        timestamp: new Date(),
        type: 'TEMPERATURE',
        value: temperature.toString(),
        unit: '°C'
      }
    });
    
    const assessment = temperature > 37.5 ? "⚠️ That's a bit high. Monitor closely." :
                      temperature < 36.5 ? "⚠️ That's a bit low. Keep baby warm." :
                      "👍 Temperature is normal.";
    
    return `✅ Logged temperature for ${child.name}: ${temperature}°C. ${assessment}`;
  },
  
  getLastFeeding: async (args: any): Promise<string> => {
    const { childName, userId } = args;

    if (childName) {
      const child = await prisma.child.findFirst({
        where: {
          name: { contains: childName, mode: 'insensitive' },
          userId
        }
      });
      
      if (!child) throw new Error(`Child ${childName} not found`);
      
      const lastFeeding = await prisma.feedingLog.findFirst({
        where: {
          childId: child.id,
          userId
        },
        orderBy: { startTime: 'desc' }
      });
      
      if (!lastFeeding) return `No feeding records found for ${child.name}`;
      
      const hoursAgo = differenceInHours(new Date(), lastFeeding.startTime);
      const minutesAgo = differenceInMinutes(new Date(), lastFeeding.startTime) % 60;
      
      return `${child.name} was last fed ${hoursAgo}h ${minutesAgo}m ago (${lastFeeding.amount}ml ${lastFeeding.type.toLowerCase()}) at ${format(lastFeeding.startTime, 'h:mm a')}`;
    } else {
      // Get for all children
      const children = await prisma.child.findMany({
        where: { userId }
      });
      const results = [];

      for (const child of children) {
        const lastFeeding = await prisma.feedingLog.findFirst({
          where: {
            childId: child.id,
            userId
          },
          orderBy: { startTime: 'desc' }
        });
        
        if (lastFeeding) {
          const hoursAgo = differenceInHours(new Date(), lastFeeding.startTime);
          const minutesAgo = differenceInMinutes(new Date(), lastFeeding.startTime) % 60;
          results.push(`${child.name}: ${hoursAgo}h ${minutesAgo}m ago (${lastFeeding.amount}ml) at ${format(lastFeeding.startTime, 'h:mm a')}`);
        }
      }
      
      return results.join('\n');
    }
  },
  
  getLastDiaperChange: async (args: any): Promise<string> => {
    const { childName, userId } = args;

    const child = await prisma.child.findFirst({
      where: {
        name: { contains: childName, mode: 'insensitive' },
        userId
      }
    });
    
    if (!child) throw new Error(`Child ${childName} not found`);
    
    const lastDiaper = await prisma.diaperLog.findFirst({
      where: {
        childId: child.id,
        userId
      },
      orderBy: { timestamp: 'desc' }
    });
    
    if (!lastDiaper) return `No diaper change records found for ${child.name}`;
    
    const hoursAgo = differenceInHours(new Date(), lastDiaper.timestamp);
    const minutesAgo = differenceInMinutes(new Date(), lastDiaper.timestamp) % 60;
    
    return `${child.name}'s last diaper change was ${hoursAgo}h ${minutesAgo}m ago (${lastDiaper.type.toLowerCase()}) at ${format(lastDiaper.timestamp, 'h:mm a')}`;
  },
  
  getSleepStatus: async (args: any): Promise<string> => {
    const { userId } = args;
    const activeSleeps = await prisma.sleepLog.findMany({
      where: {
        endTime: null,
        userId
      },
      include: { child: true }
    });
    
    if (activeSleeps.length === 0) {
      return "No one is sleeping right now";
    }
    
    const results = activeSleeps.map(sleep => {
      const duration = differenceInMinutes(new Date(), sleep.startTime);
      return `${sleep.child.name} - sleeping for ${duration} minutes (${sleep.type}) since ${format(sleep.startTime, 'h:mm a')}`;
    });
    
    return results.join('\n');
  },
  
  getFeedingCount: async (args: any): Promise<string> => {
    const { childName, timeframe = 'today', userId } = args;
    
    let startDate: Date;
    if (timeframe === 'week') {
      startDate = startOfWeek(new Date());
    } else if (timeframe === 'month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    } else {
      startDate = startOfDay(new Date());
    }
    
    if (childName) {
      const child = await prisma.child.findFirst({
        where: {
          name: { contains: childName, mode: 'insensitive' },
          userId
        }
      });

      if (!child) throw new Error(`Child ${childName} not found`);

      const count = await prisma.feedingLog.count({
        where: {
          childId: child.id,
          userId,
          startTime: { gte: startDate }
        }
      });
      
      return `${child.name} has had ${count} feedings this ${timeframe}`;
    } else {
      const children = await prisma.child.findMany({
        where: { userId }
      });
      const results = [];

      for (const child of children) {
        const count = await prisma.feedingLog.count({
          where: {
            childId: child.id,
            userId,
            startTime: { gte: startDate }
          }
        });
        results.push(`${child.name}: ${count} feedings`);
      }
      
      return `Feedings this ${timeframe}:\n${results.join('\n')}`;
    }
  },
  
  compareTwinsToday: async (args: any): Promise<string> => {
    const { userId } = args;
    const startDate = startOfDay(new Date());
    const children = await prisma.child.findMany({
      where: { userId }
    });
    
    const comparison = [];

    for (const child of children) {
      const feedingCount = await prisma.feedingLog.count({
        where: {
          childId: child.id,
          userId,
          startTime: { gte: startDate }
        }
      });

      const totalAmount = await prisma.feedingLog.aggregate({
        where: {
          childId: child.id,
          userId,
          startTime: { gte: startDate }
        },
        _sum: {
          amount: true
        }
      });

      const diaperCount = await prisma.diaperLog.count({
        where: {
          childId: child.id,
          userId,
          timestamp: { gte: startDate }
        }
      });

      const sleepLogs = await prisma.sleepLog.findMany({
        where: {
          childId: child.id,
          userId,
          startTime: { gte: startDate }
        }
      });
      
      const totalSleepMinutes = sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const sleepHours = Math.round(totalSleepMinutes / 60 * 10) / 10;
      
      comparison.push({
        name: child.name,
        feedings: feedingCount,
        totalMl: totalAmount._sum.amount || 0,
        diapers: diaperCount,
        sleepHours
      });
    }
    
    let result = "📊 Today's Twin Comparison:\n\n";
    
    for (const child of comparison) {
      result += `${child.name}:\n`;
      result += `• Feedings: ${child.feedings} times (${child.totalMl}ml total)\n`;
      result += `• Diapers: ${child.diapers} changes\n`;
      result += `• Sleep: ${child.sleepHours} hours\n\n`;
    }
    
    // Add insights
    if (comparison.length === 2) {
      const diff = Math.abs(comparison[0].feedings - comparison[1].feedings);
      if (diff === 0) {
        result += "✨ Both twins are perfectly synchronized with feeding today!";
      } else if (diff === 1) {
        result += "✨ Twins are well synchronized, just 1 feeding difference.";
      } else {
        result += `💡 ${comparison[0].feedings > comparison[1].feedings ? comparison[0].name : comparison[1].name} has had ${diff} more feedings today.`;
      }
    }
    
    return result;
  },
  
  getSummary: async (args: any): Promise<string> => {
    const { timeframe = 'today', childName, userId } = args;
    
    let startDate: Date;
    if (timeframe === 'week') {
      startDate = startOfWeek(new Date());
    } else if (timeframe === 'month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    } else {
      startDate = startOfDay(new Date());
    }
    
    const children = childName
      ? await prisma.child.findMany({
          where: {
            name: { contains: childName, mode: 'insensitive' },
            userId
          }
        })
      : await prisma.child.findMany({
          where: { userId }
        });
    
    const summaries = [];
    
    for (const child of children) {
      const feedingCount = await prisma.feedingLog.count({
        where: {
          childId: child.id,
          userId,
          startTime: { gte: startDate }
        }
      });

      const diaperCount = await prisma.diaperLog.count({
        where: {
          childId: child.id,
          userId,
          timestamp: { gte: startDate }
        }
      });

      const sleepLogs = await prisma.sleepLog.findMany({
        where: {
          childId: child.id,
          userId,
          startTime: { gte: startDate }
        }
      });
      
      const totalSleepMinutes = sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const sleepHours = Math.round(totalSleepMinutes / 60 * 10) / 10;
      
      summaries.push(`📊 ${child.name}:
- Feedings: ${feedingCount}
- Diapers: ${diaperCount}
- Sleep: ${sleepHours} hours`);
    }
    
    return `Summary for ${timeframe}:\n\n${summaries.join('\n\n')}`;
  },
  
  multipleActions: async (args: any): Promise<string> => {
    const results: string[] = [];
    
    for (const action of args.actions) {
      const functionName = action.function;
      const functionArgs = { ...action.args, userId: args.userId };
      
      const functionToCall = availableFunctions[functionName as keyof typeof availableFunctions];
      if (functionToCall) {
        try {
          const functionResult: string = await functionToCall(functionArgs);
          results.push(functionResult);
        } catch (error) {
          results.push(`Error with ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return results.join('\n\n');
  }
};

export class OpenAIChatService {
  private systemPrompt = `You are a helpful assistant for parents tracking their children's activities.
You can help log activities (feeding, sleep, diapers, health) and answer questions about the children's patterns.

When the user wants to log an activity or asks a question, use the appropriate function.
Be conversational and friendly. If you're not sure which child they're referring to, ask for clarification.

IMPORTANT:
- For multiple activities in one message, use the multipleActions function
- When comparing twins, use compareTwinsToday for today's comparison
- Always include specific times when reporting last activities
- Remember conversation context - if user asks "what time" after a previous query, they're referring to the time mentioned in your last response
- Handle common typos and variations in child names

Available functions:
- logFeeding: Log a feeding session
- startSleep: Start tracking sleep
- endSleep: End sleep tracking (baby woke up)
- logDiaper: Log a diaper change
- logTemperature: Log temperature
- getLastFeeding: Get information about last feeding
- getLastDiaperChange: Get last diaper change time
- getSleepStatus: Check who is currently sleeping
- getFeedingCount: Count feedings in a timeframe
- compareTwinsToday: Compare both twins' activities today
- getSummary: Get a comprehensive summary
- multipleActions: Execute multiple actions in sequence`;

  async processMessage(message: string, userId: string): Promise<string> {
    try {
      // Get or create conversation history for this user
      if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, [
          { role: 'system', content: this.systemPrompt }
        ]);
      }
      
      const history = conversationHistory.get(userId)!;
      
      // Add user message to history
      history.push({ role: 'user', content: message });
      
      // Keep only last 10 messages to avoid token limits
      if (history.length > 11) {
        history.splice(1, history.length - 11);
      }

      const functions = [
        {
          name: 'logFeeding',
          description: 'Log a feeding session for a baby',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child' },
              amount: { type: 'number', description: 'Amount in ml' },
              type: { type: 'string', enum: ['bottle', 'breast', 'formula'], description: 'Type of feeding' },
              notes: { type: 'string', description: 'Optional notes' }
            },
            required: ['childName']
          }
        },
        {
          name: 'startSleep',
          description: 'Start tracking sleep for a baby',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child' },
              type: { type: 'string', enum: ['nap', 'night'], description: 'Type of sleep' }
            },
            required: ['childName']
          }
        },
        {
          name: 'endSleep',
          description: 'End sleep tracking (baby woke up)',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child' }
            },
            required: ['childName']
          }
        },
        {
          name: 'logDiaper',
          description: 'Log a diaper change',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child' },
              type: { type: 'string', enum: ['wet', 'dirty', 'mixed'], description: 'Type of diaper' }
            },
            required: ['childName', 'type']
          }
        },
        {
          name: 'logTemperature',
          description: 'Log temperature reading',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child' },
              temperature: { type: 'number', description: 'Temperature in Celsius' }
            },
            required: ['childName', 'temperature']
          }
        },
        {
          name: 'getLastFeeding',
          description: 'Get information about the last feeding',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child (optional, omit for all)' }
            }
          }
        },
        {
          name: 'getLastDiaperChange',
          description: 'Get information about the last diaper change',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child' }
            },
            required: ['childName']
          }
        },
        {
          name: 'getSleepStatus',
          description: 'Check who is currently sleeping',
          parameters: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'getFeedingCount',
          description: 'Count feedings in a timeframe',
          parameters: {
            type: 'object',
            properties: {
              childName: { type: 'string', description: 'Name of the child (optional)' },
              timeframe: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period' }
            }
          }
        },
        {
          name: 'compareTwinsToday',
          description: 'Compare both twins activities today',
          parameters: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'getSummary',
          description: 'Get a comprehensive summary of activities',
          parameters: {
            type: 'object',
            properties: {
              timeframe: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period' },
              childName: { type: 'string', description: 'Name of the child (optional)' }
            }
          }
        },
        {
          name: 'multipleActions',
          description: 'Execute multiple actions in sequence',
          parameters: {
            type: 'object',
            properties: {
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    function: { type: 'string', description: 'Function name to call' },
                    args: { type: 'object', description: 'Arguments for the function' }
                  }
                }
              }
            },
            required: ['actions']
          }
        }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: history,
        functions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500
      });

      const responseMessage = response.choices[0].message;

      // If GPT wants to call a function
      if (responseMessage.function_call) {
        const functionName = responseMessage.function_call.name;
        const functionArgs = JSON.parse(responseMessage.function_call.arguments);
        
        // Add userId to args
        functionArgs.userId = userId;
        
        console.log(`Calling function: ${functionName}`, functionArgs);
        
        // Execute the function
        const functionToCall = availableFunctions[functionName as keyof typeof availableFunctions];
        
        if (functionToCall) {
          try {
            const functionResult = await functionToCall(functionArgs);
            
            // Add assistant's response to history
            history.push(responseMessage);
            history.push({
              role: 'function',
              name: functionName,
              content: functionResult
            });
            
            // Get final response from GPT with function result
            const finalResponse = await openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: history,
              temperature: 0.7,
              max_tokens: 200
            });
            
            const finalMessage = finalResponse.choices[0].message.content || functionResult;
            
            // Add final response to history
            history.push({ role: 'assistant', content: finalMessage });
            
            return finalMessage;
          } catch (error) {
            console.error('Function execution error:', error);
            return `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }
      }
      
      // If no function call, add response to history and return
      const messageContent = responseMessage.content || "I'm not sure how to help with that. Could you please rephrase?";
      history.push({ role: 'assistant', content: messageContent });
      
      return messageContent;
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      return "I'm having trouble processing your request. Please try again.";
    }
  }
}

export const openAIChatService = new OpenAIChatService();
