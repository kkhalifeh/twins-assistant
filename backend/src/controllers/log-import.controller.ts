import { Response } from 'express';
import { AuthRequest } from '../utils/auth';
import { analyzeLogImages, base64ToDataUrl, validateOpenAIConfig, ParsedLog, FeedingData, DiaperData, SleepData } from '../services/openai.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Analyze uploaded log images using AI
 * POST /api/log-import/analyze
 */
export async function analyzeImages(req: AuthRequest, res: Response) {
  try {
    // Validate OpenAI configuration
    validateOpenAIConfig();

    // Get uploaded files from multer
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    if (files.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 images allowed' });
    }

    // Convert images to data URLs or upload to storage
    const imageUrls: string[] = [];

    for (const file of files) {
      // Option 1: Use base64 data URL (simpler, but larger payload)
      const base64Image = file.buffer.toString('base64');
      const dataUrl = base64ToDataUrl(base64Image, file.mimetype);
      imageUrls.push(dataUrl);

      // Option 2: Upload to storage and use URL (better for production)
      // const fileUrl = await uploadToStorage(file);
      // imageUrls.push(getFileUrl(fileUrl));
    }

    // Analyze images with OpenAI
    const analysisResult = await analyzeLogImages(imageUrls);

    return res.json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    console.error('Error analyzing images:', error);
    return res.status(500).json({
      error: 'Failed to analyze images',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Bulk create logs from parsed data
 * POST /api/log-import/bulk-save
 */
export async function bulkSaveLogs(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    const accountId = user.accountId;
    const { logs, childIds, timezone } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Logs array is required' });
    }

    if (!childIds || childIds.length === 0) {
      return res.status(400).json({ error: 'At least one child must be selected' });
    }

    if (!timezone) {
      return res.status(400).json({ error: 'Timezone is required' });
    }

    // Validate that children belong to the user's account
    const children = await prisma.child.findMany({
      where: {
        id: { in: childIds },
        userId: accountId,
      },
    });

    if (children.length !== childIds.length) {
      return res.status(403).json({ error: 'Invalid child selection' });
    }

    const createdLogs = {
      feeding: 0,
      diaper: 0,
      sleep: 0,
    };

    const errors: string[] = [];

    // Process each log
    for (const log of logs as ParsedLog[]) {
      try {
        // Combine date and time to create timestamp
        const timestamp = new Date(`${log.date}T${log.time}`);

        if (isNaN(timestamp.getTime())) {
          errors.push(`Invalid date/time for log: ${log.rawText || 'Unknown'}`);
          continue;
        }

        // Create the appropriate log type
        switch (log.type) {
          case 'feeding': {
            const feedingData = log.data as FeedingData;
            await prisma.feedingLog.create({
              data: {
                userId,
                childId: childIds[0], // Use first child by default, can be modified in review
                startTime: timestamp,
                type: feedingData.type,
                amount: feedingData.amount,
                duration: feedingData.duration,
                notes: feedingData.notes,
                entryTimezone: timezone,
              },
            });
            createdLogs.feeding++;
            break;
          }

          case 'diaper': {
            const diaperData = log.data as DiaperData;
            await prisma.diaperLog.create({
              data: {
                userId,
                childId: childIds[0],
                timestamp,
                type: diaperData.type,
                notes: diaperData.notes,
                entryTimezone: timezone,
              },
            });
            createdLogs.diaper++;
            break;
          }

          case 'sleep': {
            const sleepData = log.data as SleepData;
            const startTime = new Date(`${log.date}T${sleepData.startTime}`);
            const endTime = sleepData.endTime
              ? new Date(`${log.date}T${sleepData.endTime}`)
              : undefined;

            await prisma.sleepLog.create({
              data: {
                userId,
                childId: childIds[0],
                startTime,
                endTime,
                type: sleepData.type,
                duration: sleepData.duration,
                notes: sleepData.notes,
                entryTimezone: timezone,
              },
            });
            createdLogs.sleep++;
            break;
          }

          default:
            errors.push(`Unknown log type: ${log.type}`);
        }
      } catch (error) {
        console.error('Error creating log:', error);
        errors.push(`Failed to create ${log.type} log: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return res.json({
      success: true,
      data: {
        created: createdLogs,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Error bulk saving logs:', error);
    return res.status(500).json({
      error: 'Failed to save logs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create individual logs with child assignment
 * This endpoint allows creating logs one by one with specific child assignments
 * POST /api/log-import/create-log
 */
export async function createSingleLog(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    const accountId = user.accountId;
    const { log, childId, timezone } = req.body;

    if (!log) {
      return res.status(400).json({ error: 'Log data is required' });
    }

    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required' });
    }

    if (!timezone) {
      return res.status(400).json({ error: 'Timezone is required' });
    }

    // Validate child belongs to user's account
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        userId: accountId,
      },
    });

    if (!child) {
      return res.status(403).json({ error: 'Invalid child selection' });
    }

    // Combine date and time
    const timestamp = new Date(`${log.date}T${log.time}`);

    if (isNaN(timestamp.getTime())) {
      return res.status(400).json({ error: 'Invalid date/time' });
    }

    let createdLog;

    // Create the log based on type
    switch (log.type) {
      case 'feeding': {
        const feedingData = log.data as FeedingData;
        createdLog = await prisma.feedingLog.create({
          data: {
            userId,
            childId,
            startTime: timestamp,
            type: feedingData.type,
            amount: feedingData.amount,
            duration: feedingData.duration,
            notes: feedingData.notes,
            entryTimezone: timezone,
          },
        });
        break;
      }

      case 'diaper': {
        const diaperData = log.data as DiaperData;
        createdLog = await prisma.diaperLog.create({
          data: {
            userId,
            childId,
            timestamp,
            type: diaperData.type,
            notes: diaperData.notes,
            entryTimezone: timezone,
          },
        });
        break;
      }

      case 'sleep': {
        const sleepData = log.data as SleepData;
        const startTime = new Date(`${log.date}T${sleepData.startTime}`);
        const endTime = sleepData.endTime
          ? new Date(`${log.date}T${sleepData.endTime}`)
          : undefined;

        createdLog = await prisma.sleepLog.create({
          data: {
            userId,
            childId,
            startTime,
            endTime,
            type: sleepData.type,
            duration: sleepData.duration,
            notes: sleepData.notes,
            entryTimezone: timezone,
          },
        });
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown log type: ${log.type}` });
    }

    return res.json({
      success: true,
      data: createdLog,
    });
  } catch (error) {
    console.error('Error creating log:', error);
    return res.status(500).json({
      error: 'Failed to create log',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
