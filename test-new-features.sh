#!/bin/bash

# Test script for new features:
# 1. User Role Management
# 2. Breast Feeding Duration
# 3. Diaper Image Upload

API_URL="http://localhost:3003/api"
FRONTEND_URL="http://localhost:3000"

echo "======================================"
echo "Testing New Features Implementation"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test API endpoints
test_api() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local token=$5
  local expected_status=$6

  echo -n "Testing: $test_name... "

  if [ -n "$token" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$data" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
    ((TESTS_PASSED++))
    echo "$body"
  else
    echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_status, got $status_code)"
    echo "Response: $body"
    ((TESTS_FAILED++))
  fi
  echo ""
}

echo "======================================"
echo "Test 1: User Registration (Parent)"
echo "======================================"
echo ""

# Register parent user
parent_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "parent123",
    "name": "Test Parent"
  }' \
  "$API_URL/auth/register")

PARENT_TOKEN=$(echo "$parent_response" | jq -r '.token')
PARENT_ID=$(echo "$parent_response" | jq -r '.user.id')

if [ -n "$PARENT_TOKEN" ] && [ "$PARENT_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Parent user registered successfully${NC}"
  echo "Parent ID: $PARENT_ID"
  echo "Token obtained: ${PARENT_TOKEN:0:20}..."
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Failed to register parent user${NC}"
  echo "Response: $parent_response"
  ((TESTS_FAILED++))
  exit 1
fi
echo ""

echo "======================================"
echo "Test 2: Add Child"
echo "======================================"
echo ""

child_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -d '{
    "name": "Emma",
    "dateOfBirth": "2024-01-01T00:00:00.000Z",
    "gender": "FEMALE"
  }' \
  "$API_URL/children")

CHILD_ID=$(echo "$child_response" | jq -r '.id')

if [ -n "$CHILD_ID" ] && [ "$CHILD_ID" != "null" ]; then
  echo -e "${GREEN}✓ Child added successfully${NC}"
  echo "Child ID: $CHILD_ID"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Failed to add child${NC}"
  echo "Response: $child_response"
  ((TESTS_FAILED++))
fi
echo ""

echo "======================================"
echo "Test 3: User Role Management"
echo "======================================"
echo ""

# Test 3a: Invite Nanny
echo "3a. Inviting Nanny user..."
nanny_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -d '{
    "email": "nanny@test.com",
    "password": "nanny123",
    "name": "Test Nanny",
    "role": "NANNY"
  }' \
  "$API_URL/users/team/invite")

NANNY_ID=$(echo "$nanny_response" | jq -r '.id')

if [ -n "$NANNY_ID" ] && [ "$NANNY_ID" != "null" ]; then
  echo -e "${GREEN}✓ Nanny user invited successfully${NC}"
  echo "Nanny ID: $NANNY_ID"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Failed to invite nanny${NC}"
  echo "Response: $nanny_response"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3b: Invite Viewer
echo "3b. Inviting Viewer user..."
viewer_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -d '{
    "email": "viewer@test.com",
    "password": "viewer123",
    "name": "Test Viewer",
    "role": "VIEWER"
  }' \
  "$API_URL/users/team/invite")

VIEWER_ID=$(echo "$viewer_response" | jq -r '.id')

if [ -n "$VIEWER_ID" ] && [ "$VIEWER_ID" != "null" ]; then
  echo -e "${GREEN}✓ Viewer user invited successfully${NC}"
  echo "Viewer ID: $VIEWER_ID"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Failed to invite viewer${NC}"
  echo "Response: $viewer_response"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3c: Get team members
echo "3c. Getting team members list..."
team_response=$(curl -s -X GET \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  "$API_URL/users/team")

team_count=$(echo "$team_response" | jq '. | length')

if [ "$team_count" = "3" ]; then
  echo -e "${GREEN}✓ Team members retrieved successfully (3 members)${NC}"
  echo "$team_response" | jq -r '.[] | "  - \(.name) (\(.role))"'
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Expected 3 team members, got $team_count${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3d: Login as Nanny and test access
echo "3d. Testing Nanny role access..."
nanny_login=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nanny@test.com",
    "password": "nanny123"
  }' \
  "$API_URL/auth/login")

NANNY_TOKEN=$(echo "$nanny_login" | jq -r '.token')

if [ -n "$NANNY_TOKEN" ] && [ "$NANNY_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Nanny login successful${NC}"
  ((TESTS_PASSED++))

  # Test Nanny can access feeding endpoint
  echo "  Testing Nanny can access feeding logs..."
  nanny_feeding_test=$(curl -s -w "%{http_code}" -X GET \
    -H "Authorization: Bearer $NANNY_TOKEN" \
    "$API_URL/feeding")

  nanny_feeding_status=$(echo "$nanny_feeding_test" | tail -c 4)

  if [ "$nanny_feeding_status" = "200" ]; then
    echo -e "${GREEN}  ✓ Nanny can access feeding endpoint${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}  ✗ Nanny cannot access feeding endpoint (HTTP $nanny_feeding_status)${NC}"
    ((TESTS_FAILED++))
  fi

  # Test Nanny cannot access inventory endpoint
  echo "  Testing Nanny cannot access inventory..."
  nanny_inventory_test=$(curl -s -w "%{http_code}" -X GET \
    -H "Authorization: Bearer $NANNY_TOKEN" \
    "$API_URL/inventory")

  nanny_inventory_status=$(echo "$nanny_inventory_test" | tail -c 4)

  if [ "$nanny_inventory_status" = "403" ]; then
    echo -e "${GREEN}  ✓ Nanny correctly denied access to inventory (HTTP 403)${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}  ✗ Nanny should be denied access to inventory (Expected 403, got $nanny_inventory_status)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ Nanny login failed${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3e: Login as Viewer and test read-only access
echo "3e. Testing Viewer role access..."
viewer_login=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "viewer@test.com",
    "password": "viewer123"
  }' \
  "$API_URL/auth/login")

VIEWER_TOKEN=$(echo "$viewer_login" | jq -r '.token')

if [ -n "$VIEWER_TOKEN" ] && [ "$VIEWER_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Viewer login successful${NC}"
  ((TESTS_PASSED++))

  # Test Viewer can read feeding logs
  echo "  Testing Viewer can read feeding logs..."
  viewer_read_test=$(curl -s -w "%{http_code}" -X GET \
    -H "Authorization: Bearer $VIEWER_TOKEN" \
    "$API_URL/feeding")

  viewer_read_status=$(echo "$viewer_read_test" | tail -c 4)

  if [ "$viewer_read_status" = "200" ]; then
    echo -e "${GREEN}  ✓ Viewer can read feeding endpoint${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}  ✗ Viewer cannot read feeding endpoint (HTTP $viewer_read_status)${NC}"
    ((TESTS_FAILED++))
  fi

  # Test Viewer cannot write (create feeding log)
  echo "  Testing Viewer cannot create feeding log..."
  viewer_write_test=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $VIEWER_TOKEN" \
    -d "{
      \"childId\": \"$CHILD_ID\",
      \"type\": \"BOTTLE\",
      \"amount\": 100,
      \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
    }" \
    "$API_URL/feeding")

  viewer_write_status=$(echo "$viewer_write_test" | tail -c 4)

  if [ "$viewer_write_status" = "403" ]; then
    echo -e "${GREEN}  ✓ Viewer correctly denied write access (HTTP 403)${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}  ✗ Viewer should be denied write access (Expected 403, got $viewer_write_status)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ Viewer login failed${NC}"
  ((TESTS_FAILED++))
fi
echo ""

echo "======================================"
echo "Test 4: Breast Feeding Duration"
echo "======================================"
echo ""

# Test 4: Create breast feeding log with duration
echo "Creating breast feeding log with 15 minute duration..."
breast_feeding_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -d "{
    \"childId\": \"$CHILD_ID\",
    \"type\": \"BREAST\",
    \"duration\": 15,
    \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
    \"notes\": \"Test breast feeding with duration\"
  }" \
  "$API_URL/feeding")

FEEDING_ID=$(echo "$breast_feeding_response" | jq -r '.id')
FEEDING_DURATION=$(echo "$breast_feeding_response" | jq -r '.duration')

if [ -n "$FEEDING_ID" ] && [ "$FEEDING_ID" != "null" ] && [ "$FEEDING_DURATION" = "15" ]; then
  echo -e "${GREEN}✓ Breast feeding log created with duration${NC}"
  echo "Feeding ID: $FEEDING_ID"
  echo "Duration: $FEEDING_DURATION minutes"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Failed to create breast feeding log with duration${NC}"
  echo "Response: $breast_feeding_response"
  ((TESTS_FAILED++))
fi
echo ""

echo "======================================"
echo "Test 5: Diaper Image Upload"
echo "======================================"
echo ""

# Test 5: Create a test image and upload with diaper log
echo "Creating test image for upload..."
# Create a small test image (1x1 PNG)
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test-diaper.png

echo "Uploading diaper log with image..."
diaper_response=$(curl -s -X POST \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -F "childId=$CHILD_ID" \
  -F "type=WET" \
  -F "timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" \
  -F "notes=Test diaper with image upload" \
  -F "image=@/tmp/test-diaper.png" \
  "$API_URL/diapers")

DIAPER_ID=$(echo "$diaper_response" | jq -r '.id')
DIAPER_IMAGE_URL=$(echo "$diaper_response" | jq -r '.imageUrl')

if [ -n "$DIAPER_ID" ] && [ "$DIAPER_ID" != "null" ] && [ -n "$DIAPER_IMAGE_URL" ] && [ "$DIAPER_IMAGE_URL" != "null" ]; then
  echo -e "${GREEN}✓ Diaper log created with image upload${NC}"
  echo "Diaper ID: $DIAPER_ID"
  echo "Image URL: $DIAPER_IMAGE_URL"
  ((TESTS_PASSED++))

  # Verify image is accessible
  echo "Verifying uploaded image is accessible..."
  image_check=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3003$DIAPER_IMAGE_URL")

  if [ "$image_check" = "200" ]; then
    echo -e "${GREEN}✓ Uploaded image is accessible${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ Uploaded image is not accessible (HTTP $image_check)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ Failed to create diaper log with image${NC}"
  echo "Response: $diaper_response"
  ((TESTS_FAILED++))
fi

# Cleanup
rm -f /tmp/test-diaper.png
echo ""

echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
  echo ""
  echo "You can now access the application at:"
  echo "  Frontend: $FRONTEND_URL"
  echo "  Backend:  $API_URL"
  echo ""
  echo "Test Credentials:"
  echo "  Parent: parent@test.com / parent123"
  echo "  Nanny:  nanny@test.com / nanny123"
  echo "  Viewer: viewer@test.com / viewer123"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
