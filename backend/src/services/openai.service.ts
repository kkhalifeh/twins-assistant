import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions for parsed logs
export interface FeedingData {
  type: 'BREAST' | 'BOTTLE' | 'FORMULA' | 'SOLID' | 'MIXED';
  amount?: number;
  unit?: 'ml' | 'oz';
  duration?: number;
  side?: 'LEFT' | 'RIGHT' | 'BOTH';
  notes?: string;
}

export interface DiaperData {
  type: 'WET' | 'DIRTY' | 'MIXED';
  notes?: string;
}

export interface SleepData {
  type: 'NAP' | 'NIGHT';
  startTime: string;
  endTime?: string;
  duration?: number;
  notes?: string;
}

export interface ParsedLog {
  type: 'feeding' | 'diaper' | 'sleep';
  time: string; // HH:mm format
  date: string; // YYYY-MM-DD format
  confidence: 'high' | 'medium' | 'low';
  data: FeedingData | DiaperData | SleepData;
  rawText?: string; // Original handwritten text for reference
}

export interface AnalysisResponse {
  logs: ParsedLog[];
  warnings: string[];
  imageQuality: 'good' | 'fair' | 'poor';
}

/**
 * Analyze handwritten log images using GPT-4 Vision
 * @param imageUrls Array of image URLs or base64 encoded images
 * @returns Parsed logs with confidence scores
 */
export async function analyzeLogImages(imageUrls: string[]): Promise<AnalysisResponse> {
  try {
    const prompt = `You are analyzing handwritten parenting logs for twin babies. Extract all feeding, diaper change, and sleep entries from the images.

IMPORTANT ABBREVIATION MAPPINGS:
- "EBM" (Exclusive Breast Milk) → feeding type: BOTTLE
- "Formula" → feeding type: FORMULA
- "Urine only" or "Urine" → diaper type: WET
- "Poop" or "Stool" → diaper type: DIRTY
- "Both" (urine and poop) → diaper type: MIXED

INSTRUCTIONS:
1. Extract each log entry with its time, date, and details
2. For FEEDING logs:
   - Type: BREAST, BOTTLE (for EBM), FORMULA, or SOLID
   - Amount in ml if specified (e.g., "90ml", "80ml+30ml" should be parsed as 110ml total)
   - Duration in minutes for breastfeeding
   - Side for breastfeeding: LEFT, RIGHT, or BOTH

3. For DIAPER logs:
   - Type: WET (urine only), DIRTY (poop only), or MIXED (both)

4. For SLEEP logs:
   - Type: NAP (daytime sleep) or NIGHT (nighttime sleep) - infer from the time
   - Start time and end time if available
   - Calculate duration if both times present

5. Assign confidence levels:
   - high: clearly written, all details present
   - medium: mostly clear, some details unclear
   - low: difficult to read or missing key details

6. Handle edge cases:
   - Crossed-out entries: ignore them
   - Missing AM/PM: infer from context (night feeds vs day feeds)
   - Partial data: extract what's available, mark confidence as low
   - Multiple amounts (e.g., "80ml + 30ml"): sum them up

7. Return warnings for:
   - Unclear handwriting
   - Missing critical information
   - Ambiguous times
   - Duplicate entries

Return the data in this exact JSON structure:
{
  "logs": [
    {
      "type": "feeding" | "diaper" | "sleep",
      "time": "HH:mm",
      "date": "YYYY-MM-DD",
      "confidence": "high" | "medium" | "low",
      "data": {
        // Feeding-specific fields
        "type": "BREAST" | "BOTTLE" | "FORMULA" | "SOLID" | "MIXED",
        "amount": number,
        "unit": "ml" | "oz",
        "duration": number,
        "side": "LEFT" | "RIGHT" | "BOTH",
        "notes": "string"

        // OR Diaper-specific fields
        "type": "WET" | "DIRTY" | "MIXED",
        "notes": "string"

        // OR Sleep-specific fields
        "type": "NAP" | "NIGHT",
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "duration": number,
        "notes": "string"
      },
      "rawText": "original handwritten text"
    }
  ],
  "warnings": ["warning messages"],
  "imageQuality": "good" | "fair" | "poor"
}`;

    // Prepare messages with images
    const content: any[] = [
      {
        type: 'text',
        text: prompt,
      },
    ];

    // Add all images to the content
    for (const imageUrl of imageUrls) {
      content.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'high', // Use high detail for better handwriting recognition
        },
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Turbo with vision
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      max_tokens: 4096,
      temperature: 0.1, // Low temperature for more consistent, factual extraction
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysisResponse: AnalysisResponse = JSON.parse(result);

    // Validate the response structure
    if (!analysisResponse.logs || !Array.isArray(analysisResponse.logs)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return analysisResponse;
  } catch (error) {
    console.error('Error analyzing log images:', error);
    throw new Error(`Failed to analyze images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert base64 image to data URL for OpenAI
 * @param base64Image Base64 encoded image
 * @param mimeType Image MIME type (e.g., 'image/jpeg')
 * @returns Data URL
 */
export function base64ToDataUrl(base64Image: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64Image}`;
}

/**
 * Validate that the OpenAI API key is configured
 */
export function validateOpenAIConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
}
