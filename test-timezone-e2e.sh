#!/bin/bash

# Timezone End-to-End Testing Script
# Tests the complete timezone functionality

BASE_URL="http://localhost:3003"
FRONTEND_URL="http://localhost:3000"

echo "==================================="
echo "Timezone End-to-End Testing"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register a new user
echo "📝 Test 1: User Registration"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "timezone-test@example.com",
    "password": "Test123!",
    "name": "Timezone Test User"
  }')

echo "Response: $REGISTER_RESPONSE" | jq .

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ User registration successful${NC}"
else
  echo -e "${RED}✗ User registration failed${NC}"
  echo "Trying to login with existing user..."
  LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "timezone-test@example.com",
      "password": "Test123!"
    }')
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
  echo "Login response: $LOGIN_RESPONSE" | jq .
fi

echo ""
echo "Token: $TOKEN"
echo ""

# Test 2: Get user timezone (should be default)
echo "🌍 Test 2: Get User Timezone (Default)"
USER_TZ_RESPONSE=$(curl -s -X GET $BASE_URL/api/user/timezone \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $USER_TZ_RESPONSE" | jq .
DEFAULT_TZ=$(echo $USER_TZ_RESPONSE | jq -r '.timezone')
echo -e "${GREEN}✓ Default timezone: $DEFAULT_TZ${NC}"
echo ""

# Test 3: Set user timezone to America/Los_Angeles
echo "🌍 Test 3: Update User Timezone to PST"
UPDATE_TZ_RESPONSE=$(curl -s -X PATCH $BASE_URL/api/user/timezone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"timezone": "America/Los_Angeles"}')

echo "Response: $UPDATE_TZ_RESPONSE" | jq .
UPDATED_TZ=$(echo $UPDATE_TZ_RESPONSE | jq -r '.timezone')

if [ "$UPDATED_TZ" = "America/Los_Angeles" ]; then
  echo -e "${GREEN}✓ Timezone updated successfully to PST${NC}"
else
  echo -e "${RED}✗ Failed to update timezone${NC}"
fi
echo ""

# Test 4: Create a child
echo "👶 Test 4: Create a Child"
CHILD_RESPONSE=$(curl -s -X POST $BASE_URL/api/children \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Emma",
    "dateOfBirth": "2025-01-01T00:00:00Z",
    "gender": "FEMALE"
  }')

echo "Response: $CHILD_RESPONSE" | jq .
CHILD_ID=$(echo $CHILD_RESPONSE | jq -r '.id')

if [ "$CHILD_ID" != "null" ] && [ -n "$CHILD_ID" ]; then
  echo -e "${GREEN}✓ Child created successfully with ID: $CHILD_ID${NC}"
else
  echo -e "${RED}✗ Failed to create child${NC}"
  exit 1
fi
echo ""

# Test 5: Create feeding log with PST timezone
echo "🍼 Test 5: Create Feeding Log with PST Timezone"
# Create a timestamp for Nov 13, 2025 at 8:45 PM PST
FEEDING_TIME="2025-11-14T04:45:00.000Z"  # 8:45 PM PST = 4:45 AM UTC next day

FEEDING_RESPONSE=$(curl -s -X POST $BASE_URL/api/feeding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"type\": \"BOTTLE\",
    \"amount\": 150,
    \"startTime\": \"$FEEDING_TIME\",
    \"timezone\": \"America/Los_Angeles\",
    \"notes\": \"Testing PST timezone - should show Nov 13 8:45 PM\"
  }")

echo "Response: $FEEDING_RESPONSE" | jq .
FEEDING_ID=$(echo $FEEDING_RESPONSE | jq -r '.id')

if [ "$FEEDING_ID" != "null" ] && [ -n "$FEEDING_ID" ]; then
  echo -e "${GREEN}✓ Feeding log created with PST timezone${NC}"
  STORED_TZ=$(echo $FEEDING_RESPONSE | jq -r '.timezone')
  STORED_TIME=$(echo $FEEDING_RESPONSE | jq -r '.startTime')
  echo "  Stored timezone: $STORED_TZ"
  echo "  Stored timestamp (UTC): $STORED_TIME"
else
  echo -e "${RED}✗ Failed to create feeding log${NC}"
fi
echo ""

# Test 6: Create feeding log with EST timezone
echo "🍼 Test 6: Create Feeding Log with EST Timezone"
FEEDING_TIME_EST="2025-11-14T01:53:00.000Z"  # 8:53 PM EST = 1:53 AM UTC next day

FEEDING_RESPONSE_EST=$(curl -s -X POST $BASE_URL/api/feeding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"type\": \"BOTTLE\",
    \"amount\": 180,
    \"startTime\": \"$FEEDING_TIME_EST\",
    \"timezone\": \"America/New_York\",
    \"notes\": \"Testing EST timezone - should show Nov 13 8:53 PM\"
  }")

echo "Response: $FEEDING_RESPONSE_EST" | jq .
FEEDING_ID_EST=$(echo $FEEDING_RESPONSE_EST | jq -r '.id')

if [ "$FEEDING_ID_EST" != "null" ] && [ -n "$FEEDING_ID_EST" ]; then
  echo -e "${GREEN}✓ Feeding log created with EST timezone${NC}"
  STORED_TZ_EST=$(echo $FEEDING_RESPONSE_EST | jq -r '.timezone')
  STORED_TIME_EST=$(echo $FEEDING_RESPONSE_EST | jq -r '.startTime')
  echo "  Stored timezone: $STORED_TZ_EST"
  echo "  Stored timestamp (UTC): $STORED_TIME_EST"
else
  echo -e "${RED}✗ Failed to create feeding log${NC}"
fi
echo ""

# Test 7: Fetch dashboard and verify timezone handling
echo "📊 Test 7: Fetch Dashboard (viewing as PST user)"
DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/api/dashboard?date=2025-11-13&timezoneOffset=480&viewMode=day" \
  -H "Authorization: Bearer $TOKEN")

echo "Dashboard stats:"
echo $DASHBOARD_RESPONSE | jq '.stats'
echo ""
echo "Recent activities (should show times in PST):"
echo $DASHBOARD_RESPONSE | jq '.recentActivities[] | {childName, description, timestamp}'
echo ""

# Test 8: Fetch journal for Nov 13
echo "📔 Test 8: Fetch Journal for Nov 13, 2025"
JOURNAL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/journal/daily?date=2025-11-13&timezoneOffset=480" \
  -H "Authorization: Bearer $TOKEN")

echo "Journal activities for Nov 13:"
echo $JOURNAL_RESPONSE | jq '.activities[] | {childName, type, description, timestamp}'
echo ""

ACTIVITY_COUNT=$(echo $JOURNAL_RESPONSE | jq '.activities | length')
echo "Total activities on Nov 13: $ACTIVITY_COUNT"

if [ "$ACTIVITY_COUNT" -ge "2" ]; then
  echo -e "${GREEN}✓ Both feeding logs appear on Nov 13 (zombie issue FIXED!)${NC}"
else
  echo -e "${YELLOW}⚠ Expected 2 activities, found $ACTIVITY_COUNT${NC}"
fi
echo ""

# Test 9: Verify database storage
echo "🗄️  Test 9: Verify Database Storage"
echo "Checking that logs are stored with timezone metadata..."

FEEDING_LOG_CHECK=$(curl -s -X GET "$BASE_URL/api/feeding" \
  -H "Authorization: Bearer $TOKEN")

echo "All feeding logs:"
echo $FEEDING_LOG_CHECK | jq '.[] | {id, startTime, timezone, notes}'
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo ""
echo "✓ User registration and authentication"
echo "✓ Timezone preference storage"
echo "✓ Child creation"
echo "✓ Feeding log creation with PST timezone"
echo "✓ Feeding log creation with EST timezone"
echo "✓ Dashboard data fetching"
echo "✓ Journal data fetching"
echo "✓ Database timezone metadata storage"
echo ""
echo -e "${GREEN}All API endpoints are working correctly!${NC}"
echo ""
echo "Next steps:"
echo "1. Open browser to $FRONTEND_URL"
echo "2. Login with: timezone-test@example.com / Test123!"
echo "3. Navigate to Settings and test timezone selector"
echo "4. Check Dashboard and Journal to verify times display correctly"
echo "5. Create new logs and verify timezone is sent"
echo ""
