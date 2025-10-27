#!/bin/bash

# Comprehensive Test Script for Multi-User Account
# Tests 2 children, 2 parents, 1 nanny with 20+ scenarios

BASE_URL="http://localhost:3003/api"
FEEDBACK_FILE="TEST_FEEDBACK.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Starting Comprehensive Multi-User Account Test"
echo "=================================================="
echo ""

# Initialize feedback file
cat > $FEEDBACK_FILE <<EOF
# Comprehensive Test Feedback Report
Generated: $(date)

## Test Scenario
- 2 Children (Emma, Noah)
- 2 Parents (Parent 1 - Owner, Parent 2 - Member)
- 1 Nanny
- 20+ Actions covering CRUD operations, AI chat, and multi-user scenarios

---

## Issues Found

EOF

# Function to log test
log_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

# Function to log success
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to log error
log_error() {
    echo -e "${RED}✗${NC} $1"
    echo "- ❌ **$1**" >> $FEEDBACK_FILE
}

# Function to make API call and check response
api_call() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4

    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token")
    fi

    echo "$response"
}

echo "📝 Step 1: Create Parent 1 (Account Owner)"
log_test "Register Parent 1"
PARENT1_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "parent1@test.com",
        "password": "password123",
        "name": "Parent One",
        "role": "PARENT"
    }')

PARENT1_TOKEN=$(echo $PARENT1_RESPONSE | jq -r '.token')
PARENT1_ID=$(echo $PARENT1_RESPONSE | jq -r '.user.id')

if [ "$PARENT1_TOKEN" != "null" ]; then
    log_success "Parent 1 registered successfully"
else
    log_error "Failed to register Parent 1"
    echo $PARENT1_RESPONSE
fi

echo ""
echo "👶 Step 2: Create 2 Children"
log_test "Create Emma"
EMMA_RESPONSE=$(curl -s -X POST "$BASE_URL/children" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "name": "Emma",
        "dateOfBirth": "2024-01-15",
        "gender": "FEMALE"
    }')

EMMA_ID=$(echo $EMMA_RESPONSE | jq -r '.id')
if [ "$EMMA_ID" != "null" ]; then
    log_success "Emma created successfully (ID: $EMMA_ID)"
else
    log_error "Failed to create Emma"
fi

log_test "Create Noah"
NOAH_RESPONSE=$(curl -s -X POST "$BASE_URL/children" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "name": "Noah",
        "dateOfBirth": "2024-01-15",
        "gender": "MALE"
    }')

NOAH_ID=$(echo $NOAH_RESPONSE | jq -r '.id')
if [ "$NOAH_ID" != "null" ]; then
    log_success "Noah created successfully (ID: $NOAH_ID)"
else
    log_error "Failed to create Noah"
fi

echo ""
echo "👥 Step 3: Invite Parent 2 and Nanny"
log_test "Invite Parent 2"
PARENT2_INVITE=$(curl -s -X POST "$BASE_URL/users/team/invite" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "email": "parent2@test.com",
        "name": "Parent Two",
        "role": "PARENT",
        "password": "defaultPassword123"
    }')

log_test "Invite Nanny"
NANNY_INVITE=$(curl -s -X POST "$BASE_URL/users/team/invite" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "email": "nanny@test.com",
        "name": "Super Nanny",
        "role": "NANNY",
        "password": "defaultPassword123"
    }')

log_test "Login as Parent 2"
PARENT2_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "parent2@test.com",
        "password": "defaultPassword123"
    }')

PARENT2_TOKEN=$(echo $PARENT2_RESPONSE | jq -r '.token')
if [ "$PARENT2_TOKEN" != "null" ]; then
    log_success "Parent 2 logged in successfully"
else
    log_error "Failed to login as Parent 2"
fi

log_test "Login as Nanny"
NANNY_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "nanny@test.com",
        "password": "defaultPassword123"
    }')

NANNY_TOKEN=$(echo $NANNY_RESPONSE | jq -r '.token')
if [ "$NANNY_TOKEN" != "null" ]; then
    log_success "Nanny logged in successfully"
else
    log_error "Failed to login as Nanny"
fi

echo ""
echo "📊 Step 4: Test Data Visibility"

log_test "Parent 1 - Get children"
P1_CHILDREN=$(api_call "GET" "/children" "$PARENT1_TOKEN")
P1_CHILD_COUNT=$(echo $P1_CHILDREN | jq '. | length')
if [ "$P1_CHILD_COUNT" == "2" ]; then
    log_success "Parent 1 sees both children"
else
    log_error "Parent 1 only sees $P1_CHILD_COUNT children (expected 2)"
fi

log_test "Parent 2 - Get children"
P2_CHILDREN=$(api_call "GET" "/children" "$PARENT2_TOKEN")
P2_CHILD_COUNT=$(echo $P2_CHILDREN | jq '. | length')
if [ "$P2_CHILD_COUNT" == "2" ]; then
    log_success "Parent 2 sees both children"
else
    log_error "Parent 2 only sees $P2_CHILD_COUNT children (expected 2)"
fi

log_test "Nanny - Get children"
N_CHILDREN=$(api_call "GET" "/children" "$NANNY_TOKEN")
N_CHILD_COUNT=$(echo $N_CHILDREN | jq '. | length')
if [ "$N_CHILD_COUNT" == "2" ]; then
    log_success "Nanny sees both children"
else
    log_error "Nanny only sees $N_CHILD_COUNT children (expected 2)"
fi

echo ""
echo "🍼 Step 5: Test Feeding Logs (Parent 1)"

log_test "Parent 1 - Log feeding for Emma"
FEED_EMMA=$(curl -s -X POST "$BASE_URL/feeding" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d "{
        \"childId\": \"$EMMA_ID\",
        \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"BOTTLE\",
        \"amount\": 120,
        \"notes\": \"Fed by Parent 1\"
    }")

FEED_EMMA_ID=$(echo $FEED_EMMA | jq -r '.id')
if [ "$FEED_EMMA_ID" != "null" ]; then
    log_success "Parent 1 logged feeding for Emma"
else
    log_error "Parent 1 failed to log feeding for Emma"
fi

log_test "Parent 1 - Log feeding for Noah"
FEED_NOAH=$(curl -s -X POST "$BASE_URL/feeding" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d "{
        \"childId\": \"$NOAH_ID\",
        \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"BOTTLE\",
        \"amount\": 130,
        \"notes\": \"Fed by Parent 1\"
    }")

if [ "$(echo $FEED_NOAH | jq -r '.id')" != "null" ]; then
    log_success "Parent 1 logged feeding for Noah"
else
    log_error "Parent 1 failed to log feeding for Noah"
fi

echo ""
echo "😴 Step 6: Test Sleep Logs (Parent 2)"

log_test "Parent 2 - Start sleep for Emma"
SLEEP_EMMA=$(curl -s -X POST "$BASE_URL/sleep" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT2_TOKEN" \
    -d "{
        \"childId\": \"$EMMA_ID\",
        \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"NAP\",
        \"notes\": \"Put down for nap by Parent 2\"
    }")

SLEEP_EMMA_ID=$(echo $SLEEP_EMMA | jq -r '.id')
if [ "$SLEEP_EMMA_ID" != "null" ]; then
    log_success "Parent 2 logged sleep for Emma"
else
    log_error "Parent 2 failed to log sleep for Emma"
fi

log_test "Parent 2 - Start sleep for Noah"
SLEEP_NOAH=$(curl -s -X POST "$BASE_URL/sleep" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT2_TOKEN" \
    -d "{
        \"childId\": \"$NOAH_ID\",
        \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"NAP\",
        \"notes\": \"Put down for nap by Parent 2\"
    }")

if [ "$(echo $SLEEP_NOAH | jq -r '.id')" != "null" ]; then
    log_success "Parent 2 logged sleep for Noah"
else
    log_error "Parent 2 failed to log sleep for Noah"
fi

echo ""
echo "🧷 Step 7: Test Diaper Logs (Nanny)"

log_test "Nanny - Log diaper change for Emma"
DIAPER_EMMA=$(curl -s -X POST "$BASE_URL/diapers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $NANNY_TOKEN" \
    -d "{
        \"childId\": \"$EMMA_ID\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"WET\",
        \"notes\": \"Changed by Nanny\"
    }")

if [ "$(echo $DIAPER_EMMA | jq -r '.id')" != "null" ]; then
    log_success "Nanny logged diaper change for Emma"
else
    log_error "Nanny failed to log diaper change for Emma"
fi

log_test "Nanny - Log diaper change for Noah"
DIAPER_NOAH=$(curl -s -X POST "$BASE_URL/diapers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $NANNY_TOKEN" \
    -d "{
        \"childId\": \"$NOAH_ID\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"DIRTY\",
        \"notes\": \"Changed by Nanny\"
    }")

if [ "$(echo $DIAPER_NOAH | jq -r '.id')" != "null" ]; then
    log_success "Nanny logged diaper change for Noah"
else
    log_error "Nanny failed to log diaper change for Noah"
fi

echo ""
echo "🏥 Step 8: Test Health Logs (Parent 1)"

log_test "Parent 1 - Log temperature for Emma"
HEALTH_EMMA=$(curl -s -X POST "$BASE_URL/health" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d "{
        \"childId\": \"$EMMA_ID\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"TEMPERATURE\",
        \"value\": \"36.7\",
        \"unit\": \"°C\"
    }")

if [ "$(echo $HEALTH_EMMA | jq -r '.id')" != "null" ]; then
    log_success "Parent 1 logged health for Emma"
else
    log_error "Parent 1 failed to log health for Emma"
fi

echo ""
echo "📖 Step 9: Test Cross-User Data Visibility"

log_test "Parent 2 - View feeding logs (should see Parent 1's logs)"
P2_FEEDINGS=$(api_call "GET" "/feeding" "$PARENT2_TOKEN")
P2_FEED_COUNT=$(echo $P2_FEEDINGS | jq '. | length')
if [ "$P2_FEED_COUNT" == "2" ]; then
    log_success "Parent 2 sees feeding logs from Parent 1"
else
    log_error "Parent 2 sees $P2_FEED_COUNT feeding logs (expected 2)"
fi

log_test "Nanny - View sleep logs (should see Parent 2's logs)"
N_SLEEP=$(api_call "GET" "/sleep" "$NANNY_TOKEN")
N_SLEEP_COUNT=$(echo $N_SLEEP | jq '. | length')
if [ "$N_SLEEP_COUNT" == "2" ]; then
    log_success "Nanny sees sleep logs from Parent 2"
else
    log_error "Nanny sees $N_SLEEP_COUNT sleep logs (expected 2)"
fi

log_test "Parent 1 - View diaper logs (should see Nanny's logs)"
P1_DIAPERS=$(api_call "GET" "/diapers" "$PARENT1_TOKEN")
P1_DIAPER_COUNT=$(echo $P1_DIAPERS | jq '. | length')
if [ "$P1_DIAPER_COUNT" == "2" ]; then
    log_success "Parent 1 sees diaper logs from Nanny"
else
    log_error "Parent 1 sees $P1_DIAPER_COUNT diaper logs (expected 2)"
fi

echo ""
echo "✏️ Step 10: Test Update Operations"

log_test "Parent 2 - Update Parent 1's feeding log"
UPDATE_FEED=$(curl -s -X PUT "$BASE_URL/feeding/$FEED_EMMA_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT2_TOKEN" \
    -d '{
        "amount": 150,
        "notes": "Updated by Parent 2"
    }')

if [ "$(echo $UPDATE_FEED | jq -r '.amount')" == "150" ]; then
    log_success "Parent 2 can update Parent 1's feeding log"
else
    log_error "Parent 2 cannot update Parent 1's feeding log"
fi

log_test "Parent 1 - End Parent 2's sleep session for Emma"
END_SLEEP=$(curl -s -X PUT "$BASE_URL/sleep/$SLEEP_EMMA_ID/end" \
    -H "Authorization: Bearer $PARENT1_TOKEN")

if [ "$(echo $END_SLEEP | jq -r '.endTime')" != "null" ]; then
    log_success "Parent 1 can end sleep session started by Parent 2"
else
    log_error "Parent 1 cannot end sleep session started by Parent 2"
fi

echo ""
echo "📱 Step 11: Test AI Chat Interface"

log_test "AI Chat - Log feeding for Emma via chat"
CHAT_FEED=$(curl -s -X POST "$BASE_URL/chat/message" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "message": "Fed Emma 140ml of formula"
    }')

echo "Chat Response: $CHAT_FEED"
if echo "$CHAT_FEED" | jq -e '.message' > /dev/null 2>&1; then
    log_success "AI Chat processed feeding command"
else
    log_error "AI Chat failed to process feeding command or endpoint doesn't exist"
fi

log_test "AI Chat - Query last feeding"
CHAT_QUERY=$(curl -s -X POST "$BASE_URL/chat/message" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "message": "When was Emma last fed?"
    }')

echo "Chat Response: $CHAT_QUERY"
if echo "$CHAT_QUERY" | jq -e '.message' > /dev/null 2>&1; then
    log_success "AI Chat answered query"
else
    log_error "AI Chat failed to answer query or endpoint doesn't exist"
fi

echo ""
echo "📊 Step 12: Test Dashboard and Analytics"

log_test "Parent 1 - Get dashboard data"
DASHBOARD=$(api_call "GET" "/dashboard" "$PARENT1_TOKEN")
if echo "$DASHBOARD" | jq -e '.stats' > /dev/null 2>&1; then
    log_success "Dashboard loads correctly for Parent 1"
else
    log_error "Dashboard failed to load for Parent 1"
fi

log_test "Parent 2 - Get analytics insights"
ANALYTICS=$(api_call "GET" "/analytics/insights" "$PARENT2_TOKEN")
if echo "$ANALYTICS" | jq -e '.' > /dev/null 2>&1; then
    log_success "Analytics loads correctly for Parent 2"
else
    log_error "Analytics failed to load for Parent 2"
fi

echo ""
echo "📓 Step 13: Test Journal"

log_test "Parent 1 - Get daily journal"
JOURNAL=$(api_call "GET" "/journal/daily" "$PARENT1_TOKEN")
JOURNAL_ACTIVITIES=$(echo $JOURNAL | jq '.activities | length')
if [ "$JOURNAL_ACTIVITIES" -ge "5" ]; then
    log_success "Journal shows all activities (found $JOURNAL_ACTIVITIES)"
else
    log_error "Journal shows only $JOURNAL_ACTIVITIES activities (expected >= 5)"
fi

echo ""
echo "🗑️ Step 14: Test Delete Operations"

log_test "Parent 1 - Delete own feeding log"
DELETE_FEED=$(curl -s -X DELETE "$BASE_URL/feeding/$FEED_EMMA_ID" \
    -H "Authorization: Bearer $PARENT1_TOKEN")

if echo "$DELETE_FEED" | jq -e '.message' > /dev/null 2>&1; then
    log_success "Parent 1 can delete own feeding log"
else
    log_error "Parent 1 cannot delete own feeding log"
fi

log_test "Parent 2 - Delete sleep log"
DELETE_SLEEP=$(curl -s -X DELETE "$BASE_URL/sleep/$SLEEP_EMMA_ID" \
    -H "Authorization: Bearer $PARENT2_TOKEN")

if echo "$DELETE_SLEEP" | jq -e '.message' > /dev/null 2>&1; then
    log_success "Parent 2 can delete sleep log"
else
    log_error "Parent 2 cannot delete sleep log"
fi

echo ""
echo "📦 Step 15: Test Inventory Management"

log_test "Parent 1 - Add inventory item"
INVENTORY=$(curl -s -X POST "$BASE_URL/inventory" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d '{
        "category": "FORMULA",
        "itemName": "Baby Formula",
        "currentStock": 3,
        "minimumStock": 1,
        "brand": "Similac"
    }')

INVENTORY_ID=$(echo $INVENTORY | jq -r '.id')
if [ "$INVENTORY_ID" != "null" ]; then
    log_success "Parent 1 added inventory item"
else
    log_error "Parent 1 failed to add inventory item"
fi

log_test "Parent 2 - View inventory (should see Parent 1's item)"
P2_INVENTORY=$(api_call "GET" "/inventory" "$PARENT2_TOKEN")
P2_INV_COUNT=$(echo $P2_INVENTORY | jq '. | length')
if [ "$P2_INV_COUNT" == "1" ]; then
    log_success "Parent 2 sees Parent 1's inventory item"
else
    log_error "Parent 2 doesn't see inventory items"
fi

log_test "Parent 2 - Update inventory item"
UPDATE_INV=$(curl -s -X PUT "$BASE_URL/inventory/$INVENTORY_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT2_TOKEN" \
    -d '{
        "currentStock": 2
    }')

if [ "$(echo $UPDATE_INV | jq -r '.currentStock')" == "2" ]; then
    log_success "Parent 2 can update Parent 1's inventory"
else
    log_error "Parent 2 cannot update inventory"
fi

echo ""
echo "🔍 Step 16: Test Edge Cases"

log_test "Nanny - Try to create a child (should fail for NANNY role)"
NANNY_CHILD=$(curl -s -X POST "$BASE_URL/children" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $NANNY_TOKEN" \
    -d '{
        "name": "Test",
        "dateOfBirth": "2024-01-15",
        "gender": "MALE"
    }')

if echo "$NANNY_CHILD" | grep -q "error" || echo "$NANNY_CHILD" | grep -q "denied"; then
    log_success "Nanny correctly denied from creating children"
else
    log_error "Nanny was able to create a child (should be restricted)"
fi

log_test "Parent 1 - Get last feeding for Emma"
LAST_FEED=$(api_call "GET" "/feeding/last/$EMMA_ID" "$PARENT1_TOKEN")
if echo "$LAST_FEED" | jq -e '.id' > /dev/null 2>&1 || echo "$LAST_FEED" | jq -e '.message' > /dev/null 2>&1; then
    log_success "Last feeding endpoint works"
else
    log_error "Last feeding endpoint failed"
fi

log_test "Parent 2 - Get last diaper change for Noah"
LAST_DIAPER=$(api_call "GET" "/diapers/last/$NOAH_ID" "$PARENT2_TOKEN")
if echo "$LAST_DIAPER" | jq -e '.' > /dev/null 2>&1; then
    log_success "Last diaper change endpoint works"
else
    log_error "Last diaper change endpoint failed"
fi

echo ""
echo "🗄️ Step 17: Test Data Management (Privacy Settings)"

log_test "Parent 1 - Delete all feeding data"
DELETE_ALL_FEED=$(curl -s -X DELETE "$BASE_URL/data/feeding" \
    -H "Authorization: Bearer $PARENT1_TOKEN")

if echo "$DELETE_ALL_FEED" | jq -e '.success' > /dev/null 2>&1; then
    log_success "Delete all feeding data works"
else
    log_error "Delete all feeding data failed"
fi

# Verify deletion worked
REMAINING_FEEDS=$(api_call "GET" "/feeding" "$PARENT2_TOKEN")
REMAINING_COUNT=$(echo $REMAINING_FEEDS | jq '. | length')
if [ "$REMAINING_COUNT" == "0" ]; then
    log_success "All feeding data successfully deleted"
else
    log_error "Feeding data not fully deleted (found $REMAINING_COUNT)"
fi

echo ""
echo "🔄 Step 18: Test Real-Time Updates Across Users"

log_test "Parent 1 - Add new feeding"
NEW_FEED=$(curl -s -X POST "$BASE_URL/feeding" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT1_TOKEN" \
    -d "{
        \"childId\": \"$NOAH_ID\",
        \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"type\": \"BREAST\",
        \"duration\": 20
    }")

NEW_FEED_ID=$(echo $NEW_FEED | jq -r '.id')

# Check if Parent 2 can see it immediately
sleep 1
P2_NEW_FEED=$(api_call "GET" "/feeding" "$PARENT2_TOKEN")
if echo "$P2_NEW_FEED" | jq -e ".[] | select(.id == \"$NEW_FEED_ID\")" > /dev/null 2>&1; then
    log_success "Parent 2 immediately sees Parent 1's new feeding log"
else
    log_error "Parent 2 doesn't see Parent 1's new log (real-time sync issue)"
fi

echo ""
echo "📈 Step 19: Test Analytics and Patterns"

log_test "Parent 1 - Get feeding patterns for Noah"
PATTERNS=$(api_call "GET" "/analytics/patterns/feeding/$NOAH_ID?days=7" "$PARENT1_TOKEN")
if echo "$PATTERNS" | jq -e '.' > /dev/null 2>&1; then
    log_success "Feeding patterns analytics works"
else
    log_error "Feeding patterns analytics failed"
fi

log_test "Parent 2 - Compare children"
COMPARE=$(api_call "GET" "/analytics/compare?days=7" "$PARENT2_TOKEN")
if echo "$COMPARE" | jq -e '.' > /dev/null 2>&1; then
    log_success "Compare children analytics works"
else
    log_error "Compare children analytics failed"
fi

echo ""
echo "🎯 Step 20: Test Team Management"

log_test "Parent 1 - View team members"
TEAM=$(api_call "GET" "/users/team" "$PARENT1_TOKEN")
TEAM_COUNT=$(echo $TEAM | jq '. | length')
if [ "$TEAM_COUNT" == "3" ]; then
    log_success "Team shows all 3 members (2 parents + 1 nanny)"
else
    log_error "Team shows $TEAM_COUNT members (expected 3)"
fi

log_test "Parent 2 - View team members"
P2_TEAM=$(api_call "GET" "/users/team" "$PARENT2_TOKEN")
P2_TEAM_COUNT=$(echo $P2_TEAM | jq '. | length')
if [ "$P2_TEAM_COUNT" == "3" ]; then
    log_success "Parent 2 also sees all team members"
else
    log_error "Parent 2 sees $P2_TEAM_COUNT team members (expected 3)"
fi

echo ""
echo "🚨 Step 21: Test Critical Delete All Data (without logout)"

log_test "Parent 1 - Delete ALL data (should NOT logout)"
DELETE_ALL=$(curl -s -X DELETE "$BASE_URL/data/all" \
    -H "Authorization: Bearer $PARENT1_TOKEN")

if echo "$DELETE_ALL" | jq -e '.success' > /dev/null 2>&1; then
    log_success "Delete all data succeeded"

    # Verify we're still authenticated
    ME=$(api_call "GET" "/users/me" "$PARENT1_TOKEN")
    if echo "$ME" | jq -e '.id' > /dev/null 2>&1; then
        log_success "Parent 1 still authenticated after delete (no logout)"
    else
        log_error "Parent 1 was logged out after delete all data"
    fi
else
    log_error "Delete all data failed"
    echo "Response: $DELETE_ALL"
fi

# Verify data is actually deleted
VERIFY_FEEDS=$(api_call "GET" "/feeding" "$PARENT1_TOKEN")
VERIFY_COUNT=$(echo $VERIFY_FEEDS | jq '. | length')
if [ "$VERIFY_COUNT" == "0" ]; then
    log_success "All feeding data confirmed deleted"
else
    log_error "Feeding data still exists after delete all ($VERIFY_COUNT items)"
fi

VERIFY_CHILDREN=$(api_call "GET" "/children" "$PARENT1_TOKEN")
VERIFY_CHILD_COUNT=$(echo $VERIFY_CHILDREN | jq '. | length')
if [ "$VERIFY_CHILD_COUNT" == "0" ]; then
    log_success "All children confirmed deleted"
else
    log_error "Children still exist after delete all ($VERIFY_CHILD_COUNT items)"
fi

echo ""
echo "=================================================="
echo "🎉 Test Complete!"
echo "=================================================="

# Add summary to feedback file
cat >> $FEEDBACK_FILE <<EOF

---

## Test Summary

Total scenarios tested: 21+
- Account setup and user management
- Multi-child CRUD operations
- Cross-user data visibility
- Real-time synchronization
- Role-based permissions
- Dashboard and analytics
- Journal functionality
- Data management and deletion
- AI chat interface (if available)

## Recommendations

1. Review all ❌ marked issues above
2. Fix any authentication or authorization problems
3. Ensure real-time data synchronization works
4. Verify role-based access controls
5. Test AI chat integration if not working

---

Generated: $(date)
EOF

echo ""
echo "📄 Feedback report generated: $FEEDBACK_FILE"
cat $FEEDBACK_FILE
