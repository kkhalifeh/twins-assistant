#!/bin/bash

echo "🧪 Testing AI Conversation Context Awareness"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3003/api"

# Clean up test data
echo ""
echo "${YELLOW}Setup: Cleaning test data${NC}"
PGPASSWORD=password psql -h localhost -U postgres -d twins_assistant -c "DELETE FROM \"FeedingLog\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'contexttest@test.com'); DELETE FROM \"SleepLog\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'contexttest@test.com'); DELETE FROM \"DiaperLog\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'contexttest@test.com'); DELETE FROM \"Child\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'contexttest@test.com'); DELETE FROM \"Account\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'contexttest@test.com'); DELETE FROM \"User\" WHERE email = 'contexttest@test.com';" > /dev/null 2>&1

echo "${GREEN}✅ Test data cleaned${NC}"

echo ""
echo "${YELLOW}Step 1: Register test user${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contexttest@test.com",
    "password": "test123",
    "name": "Context Test User"
  }')

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "${RED}❌ Failed to get auth token${NC}"
  echo "$REGISTER_RESPONSE" | jq '.'
  exit 1
fi
echo "${GREEN}✅ User registered and authenticated${NC}"

echo ""
echo "${YELLOW}Step 2: Create test children (Child A and Child B)${NC}"
CHILDA_RESPONSE=$(curl -s -X POST $API_URL/children \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Child A",
    "dateOfBirth": "2024-07-15",
    "gender": "FEMALE"
  }')

CHILDA_ID=$(echo "$CHILDA_RESPONSE" | jq -r '.id')
echo "${GREEN}✅ Created Child A (ID: $CHILDA_ID)${NC}"

CHILDB_RESPONSE=$(curl -s -X POST $API_URL/children \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Child B",
    "dateOfBirth": "2024-07-15",
    "gender": "FEMALE"
  }')

CHILDB_ID=$(echo "$CHILDB_RESPONSE" | jq -r '.id')
echo "${GREEN}✅ Created Child B (ID: $CHILDB_ID)${NC}"

echo ""
echo "=============================================="
echo "🧪 Testing Conversation Context Scenarios"
echo "=============================================="

# Test 1: User mentions "child b" then uses "she"
echo ""
echo "${YELLOW}Test 1: Conversation context - mention child, then use pronoun${NC}"
echo "User: 'child b'"
TEST1_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "child b"}')

echo "$TEST1_RESPONSE" | jq -r '.message'

sleep 1

echo ""
echo "User: 'she had 2 wet diapers'"
TEST2_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "she had 2 wet diapers"}')

echo "$TEST2_RESPONSE" | jq -r '.message'

# Check if AI asked "which child" (should NOT happen)
if echo "$TEST2_RESPONSE" | jq -r '.message' | grep -qi "which child\|child a or child b"; then
  echo "${RED}❌ Test 1 FAILED: AI asked 'which child' instead of using context${NC}"
else
  echo "${GREEN}✅ Test 1 PASSED: AI used conversation context${NC}"
fi

# Test 2: Missing parameter - feeding without amount
echo ""
echo "${YELLOW}Test 2: Missing parameter - 'i fed her'${NC}"
TEST3_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "i fed her"}')

echo "$TEST3_RESPONSE" | jq -r '.message'

# Check if AI asked for amount conversationally
if echo "$TEST3_RESPONSE" | jq -r '.message' | grep -qi "how much\|amount"; then
  echo "${GREEN}✅ Test 2 PASSED: AI asked for missing parameter${NC}"
else
  echo "${RED}❌ Test 2 FAILED: AI did not ask for missing amount${NC}"
fi

# Test 3: Multi-action - "fed 2 times and 2 wet diapers"
echo ""
echo "${YELLOW}Test 3: Multi-action with some missing info - 'fed 2 times and 2 wet diapers'${NC}"
TEST4_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "fed 2 times and 2 wet diapers"}')

echo "$TEST4_RESPONSE" | jq -r '.message'

# Should either ask for amounts OR use defaults OR break it down
if echo "$TEST4_RESPONSE" | jq -r '.message' | grep -qi "how much\|amount\|recorded\|logged"; then
  echo "${GREEN}✅ Test 3 PASSED: AI handled multi-action intelligently${NC}"
else
  echo "${RED}❌ Test 3 FAILED: AI did not handle multi-action properly${NC}"
fi

echo ""
echo "=============================================="
echo "${GREEN}✅ Conversation Context Testing Complete!${NC}"
echo "=============================================="
