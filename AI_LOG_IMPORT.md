# AI-Powered Handwritten Log Import Feature

## Overview
Enable parents/nannies to upload photos of handwritten baby care logs and automatically parse them into structured database entries using GPT-4 Vision API.

## Business Requirements

### Problem Statement
Nannies maintain handwritten logs throughout the day tracking:
- Feeding times, amounts, and types
- Diaper changes and types
- Sleep start/end times
- Notes and observations

Manual transcription is time-consuming and error-prone.

### Solution
Upload handwritten log photos → AI analyzes → Review/edit parsed data → Bulk save to database

### Example Log Format (from provided images)
```
MONDAY PM - DEC 22, 2025
8:45 - Wake up - URINE ONLY
9:30 - FEEDING - (90ml) - BURPED
       WELL - NO VOMITING
       DOING WELL
10:20 - BACK TO SLEEP
12:20 - WAKE UP - URINE ONLY
12:23 - FEEDING - (80ml) EBM
        ADDITIONAL - (30ml)
        BURPED - WELL
```

### Abbreviations & Mappings
- **EBM** → "Exclusive Breast Milk" → Feeding Type: `BOTTLE`
- **Formula** → Feeding Type: `FORMULA`
- **Urine only** → Diaper Type: `WET`
- **Dirty/Poop** → Diaper Type: `DIRTY` or `MIXED`
- **Wake up** → Sleep end time (if sleep was active)
- **Back to sleep** → Sleep start time

---

## Technical Architecture

### Component Breakdown

#### 1. Upload Interface (`/logs/import`)
**Location**: `frontend/src/app/logs/import/page.tsx`

**UI Elements**:
- File upload zone (drag & drop + click to browse)
- Multiple image support (1-5 images per session)
- Child selector (can select multiple children or default child)
- Date selector (default: today, but user can override)
- "Analyze Logs" button
- Progress indicator during analysis

**Validation**:
- Max file size: 5MB per image
- Allowed types: JPG, PNG, WebP
- Max 5 images per upload session

#### 2. AI Analysis Backend

**New Backend Service**: `backend/src/services/openai.service.ts`

**API Endpoint**: `POST /api/logs/analyze-images`

**Request**:
```typescript
multipart/form-data:
- images: File[] (1-5 images)
- date: string (ISO date for the logs)
- defaultChildId: string (optional)
```

**Response**:
```typescript
{
  success: boolean
  parsedLogs: ParsedLog[]
  rawResponse: string // for debugging
  confidence: 'high' | 'medium' | 'low'
}

interface ParsedLog {
  id: string // temporary UUID for frontend tracking
  type: 'feeding' | 'diaper' | 'sleep'
  timestamp: string // ISO datetime
  data: FeedingData | DiaperData | SleepData
  confidence: number // 0-1
  originalText: string // what AI read
}

interface FeedingData {
  type: 'BREAST' | 'BOTTLE' | 'FORMULA' | 'MIXED' | 'SOLID'
  amount?: number // ml
  duration?: number // minutes for breast feeding
  notes?: string
}

interface DiaperData {
  type: 'WET' | 'DIRTY' | 'MIXED'
  consistency?: 'NORMAL' | 'WATERY' | 'HARD'
  notes?: string
}

interface SleepData {
  startTime: string // ISO datetime
  endTime?: string // ISO datetime (may be inferred or null)
  type: 'NAP' | 'NIGHT'
  notes?: string
}
```

**OpenAI Prompt Structure**:
```
System: You are an expert at reading handwritten baby care logs and extracting structured data.

Context:
- These are logs written by nannies tracking baby care
- Common abbreviations:
  * EBM = Exclusive Breast Milk (type: BOTTLE)
  * Formula = Formula feeding
  * Urine only = WET diaper
  * Dirty/Poop = DIRTY diaper
- Times may be written as "9:30", "12:23 AM", "3:00 PM"
- The date is: {user_provided_date}

Task:
Extract all feeding, diaper change, and sleep events from this handwritten log.

Output Format (JSON):
[
  {
    "type": "feeding|diaper|sleep",
    "timestamp": "ISO datetime",
    "data": {...},
    "confidence": 0.0-1.0,
    "originalText": "what you read"
  }
]

Rules:
- Infer AM/PM from context if not specified
- Combine multi-line entries (e.g., feeding amount + notes)
- Parse quantities (90ml, 80ml+30ml)
- Map abbreviations correctly
- If uncertain, set confidence < 0.7
```

#### 3. Review & Edit Interface

**Location**: `frontend/src/app/logs/review/page.tsx`

**URL Structure**: `/logs/review?sessionId={uuid}`

**State Management**:
- Store parsed logs in React state
- Track edits per log
- Flag logs for deletion

**UI Layout**:
```
┌─────────────────────────────────────────────┐
│ Review Imported Logs                         │
│ [Save All Logs]  [Cancel]                   │
├─────────────────────────────────────────────┤
│                                              │
│ Bulk Actions:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Apply to all: [Child: Maryam ▼]  [✓]   │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ FEEDING LOGS (5) ────────────────────┐  │
│ │                                         │  │
│ │ ┌─────────────────────────────────────┐│  │
│ │ │ 🍼 Feeding #1            [Edit][×]  ││  │
│ │ │ Time: 9:30 AM                       ││  │
│ │ │ Type: Bottle                        ││  │
│ │ │ Amount: 90 ml                       ││  │
│ │ │ Notes: Burped well, no vomiting     ││  │
│ │ │ Child: [Maryam ▼]                   ││  │
│ │ │ Confidence: ⭐⭐⭐⭐⭐ (95%)          ││  │
│ │ └─────────────────────────────────────┘│  │
│ │                                         │  │
│ │ ┌─────────────────────────────────────┐│  │
│ │ │ 🍼 Feeding #2            [Edit][×]  ││  │
│ │ │ Time: 12:23 PM                      ││  │
│ │ │ Type: Bottle                        ││  │
│ │ │ Amount: 110 ml (80ml + 30ml)        ││  │
│ │ │ Notes: Burped well                  ││  │
│ │ │ Child: [Maryam ▼]                   ││  │
│ │ │ Confidence: ⭐⭐⭐⭐⭐ (92%)          ││  │
│ │ └─────────────────────────────────────┘│  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ ┌─ DIAPER LOGS (3) ─────────────────────┐  │
│ │                                         │  │
│ │ ┌─────────────────────────────────────┐│  │
│ │ │ 👶 Diaper #1             [Edit][×]  ││  │
│ │ │ Time: 8:45 AM                       ││  │
│ │ │ Type: Wet                           ││  │
│ │ │ Notes: Urine only                   ││  │
│ │ │ Child: [Maryam ▼]                   ││  │
│ │ │ Confidence: ⭐⭐⭐⭐⭐ (98%)          ││  │
│ │ └─────────────────────────────────────┘│  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ ┌─ SLEEP LOGS (2) ──────────────────────┐  │
│ │                                         │  │
│ │ ┌─────────────────────────────────────┐│  │
│ │ │ 🌙 Sleep #1              [Edit][×]  ││  │
│ │ │ Start: 10:20 AM                     ││  │
│ │ │ End: 12:20 PM (inferred)            ││  │
│ │ │ Duration: 2h 0m                     ││  │
│ │ │ Type: Nap                           ││  │
│ │ │ Child: [Maryam ▼]                   ││  │
│ │ │ Confidence: ⭐⭐⭐⭐ (85%)            ││  │
│ │ └─────────────────────────────────────┘│  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ [Save All Logs]  [Cancel]                   │
└─────────────────────────────────────────────┘
```

**Edit Modal**:
When user clicks [Edit], open modal with:
- DateTimeSelector for timestamp
- Type-specific fields (amount, duration, etc.)
- Child selector
- Notes field
- Save/Cancel buttons

**Delete Functionality**:
- Click [×] marks log for deletion (visual strikethrough)
- Removed from save batch

#### 4. Bulk Save Backend

**API Endpoint**: `POST /api/logs/bulk-create`

**Request**:
```typescript
{
  logs: {
    feeding: FeedingLogInput[]
    diaper: DiaperLogInput[]
    sleep: SleepLogInput[]
  }
}

interface FeedingLogInput {
  childId: string
  startTime: string // ISO datetime
  type: FeedingType
  amount?: number
  duration?: number
  notes?: string
  timezone: string
}

// Similar for DiaperLogInput, SleepLogInput
```

**Response**:
```typescript
{
  success: boolean
  created: {
    feeding: number
    diaper: number
    sleep: number
  }
  errors?: Array<{
    type: string
    index: number
    error: string
  }>
}
```

**Processing Logic**:
```typescript
1. Validate all inputs
2. Group by type
3. Create feeding logs (Promise.all)
4. Create diaper logs (Promise.all)
5. Create sleep logs (Promise.all)
6. Invalidate React Query caches
7. Return summary
```

---

## Database Schema Changes

### No schema changes needed!
All existing tables support this feature:
- ✅ `FeedingLog` - has all required fields
- ✅ `DiaperLog` - has all required fields
- ✅ `SleepLog` - has all required fields

### Optional: Track Import History
```prisma
model LogImport {
  id            String   @id @default(cuid())
  userId        String
  imageUrls     String[] // URLs of uploaded images
  parsedCount   Int      // number of logs parsed
  createdCount  Int      // number of logs actually created
  confidence    Float    // average confidence score
  createdAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}
```

---

## File Structure

### Backend
```
backend/src/
├── services/
│   ├── openai.service.ts (NEW)
│   │   - configureOpenAI()
│   │   - analyzeLogImages()
│   │   - parseLogResponse()
│   └── storage.service.ts (UPDATE)
│       - Add uploadLogImage()
├── controllers/
│   └── log-import.controller.ts (NEW)
│       - analyzeImages()
│       - bulkCreateLogs()
├── routes/
│   └── log-import.routes.ts (NEW)
└── utils/
    └── log-parser.ts (NEW)
        - validateParsedLog()
        - inferSleepTimes()
        - parseQuantity()
```

### Frontend
```
frontend/src/
├── app/
│   └── logs/
│       ├── import/
│       │   └── page.tsx (NEW) - Upload interface
│       └── review/
│           └── page.tsx (NEW) - Review & edit interface
├── components/
│   ├── LogImportUploader.tsx (NEW)
│   ├── LogReviewCard.tsx (NEW)
│   └── modals/
│       └── EditParsedLogModal.tsx (NEW)
└── lib/
    └── api.ts (UPDATE)
        - Add logImportAPI
```

---

## Implementation Steps

### Phase 1: Backend Foundation (1 hour)
1. ✅ Install OpenAI SDK: `npm install openai`
2. ✅ Create `openai.service.ts`
3. ✅ Create `log-import.controller.ts`
4. ✅ Create `log-import.routes.ts`
5. ✅ Add `/api/logs/analyze-images` endpoint
6. ✅ Add `/api/logs/bulk-create` endpoint
7. ✅ Test with sample images

### Phase 2: Upload Interface (30 mins)
1. ✅ Create `/logs/import` page
2. ✅ Add file upload component
3. ✅ Add child selector
4. ✅ Add date selector
5. ✅ Connect to backend API
6. ✅ Handle loading states
7. ✅ Navigate to review on success

### Phase 3: Review Interface (1 hour)
1. ✅ Create `/logs/review` page
2. ✅ Create `LogReviewCard` component
3. ✅ Create `EditParsedLogModal`
4. ✅ Add bulk child selector
5. ✅ Add delete functionality
6. ✅ Add save all functionality
7. ✅ Connect to bulk create API

### Phase 4: Testing & Refinement (30 mins)
1. ✅ Test with provided sample images
2. ✅ Test with various handwriting styles
3. ✅ Test edge cases (unclear times, missing data)
4. ✅ Refine OpenAI prompt based on results
5. ✅ Add error handling
6. ✅ Add success/error messages

---

## OpenAI Configuration

### Required Environment Variables
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-vision-preview # or gpt-4o for better performance
OPENAI_MAX_TOKENS=2000
```

### Cost Estimation
- GPT-4 Vision: ~$0.01 per image
- Average use case: 2 images per day
- Monthly cost: ~$0.60

---

## Success Criteria

### Functional Requirements
- ✅ User can upload 1-5 images
- ✅ AI extracts logs with >85% accuracy
- ✅ User can review all parsed logs
- ✅ User can edit any field before saving
- ✅ User can delete incorrect logs
- ✅ Bulk save creates all logs in database
- ✅ Proper error handling and user feedback

### Performance Requirements
- ✅ Image analysis: <10 seconds for 2 images
- ✅ Bulk save: <5 seconds for 20 logs
- ✅ Review page loads instantly

### UX Requirements
- ✅ Clear progress indicators
- ✅ Intuitive edit interface
- ✅ Validation messages
- ✅ Success confirmation
- ✅ Mobile-responsive

---

## Edge Cases to Handle

1. **Unclear Handwriting**
   - Solution: AI sets low confidence, user must review

2. **Missing AM/PM**
   - Solution: AI infers from context, flags for review

3. **Duplicate Entries**
   - Solution: User deletes duplicates in review screen

4. **Multiple Children in Same Log**
   - Solution: User selects child per log in review

5. **Partial Amounts** ("80ml + 30ml")
   - Solution: AI sums totals, shows in notes

6. **Crossed Out Entries**
   - Solution: AI should ignore, or flag for user review

7. **Sleep Without End Time**
   - Solution: Leave endTime null, user can edit later

8. **Non-Standard Abbreviations**
   - Solution: AI makes best guess, user corrects in review

---

## Future Enhancements

### V2 Features
- ✅ Voice note upload → transcription → parsing
- ✅ Batch import from multiple days
- ✅ Template management (different nanny styles)
- ✅ Auto-detect handwriting patterns
- ✅ Schedule recurring imports
- ✅ Export capability (PDF of logs)

### Analytics
- Track import success rates
- Track AI confidence scores
- Identify common parsing errors
- Improve prompts based on feedback

---

## Navigation Integration

Add menu item to main navigation:
```typescript
{
  name: 'Import Logs',
  href: '/logs/import',
  icon: Upload,
  roles: ['PARENT', 'NANNY']
}
```

---

## Testing Plan

### Unit Tests
- ✅ OpenAI service: Mock responses
- ✅ Log parser: Various input formats
- ✅ Bulk create: Validation logic

### Integration Tests
- ✅ Upload → Analyze → Review → Save flow
- ✅ Error handling at each step
- ✅ Multi-child scenarios

### User Acceptance Testing
- ✅ Test with real nanny logs
- ✅ Test with various handwriting styles
- ✅ Test on mobile devices
- ✅ Verify data accuracy in database

---

## Rollout Plan

1. **Development**: Feature branch `feature/ai-log-import`
2. **Testing**: Test with sample images
3. **Staging**: Deploy to test environment
4. **UAT**: Test with actual nanny logs
5. **Production**: Merge to main
6. **Monitor**: Track usage and errors
7. **Iterate**: Refine based on feedback

---

## Documentation

### User Guide
Create help documentation explaining:
1. How to take clear photos of logs
2. Supported log formats
3. How to review and edit parsed logs
4. Best practices for accuracy

### Developer Guide
Document:
1. OpenAI prompt engineering
2. Adding new log types
3. Customizing parsing logic
4. Troubleshooting common issues

---

## Dependencies

### Backend
```json
{
  "openai": "^4.20.0"
}
```

### Frontend
No new dependencies (use existing React Query, Lucide icons)

---

## Security Considerations

1. **Image Upload**
   - Validate file types
   - Limit file sizes
   - Scan for malware (if needed)

2. **OpenAI API**
   - Store API key in environment variables
   - Rate limit requests
   - Log usage for billing

3. **Data Privacy**
   - Images contain PHI (Protected Health Information)
   - Ensure secure transmission
   - Delete images after processing (or store securely)
   - HIPAA compliance if required

---

## Accessibility

- ✅ Keyboard navigation for all actions
- ✅ Screen reader support for review cards
- ✅ Clear focus indicators
- ✅ Alt text for icons
- ✅ ARIA labels for interactive elements

---

## Monitoring & Analytics

### Metrics to Track
- Import attempts per day
- Success rate (logs saved / logs parsed)
- Average confidence scores
- Most common errors
- Time to complete import
- User drop-off points

### Error Tracking
- Failed image uploads
- OpenAI API errors
- Parsing failures
- Validation errors
- Database errors

---

## Success Metrics

### KPIs
- **Adoption**: 50% of users try feature within 2 weeks
- **Accuracy**: >90% of parsed logs require no edits
- **Efficiency**: 80% time savings vs manual entry
- **Satisfaction**: >4.5/5 user rating

---

## Appendix

### Sample API Responses

**Analyze Images Response:**
```json
{
  "success": true,
  "confidence": "high",
  "parsedLogs": [
    {
      "id": "temp-uuid-1",
      "type": "feeding",
      "timestamp": "2025-12-22T09:30:00.000Z",
      "data": {
        "type": "BOTTLE",
        "amount": 90,
        "notes": "Burped well, no vomiting, doing well"
      },
      "confidence": 0.95,
      "originalText": "9:30 - FEEDING - (90ml) - BURPED WELL"
    },
    {
      "id": "temp-uuid-2",
      "type": "diaper",
      "timestamp": "2025-12-22T08:45:00.000Z",
      "data": {
        "type": "WET",
        "notes": "Urine only"
      },
      "confidence": 0.98,
      "originalText": "8:45 - Wake up - URINE ONLY"
    }
  ]
}
```

---

**Last Updated**: December 23, 2025
**Status**: Ready for Implementation
**Estimated Effort**: 3 hours
**Priority**: High
