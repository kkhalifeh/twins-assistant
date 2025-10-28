#!/bin/bash

echo "🧪 Testing Image Upload to Cloudflare R2"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
API_URL="http://localhost:3003/api"

echo ""
echo "${YELLOW}Step 1: Register a test user${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "imagetest@test.com",
    "password": "test123",
    "name": "Image Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "${RED}❌ Failed to get auth token${NC}"
  exit 1
fi
echo "${GREEN}✅ Got auth token${NC}"

echo ""
echo "${YELLOW}Step 2: Create a test child${NC}"
CHILD_RESPONSE=$(curl -s -X POST $API_URL/children \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Baby",
    "dateOfBirth": "2024-01-01",
    "gender": "MALE"
  }')

echo "$CHILD_RESPONSE" | jq '.'

CHILD_ID=$(echo "$CHILD_RESPONSE" | jq -r '.id')
if [ "$CHILD_ID" == "null" ] || [ -z "$CHILD_ID" ]; then
  echo "${RED}❌ Failed to create child${NC}"
  exit 1
fi
echo "${GREEN}✅ Created child with ID: $CHILD_ID${NC}"

echo ""
echo "${YELLOW}Step 3: Create a test image (100x100 PNG)${NC}"
# Create a simple test PNG image using ImageMagick or base64
TEST_IMAGE="/tmp/test-diaper-image.png"

# Create a base64 encoded 1x1 red PNG
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==" | base64 -d > $TEST_IMAGE

if [ ! -f "$TEST_IMAGE" ]; then
  echo "${RED}❌ Failed to create test image${NC}"
  exit 1
fi
echo "${GREEN}✅ Created test image at $TEST_IMAGE${NC}"

echo ""
echo "${YELLOW}Step 4: Upload image to diaper log${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST $API_URL/diapers \
  -H "Authorization: Bearer $TOKEN" \
  -F "childId=$CHILD_ID" \
  -F "type=WET" \
  -F "timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  -F "notes=Test upload to Cloudflare R2" \
  -F "image=@$TEST_IMAGE")

echo "$UPLOAD_RESPONSE" | jq '.'

# Extract image URL
IMAGE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.imageUrl')
if [ "$IMAGE_URL" == "null" ] || [ -z "$IMAGE_URL" ]; then
  echo "${RED}❌ No image URL in response${NC}"
  exit 1
fi

echo ""
echo "${GREEN}✅ Image uploaded successfully!${NC}"
echo "Image URL: ${YELLOW}$IMAGE_URL${NC}"

echo ""
echo "${YELLOW}Step 5: Verify image URL format${NC}"
if [[ "$IMAGE_URL" == *"pub-36c9797cf36042708aa0f58ca6cb3979.r2.dev"* ]]; then
  echo "${GREEN}✅ Image URL uses Cloudflare R2 public URL${NC}"
elif [[ "$IMAGE_URL" == *"/uploads/diapers/"* ]]; then
  echo "${YELLOW}⚠️  Image URL uses local storage (cloud storage may not be enabled)${NC}"
else
  echo "${RED}❌ Unexpected image URL format${NC}"
fi

echo ""
echo "${YELLOW}Step 6: Test image accessibility${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL")
if [ "$HTTP_STATUS" == "200" ]; then
  echo "${GREEN}✅ Image is accessible (HTTP $HTTP_STATUS)${NC}"
else
  echo "${RED}❌ Image is NOT accessible (HTTP $HTTP_STATUS)${NC}"
  echo "URL: $IMAGE_URL"
fi

echo ""
echo "${YELLOW}Step 7: Fetch diaper logs to verify${NC}"
LOGS_RESPONSE=$(curl -s -X GET "$API_URL/diapers?childId=$CHILD_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$LOGS_RESPONSE" | jq '.[0]'

echo ""
echo "========================================"
echo "${GREEN}✅ Image Upload Test Complete!${NC}"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Test user created: imagetest@test.com"
echo "  - Child ID: $CHILD_ID"
echo "  - Image URL: $IMAGE_URL"
echo "  - HTTP Status: $HTTP_STATUS"

# Cleanup
rm -f $TEST_IMAGE
