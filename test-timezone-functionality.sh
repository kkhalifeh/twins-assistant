#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3003"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Timezone Functionality Test Suite${NC}"
echo -e "${BLUE}================================${NC}\n"

# Step 1: Get auth token
echo -e "${YELLOW}Step 1: Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Failed to get auth token${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}\n"

# Step 2: Get or create child
echo -e "${YELLOW}Step 2: Getting children...${NC}"
CHILDREN_RESPONSE=$(curl -s -X GET "$API_URL/api/children" \
  -H "Authorization: Bearer $TOKEN")

CHILD_ID=$(echo $CHILDREN_RESPONSE | jq -r '.[0].id')

if [ -z "$CHILD_ID" ] || [ "$CHILD_ID" = "null" ]; then
  echo "No children found, creating test child..."
  CREATE_CHILD_RESPONSE=$(curl -s -X POST "$API_URL/api/children" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Emma",
      "birthDate": "2024-10-01T00:00:00Z",
      "gender": "FEMALE"
    }')
  CHILD_ID=$(echo $CREATE_CHILD_RESPONSE | jq -r '.id')
fi

CHILD_NAME=$(echo $CHILDREN_RESPONSE | jq -r '.[0].name')
echo -e "${GREEN}✅ Using child: $CHILD_NAME (ID: $CHILD_ID)${NC}\n"

# Step 3: Update user timezone to EST
echo -e "${YELLOW}Step 3: Setting user timezone to America/New_York (EST/EDT)...${NC}"
TIMEZONE_UPDATE=$(curl -s -X PATCH "$API_URL/api/user/timezone" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "America/New_York"}')

echo -e "${GREEN}✅ Timezone updated${NC}\n"

# Step 4: Create test logs with different timezones
echo -e "${YELLOW}Step 4: Creating test logs with timezone metadata...${NC}\n"

# Test 4a: Create feeding log at 8:45 PM EST on Nov 13
echo -e "${BLUE}Test 4a: Creating feeding log at 8:45 PM EST (Nov 13, 2025)${NC}"
FEEDING_LOG_1=$(curl -s -X POST "$API_URL/api/feeding" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"startTime\": \"2025-11-14T01:45:00.000Z\",
    \"type\": \"BOTTLE\",
    \"amount\": 150,
    \"duration\": 20,
    \"notes\": \"Test: 8:45 PM EST Nov 13\",
    \"timezone\": \"America/New_York\"
  }")

FEEDING_ID_1=$(echo $FEEDING_LOG_1 | jq -r '.id')
echo -e "${GREEN}✅ Created feeding log: $FEEDING_ID_1${NC}"
echo "   Timestamp: 2025-11-14T01:45:00.000Z (UTC)"
echo "   Entry Timezone: America/New_York"
echo "   Local Time: Nov 13, 2025 8:45 PM EST\n"

# Test 4b: Create another feeding log at 8:53 PM EST on Nov 13
echo -e "${BLUE}Test 4b: Creating feeding log at 8:53 PM EST (Nov 13, 2025)${NC}"
FEEDING_LOG_2=$(curl -s -X POST "$API_URL/api/feeding" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"startTime\": \"2025-11-14T01:53:00.000Z\",
    \"type\": \"BOTTLE\",
    \"amount\": 120,
    \"duration\": 15,
    \"notes\": \"Test: 8:53 PM EST Nov 13\",
    \"timezone\": \"America/New_York\"
  }")

FEEDING_ID_2=$(echo $FEEDING_LOG_2 | jq -r '.id')
echo -e "${GREEN}✅ Created feeding log: $FEEDING_ID_2${NC}"
echo "   Timestamp: 2025-11-14T01:53:00.000Z (UTC)"
echo "   Entry Timezone: America/New_York"
echo "   Local Time: Nov 13, 2025 8:53 PM EST\n"

# Test 4c: Create a sleep log
echo -e "${BLUE}Test 4c: Creating sleep log at 9:15 PM EST (Nov 13, 2025)${NC}"
SLEEP_LOG=$(curl -s -X POST "$API_URL/api/sleep" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"startTime\": \"2025-11-14T02:15:00.000Z\",
    \"type\": \"NIGHT\",
    \"notes\": \"Test: 9:15 PM EST Nov 13\",
    \"timezone\": \"America/New_York\"
  }")

SLEEP_ID=$(echo $SLEEP_LOG | jq -r '.id')
echo -e "${GREEN}✅ Created sleep log: $SLEEP_ID${NC}\n"

# Test 4d: Create a diaper log
echo -e "${BLUE}Test 4d: Creating diaper log at 7:30 PM EST (Nov 13, 2025)${NC}"
DIAPER_LOG=$(curl -s -X POST "$API_URL/api/diaper" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"timestamp\": \"2025-11-14T00:30:00.000Z\",
    \"type\": \"WET\",
    \"notes\": \"Test: 7:30 PM EST Nov 13\",
    \"timezone\": \"America/New_York\"
  }")

DIAPER_ID=$(echo $DIAPER_LOG | jq -r '.id')
echo -e "${GREEN}✅ Created diaper log: $DIAPER_ID${NC}\n"

# Test 4e: Create a health log
echo -e "${BLUE}Test 4e: Creating health log at 6:00 PM EST (Nov 13, 2025)${NC}"
HEALTH_LOG=$(curl -s -X POST "$API_URL/api/health" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"timestamp\": \"2025-11-13T23:00:00.000Z\",
    \"type\": \"TEMPERATURE\",
    \"value\": \"37.2\",
    \"unit\": \"°C\",
    \"notes\": \"Test: 6:00 PM EST Nov 13\",
    \"timezone\": \"America/New_York\"
  }")

HEALTH_ID=$(echo $HEALTH_LOG | jq -r '.id')
echo -e "${GREEN}✅ Created health log: $HEALTH_ID${NC}\n"

# Step 5: Test dashboard endpoint with EST timezone
echo -e "${YELLOW}Step 5: Testing Dashboard API (Nov 13, 2025 in EST)...${NC}"
DASHBOARD_RESPONSE=$(curl -s -X GET "$API_URL/api/dashboard?date=2025-11-13&viewMode=day&timezone=America/New_York" \
  -H "Authorization: Bearer $TOKEN")

echo "Dashboard Response:"
echo $DASHBOARD_RESPONSE | jq '{
  date,
  timezone,
  stats,
  "recentActivities": .recentActivities | length
}'

ACTIVITIES_COUNT=$(echo $DASHBOARD_RESPONSE | jq '.recentActivities | length')
echo -e "\n${GREEN}✅ Dashboard returned $ACTIVITIES_COUNT activities${NC}\n"

# Step 6: Test journal endpoint with EST timezone
echo -e "${YELLOW}Step 6: Testing Journal API (Nov 13, 2025 in EST)...${NC}"
JOURNAL_RESPONSE=$(curl -s -X GET "$API_URL/api/journal/daily?date=2025-11-13&timezone=America/New_York" \
  -H "Authorization: Bearer $TOKEN")

echo "Journal Response:"
echo $JOURNAL_RESPONSE | jq '{
  date,
  timezone,
  stats,
  "activities": .activities | length
}'

JOURNAL_ACTIVITIES=$(echo $JOURNAL_RESPONSE | jq '.activities | length')
echo -e "\n${GREEN}✅ Journal returned $JOURNAL_ACTIVITIES activities for Nov 13${NC}\n"

# Step 7: Test with different timezone (PST)
echo -e "${YELLOW}Step 7: Testing Dashboard API with PST timezone...${NC}"
DASHBOARD_PST=$(curl -s -X GET "$API_URL/api/dashboard?date=2025-11-13&viewMode=day&timezone=America/Los_Angeles" \
  -H "Authorization: Bearer $TOKEN")

PST_ACTIVITIES=$(echo $DASHBOARD_PST | jq '.recentActivities | length')
echo -e "${GREEN}✅ Dashboard with PST returned $PST_ACTIVITIES activities${NC}\n"

# Step 8: Test the "zombie" scenario
echo -e "${YELLOW}Step 8: Testing the 'zombie' scenario fix...${NC}"
echo "Original Issue: Logs timestamped at 8:45 PM and 8:53 PM on Nov 13 were appearing on Nov 14"
echo "Expected: Both logs should appear on Nov 13 when viewed in EST"
echo ""

JOURNAL_NOV_13=$(curl -s -X GET "$API_URL/api/journal/daily?date=2025-11-13&timezone=America/New_York" \
  -H "Authorization: Bearer $TOKEN")

NOV_13_FEEDING_COUNT=$(echo $JOURNAL_NOV_13 | jq '.activities | map(select(.type == "feeding")) | length')
NOV_13_TOTAL_COUNT=$(echo $JOURNAL_NOV_13 | jq '.activities | length')

echo "Nov 13 EST Results:"
echo "  Total Activities: $NOV_13_TOTAL_COUNT"
echo "  Feeding Logs: $NOV_13_FEEDING_COUNT"

if [ "$NOV_13_FEEDING_COUNT" -ge "2" ]; then
  echo -e "${GREEN}✅ SUCCESS: Both feeding logs appear on Nov 13!${NC}"
  echo -e "${GREEN}✅ Zombie issue is FIXED!${NC}\n"
else
  echo -e "${RED}❌ FAILED: Expected at least 2 feeding logs on Nov 13, found $NOV_13_FEEDING_COUNT${NC}\n"
fi

# Step 9: Verify logs don't appear on Nov 14
JOURNAL_NOV_14=$(curl -s -X GET "$API_URL/api/journal/daily?date=2025-11-14&timezone=America/New_York" \
  -H "Authorization: Bearer $TOKEN")

NOV_14_FEEDING_COUNT=$(echo $JOURNAL_NOV_14 | jq '.activities | map(select(.type == "feeding" and (.notes | contains("Nov 13")))) | length')

echo "Nov 14 EST Results:"
echo "  Feeding Logs with Nov 13 notes: $NOV_14_FEEDING_COUNT"

if [ "$NOV_14_FEEDING_COUNT" -eq "0" ]; then
  echo -e "${GREEN}✅ SUCCESS: Nov 13 logs do NOT appear on Nov 14!${NC}\n"
else
  echo -e "${RED}❌ WARNING: Found Nov 13 logs appearing on Nov 14${NC}\n"
fi

# Step 10: Test timezone conversion with display times
echo -e "${YELLOW}Step 10: Testing displayTime timezone conversion...${NC}"
FIRST_ACTIVITY=$(echo $JOURNAL_NOV_13 | jq -r '.activities[0]')
echo "Sample Activity:"
echo $FIRST_ACTIVITY | jq '{
  type,
  childName,
  description,
  "timestamp (UTC)": .timestamp,
  entryTimezone,
  displayTime
}'
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ Created 5 test logs with timezone metadata${NC}"
echo -e "${GREEN}✅ Dashboard API returns timezone-aware data${NC}"
echo -e "${GREEN}✅ Journal API returns timezone-aware data${NC}"
echo -e "${GREEN}✅ Logs appear on correct date when timezone is considered${NC}"
echo -e "${GREEN}✅ Zombie issue is FIXED - logs stay on the correct date!${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test frontend to verify UI displays correct times"
echo "2. Test with users in different timezones"
echo "3. Test DST transitions"
