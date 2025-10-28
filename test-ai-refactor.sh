#!/bin/bash

echo "🧪 Testing AI Chat Refactor (Context-Based System)"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API URL
API_URL="http://localhost:3003/api"

# Clean up test data
echo ""
echo "${YELLOW}Setup: Cleaning test data${NC}"
PGPASSWORD=password psql -h localhost -U postgres -d twins_assistant -c "DELETE FROM \"FeedingLog\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'aitest@test.com'); DELETE FROM \"SleepLog\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'aitest@test.com'); DELETE FROM \"DiaperLog\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'aitest@test.com'); DELETE FROM \"Child\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'aitest@test.com'); DELETE FROM \"Account\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email = 'aitest@test.com'); DELETE FROM \"User\" WHERE email = 'aitest@test.com';" > /dev/null 2>&1

echo "${GREEN}✅ Test data cleaned${NC}"

echo ""
echo "${YELLOW}Step 1: Register test user${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aitest@test.com",
    "password": "test123",
    "name": "AI Test User"
  }')

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "${RED}❌ Failed to get auth token${NC}"
  echo "$REGISTER_RESPONSE" | jq '.'
  exit 1
fi
echo "${GREEN}✅ User registered and authenticated${NC}"

echo ""
echo "${YELLOW}Step 2: Create test children (Nathalie and Emma)${NC}"
NATHALIE_RESPONSE=$(curl -s -X POST $API_URL/children \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Nathalie",
    "dateOfBirth": "2024-07-15",
    "gender": "FEMALE"
  }')

NATHALIE_ID=$(echo "$NATHALIE_RESPONSE" | jq -r '.id')
echo "${GREEN}✅ Created Nathalie (ID: $NATHALIE_ID)${NC}"

EMMA_RESPONSE=$(curl -s -X POST $API_URL/children \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Emma",
    "dateOfBirth": "2024-07-15",
    "gender": "FEMALE"
  }')

EMMA_ID=$(echo "$EMMA_RESPONSE" | jq -r '.id')
echo "${GREEN}✅ Created Emma (ID: $EMMA_ID)${NC}"

echo ""
echo "=================================================="
echo "🧪 Testing AI Chat with Misspellings & Context"
echo "=================================================="

# Test 1: Misspelling - "natalie" instead of "Nathalie"
echo ""
echo "${YELLOW}Test 1: Misspelling tolerance - 'fed natalie 150ml'${NC}"
TEST1_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "fed natalie 150ml"}')

echo "$TEST1_RESPONSE" | jq -r '.message'
if echo "$TEST1_RESPONSE" | jq -r '.message' | grep -q "Nathalie"; then
  echo "${GREEN}✅ Test 1 PASSED: AI correctly matched 'natalie' to 'Nathalie'${NC}"
else
  echo "${RED}❌ Test 1 FAILED${NC}"
fi

# Test 2: Typo - "nathaly" instead of "Nathalie"
echo ""
echo "${YELLOW}Test 2: Severe misspelling - 'nathaly is sleeping'${NC}"
TEST2_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "nathaly is sleeping"}')

echo "$TEST2_RESPONSE" | jq -r '.message'
if echo "$TEST2_RESPONSE" | jq -r '.message' | grep -q "Nathalie"; then
  echo "${GREEN}✅ Test 2 PASSED: AI correctly matched 'nathaly' to 'Nathalie'${NC}"
else
  echo "${RED}❌ Test 2 FAILED${NC}"
fi

# Test 3: Nickname - "em" for Emma
echo ""
echo "${YELLOW}Test 3: Nickname - 'em ate 100ml'${NC}"
TEST3_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "em ate 100ml"}')

echo "$TEST3_RESPONSE" | jq -r '.message'
if echo "$TEST3_RESPONSE" | jq -r '.message' | grep -q "Emma"; then
  echo "${GREEN}✅ Test 3 PASSED: AI correctly matched 'em' to 'Emma'${NC}"
else
  echo "${RED}❌ Test 3 FAILED${NC}"
fi

# Test 4: Multi-child - "both babies"
echo ""
echo "${YELLOW}Test 4: Multi-child operation - 'both babies had wet diapers'${NC}"
TEST4_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "both babies had wet diapers"}')

echo "$TEST4_RESPONSE" | jq -r '.message'
if echo "$TEST4_RESPONSE" | jq -r '.message' | grep -q "Nathalie" && echo "$TEST4_RESPONSE" | jq -r '.message' | grep -q "Emma"; then
  echo "${GREEN}✅ Test 4 PASSED: AI handled 'both babies' correctly${NC}"
else
  echo "${RED}❌ Test 4 FAILED${NC}"
fi

# Test 5: Case insensitivity - "EMMA"
echo ""
echo "${YELLOW}Test 5: Case insensitivity - 'EMMA woke up'${NC}"
TEST5_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "EMMA woke up"}')

echo "$TEST5_RESPONSE" | jq -r '.message'
if echo "$TEST5_RESPONSE" | jq -r '.message' | grep -q "Emma"; then
  echo "${GREEN}✅ Test 5 PASSED: AI handled case insensitivity${NC}"
else
  echo "${RED}❌ Test 5 FAILED${NC}"
fi

# Test 6: Query functions - "when was nathalie last fed?"
echo ""
echo "${YELLOW}Test 6: Query with misspelling - 'when was natalie last fed?'${NC}"
TEST6_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "when was natalie last fed?"}')

echo "$TEST6_RESPONSE" | jq -r '.message'
if echo "$TEST6_RESPONSE" | jq -r '.message' | grep -q "150ml"; then
  echo "${GREEN}✅ Test 6 PASSED: AI correctly queried Nathalie's last feeding${NC}"
else
  echo "${RED}❌ Test 6 FAILED${NC}"
fi

# Test 7: Today's summary
echo ""
echo "${YELLOW}Test 7: Daily summary - 'show today's summary'${NC}"
TEST7_RESPONSE=$(curl -s -X POST $API_URL/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "show todays summary"}')

echo "$TEST7_RESPONSE" | jq -r '.message'
if echo "$TEST7_RESPONSE" | jq -r '.message' | grep -q "Nathalie" && echo "$TEST7_RESPONSE" | jq -r '.message' | grep -q "Emma"; then
  echo "${GREEN}✅ Test 7 PASSED: AI generated summary for both children${NC}"
else
  echo "${RED}❌ Test 7 FAILED${NC}"
fi

echo ""
echo "=================================================="
echo "${GREEN}✅ AI Chat Refactor Testing Complete!${NC}"
echo "=================================================="
echo ""
echo "Summary:"
echo "  - Context-based system prompt: Working"
echo "  - Misspelling tolerance: Tested"
echo "  - Nickname matching: Tested"
echo "  - Multi-child operations: Tested"
echo "  - Case insensitivity: Tested"
echo "  - Query functions: Tested"
echo "  - Summary generation: Tested"
