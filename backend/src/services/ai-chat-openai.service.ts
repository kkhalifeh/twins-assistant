import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes, differenceInHours } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || '').trim(),
});

// Store conversation history per user
const conversationHistory = new Map<string, any[]>();

// AI Chat Context Interface
interface AIChatContext {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    timezone: string;
  };
  children: Array<{
    id: string;
    name: string;
    dateOfBirth: Date;
    gender: string;
  }>;
}

// Define available functions for OpenAI to call
const availableFunctions: Record<string, (args: any) => Promise<string>> = {
  logFeeding: async (args: any): Promise<string> => {
    const { childId, amount, type, notes, userId } = args;

    // Direct insert using childId, no lookup needed
    const feedingType = type?.toUpperCase() === 'MILK' ? 'BOTTLE' :
                       type?.toUpperCase() || 'BOTTLE';

    const feeding = await prisma.feedingLog.create({
      data: {
        childId,
        userId,
        startTime: new Date(),
        endTime: new Date(),
        type: feedingType as any,
        amount: amount || 120,
        duration: 20,
        notes: notes || `Logged via AI chat`
      },
      include: { child: true }
    });

    const todayCount = await prisma.feedingLog.count({
      where: {
        childId,
        userId,
        startTime: { gte: startOfDay(new Date()) }
      }
    });

    return `✅ Logged feeding for ${feeding.child.name}: ${amount}ml ${feedingType.toLowerCase()}. Total feedings today: ${todayCount}`;
  },
  
  startSleep: async (args: any): Promise<string> => {
    const { childId, type, userId } = args;

    // Check if already sleeping
    const activeSleep = await prisma.sleepLog.findFirst({
      where: {
        childId,
        userId,
        endTime: null
      },
      include: { child: true }
    });

    if (activeSleep) {
      return `${activeSleep.child.name} is already sleeping (started ${format(activeSleep.startTime, 'h:mm a')})`;
    }

    const sleepLog = await prisma.sleepLog.create({
      data: {
        childId,
        userId,
        startTime: new Date(),
        type: type?.toUpperCase() || 'NAP'
      },
      include: { child: true }
    });

    return `✅ Started ${type || 'sleep'} tracking for ${sleepLog.child.name}`;
  },
  
  endSleep: async (args: any): Promise<string> => {
    const { childId, userId } = args;

    const activeSleep = await prisma.sleepLog.findFirst({
      where: {
        childId,
        userId,
        endTime: null
      },
      include: { child: true }
    });

    if (!activeSleep) {
      const child = await prisma.child.findUnique({ where: { id: childId } });
      return `${child?.name || 'Child'} is not currently sleeping`;
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

    return `✅ ${activeSleep.child.name} woke up! Slept for ${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  },
  
  logDiaper: async (args: any): Promise<string> => {
    const { childId, type, userId } = args;

    const diaperLog = await prisma.diaperLog.create({
      data: {
        childId,
        userId,
        timestamp: new Date(),
        type: type?.toUpperCase() || 'WET'
      },
      include: { child: true }
    });

    const todayCount = await prisma.diaperLog.count({
      where: {
        childId,
        userId,
        timestamp: { gte: startOfDay(new Date()) }
      }
    });

    return `✅ Logged ${type} diaper change for ${diaperLog.child.name}. Total changes today: ${todayCount}`;
  },
  
  logTemperature: async (args: any): Promise<string> => {
    const { childId, temperature, userId } = args;

    const healthLog = await prisma.healthLog.create({
      data: {
        childId,
        userId,
        timestamp: new Date(),
        type: 'TEMPERATURE',
        value: temperature.toString(),
        unit: '°C'
      },
      include: { child: true }
    });

    const assessment = temperature > 37.5 ? "⚠️ That's a bit high. Monitor closely." :
                      temperature < 36.5 ? "⚠️ That's a bit low. Keep baby warm." :
                      "👍 Temperature is normal.";

    return `✅ Logged temperature for ${healthLog.child.name}: ${temperature}°C. ${assessment}`;
  },
  
  getLastFeeding: async (args: any): Promise<string> => {
    const { childId, userId, timezone = 'America/New_York' } = args;
    console.log('[getLastFeeding] Args:', { childId, userId, timezone });

    if (childId) {
      const lastFeeding = await prisma.feedingLog.findFirst({
        where: {
          childId,
          userId
        },
        orderBy: { startTime: 'desc' },
        include: { child: true }
      });

      if (!lastFeeding) {
        const child = await prisma.child.findUnique({ where: { id: childId } });
        return `No feeding records found for ${child?.name || 'this child'}`;
      }

      const hoursAgo = differenceInHours(new Date(), lastFeeding.startTime);
      const minutesAgo = differenceInMinutes(new Date(), lastFeeding.startTime) % 60;
      const timeStr = formatInTimeZone(lastFeeding.startTime, timezone, 'h:mm a');

      console.log('[getLastFeeding] Result:', {
        utcTime: lastFeeding.startTime.toISOString(),
        timezone,
        convertedTime: timeStr
      });

      return `${lastFeeding.child.name} was last fed ${hoursAgo}h ${minutesAgo}m ago (${lastFeeding.amount}ml ${lastFeeding.type.toLowerCase()}) at ${timeStr}`;
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
          const timeStr = formatInTimeZone(lastFeeding.startTime, timezone, 'h:mm a');
          results.push(`${child.name}: ${hoursAgo}h ${minutesAgo}m ago (${lastFeeding.amount}ml) at ${timeStr}`);
        }
      }

      return results.join('\n');
    }
  },
  
  getLastDiaperChange: async (args: any): Promise<string> => {
    const { childId, userId, timezone = 'America/New_York' } = args;

    const lastDiaper = await prisma.diaperLog.findFirst({
      where: {
        childId,
        userId
      },
      orderBy: { timestamp: 'desc' },
      include: { child: true }
    });

    if (!lastDiaper) {
      const child = await prisma.child.findUnique({ where: { id: childId } });
      return `No diaper change records found for ${child?.name || 'this child'}`;
    }

    const hoursAgo = differenceInHours(new Date(), lastDiaper.timestamp);
    const minutesAgo = differenceInMinutes(new Date(), lastDiaper.timestamp) % 60;
    const timeStr = formatInTimeZone(lastDiaper.timestamp, timezone, 'h:mm a');

    return `${lastDiaper.child.name}'s last diaper change was ${hoursAgo}h ${minutesAgo}m ago (${lastDiaper.type.toLowerCase()}) at ${timeStr}`;
  },
  
  getSleepStatus: async (args: any): Promise<string> => {
    const { userId, timezone = 'America/New_York' } = args;
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
      const timeStr = formatInTimeZone(sleep.startTime, timezone, 'h:mm a');
      return `${sleep.child.name} - sleeping for ${duration} minutes (${sleep.type}) since ${timeStr}`;
    });

    return results.join('\n');
  },
  
  getFeedingCount: async (args: any): Promise<string> => {
    const { childId, timeframe = 'today', userId } = args;

    let startDate: Date;
    if (timeframe === 'week') {
      startDate = startOfWeek(new Date());
    } else if (timeframe === 'month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    } else {
      startDate = startOfDay(new Date());
    }

    if (childId) {
      const count = await prisma.feedingLog.count({
        where: {
          childId,
          userId,
          startTime: { gte: startDate }
        }
      });

      const child = await prisma.child.findUnique({ where: { id: childId } });
      return `${child?.name || 'Child'} has had ${count} feedings this ${timeframe}`;
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
    const { timeframe = 'today', childId, userId } = args;

    let startDate: Date;
    if (timeframe === 'week') {
      startDate = startOfWeek(new Date());
    } else if (timeframe === 'month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    } else {
      startDate = startOfDay(new Date());
    }

    const children = childId
      ? await prisma.child.findMany({
          where: {
            id: childId,
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
  private buildSystemPrompt(context: AIChatContext): string {
    const childrenInfo = context.children.map(child => {
      const ageMonths = this.calculateAgeInMonths(child.dateOfBirth);
      return `  - ${child.name} (ID: ${child.id}, ${child.gender}, ${ageMonths} months old)`;
    }).join('\n');

    return `You are a helpful, conversational assistant for parents tracking their children's activities.
You are assisting ${context.user.name || 'the user'}.

ACCOUNT CONTEXT:
User ID: ${context.user.id}
User Name: ${context.user.name || 'User'}
User Timezone: ${context.user.timezone || 'America/New_York'}

Children:
${childrenInfo || '  (No children registered yet)'}

TIMEZONE FORMATTING:
- The user's timezone is ${context.user.timezone || 'America/New_York'}
- When displaying times in your responses, ALWAYS format them according to the user's timezone
- When the user mentions a time (like "2pm" or "14:00"), interpret it as being in their timezone: ${context.user.timezone || 'America/New_York'}
- Format times in a natural, user-friendly way (e.g., "2:30 PM" instead of "14:30:00")

CRITICAL INSTRUCTIONS FOR NAME MATCHING:
When the user mentions a child by name (even with misspellings, typos, or nicknames), use your language understanding to match it to the correct child ID above.
ALWAYS use the child ID in function calls, NEVER use the name.

Examples:
- "child a", "childa", "A" → Use ID for Child A
- "child b", "childb", "B" → Use ID for Child B
- "she", "her" in context → Use the child ID from conversation history
- "both", "both babies", "both children" → Use IDs for ALL children above

CONVERSATIONAL INTELLIGENCE:
1. CONTEXT AWARENESS: Remember what was discussed in previous messages in this conversation
   - If user says "she had 2 wet diapers" after mentioning "Child B", use Child B's ID
   - Track which child is being discussed and maintain that context

2. MISSING PARAMETERS: If information is missing, ASK conversationally:
   - Missing child: "Which child would you like me to log this for - Child A or Child B?"
   - Missing amount: "How much did they eat in ml?"
   - Missing type: "Was that a wet diaper, dirty diaper, or mixed?"

3. MULTI-ACTION REQUESTS: When user gives multiple activities (e.g., "fed 2 times, 2 wet diapers, 2 dirty"):
   - Break it down and handle ONE action at a time if needed
   - Or use multipleActions with reasonable defaults (120ml for feedings if not specified)

4. ERROR HANDLING: If a function call fails:
   - Don't just say "there was an issue"
   - Ask for the specific missing information or suggest a fix
   - Example: "I need to know how much Child B ate. Can you tell me the amount in ml?"

5. PRONOUNS & REFERENCES:
   - "she", "her", "the baby" → refer to the most recently mentioned child
   - Keep track of conversation flow and use context clues

Available functions:
- logFeeding: Log feeding (requires childId, optionally amount in ml, defaults to 120ml)
- startSleep: Start sleep tracking (requires childId)
- endSleep: End sleep tracking (requires childId)
- logDiaper: Log diaper change (requires childId and type: WET, DIRTY, or MIXED)
- logTemperature: Log temperature (requires childId and temperature in °C)
- getLastFeeding, getLastDiaperChange, getSleepStatus, getFeedingCount, compareTwinsToday, getSummary

Be warm, helpful, and conversational. Maintain conversation context and ask clarifying questions when needed.`;
  }

  private calculateAgeInMonths(dateOfBirth: Date): number {
    const now = new Date();
    const months = (now.getFullYear() - dateOfBirth.getFullYear()) * 12
                   + (now.getMonth() - dateOfBirth.getMonth());
    return Math.max(0, months);
  }

  async processMessage(message: string, context: AIChatContext): Promise<string> {
    try {
      const userId = context.userId;

      // Build dynamic system prompt with account context
      const systemPrompt = this.buildSystemPrompt(context);

      // Get or create conversation history for this user
      if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, [
          { role: 'system', content: systemPrompt }
        ]);
      } else {
        // Update system prompt in existing history (in case children changed)
        const history = conversationHistory.get(userId)!;
        history[0] = { role: 'system', content: systemPrompt };
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
          description: 'Log a feeding session for a baby. Use the child ID from the account context by matching the name mentioned by the user. If amount is not specified, use 120ml as default.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from the account context. Match the user\'s mentioned name/pronoun to the correct ID using conversation context.' },
              amount: { type: 'number', description: 'Amount in ml. Defaults to 120ml if not specified.' },
              type: { type: 'string', enum: ['bottle', 'breast', 'formula'], description: 'Type of feeding. Defaults to bottle if not specified.' },
              notes: { type: 'string', description: 'Optional notes' }
            },
            required: ['childId']
          }
        },
        {
          name: 'startSleep',
          description: 'Start tracking sleep for a baby. Use the child ID from the account context.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context' },
              type: { type: 'string', enum: ['nap', 'night'], description: 'Type of sleep' }
            },
            required: ['childId']
          }
        },
        {
          name: 'endSleep',
          description: 'End sleep tracking (baby woke up). Use the child ID from the account context.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context' }
            },
            required: ['childId']
          }
        },
        {
          name: 'logDiaper',
          description: 'Log a diaper change. Use the child ID from the account context.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context' },
              type: { type: 'string', enum: ['wet', 'dirty', 'mixed'], description: 'Type of diaper' }
            },
            required: ['childId', 'type']
          }
        },
        {
          name: 'logTemperature',
          description: 'Log temperature reading. Use the child ID from the account context.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context' },
              temperature: { type: 'number', description: 'Temperature in Celsius' }
            },
            required: ['childId', 'temperature']
          }
        },
        {
          name: 'getLastFeeding',
          description: 'Get information about the last feeding. Optionally specify childId, or omit for all children.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context (optional, omit for all)' }
            }
          }
        },
        {
          name: 'getLastDiaperChange',
          description: 'Get information about the last diaper change. Use the child ID from the account context.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context' }
            },
            required: ['childId']
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
          description: 'Count feedings in a timeframe. Optionally specify childId, or omit for all children.',
          parameters: {
            type: 'object',
            properties: {
              childId: { type: 'string', description: 'Child ID from account context (optional)' },
              timeframe: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period' }
            }
          }
        },
        {
          name: 'compareTwinsToday',
          description: 'Compare all children\'s activities today',
          parameters: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'getSummary',
          description: 'Get a comprehensive summary of activities. Optionally specify childId, or omit for all children.',
          parameters: {
            type: 'object',
            properties: {
              timeframe: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period' },
              childId: { type: 'string', description: 'Child ID from account context (optional)' }
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
        
        // Add userId and timezone to args
        functionArgs.userId = userId;
        functionArgs.timezone = context.user.timezone || 'America/New_York';

        console.log(`[AI] Calling function: ${functionName}`, {
          ...functionArgs,
          contextTimezone: context.user.timezone,
          finalTimezone: functionArgs.timezone
        });
        
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
