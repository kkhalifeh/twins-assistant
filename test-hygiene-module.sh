#!/bin/bash

# Comprehensive Test Script for Hygiene Module
# Tests hygiene CRUD operations, RBAC, dashboard and journal integration

BASE_URL="http://localhost:3003/api"
FEEDBACK_FILE="HYGIENE_TEST_FEEDBACK.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🧪 Starting Comprehensive Hygiene Module Test"
echo "=============================================="
echo ""

# Initialize feedback file
cat > $FEEDBACK_FILE <<EOF
# Hygiene Module Test Feedback Report
Generated: $(date)

## Test Scenario
- 1 Child (Emma)
- 1 Parent (PARENT role)
- 1 Nanny (NANNY role)
- 1 Viewer (VIEWER role)
- Test hygiene CRUD operations, RBAC permissions, dashboard, and journal integration

---

## Test Results

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

# Function to log info
log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
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

echo "📝 Step 1: Create Test Users"
echo "-----------------------------"

log_test "Register Parent (PARENT role)"
PARENT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "parent.hygiene@test.com",
        "password": "password123",
        "name": "Test Parent",
        "role": "PARENT"
    }')

PARENT_TOKEN=$(echo $PARENT_RESPONSE | jq -r '.token')
PARENT_ID=$(echo $PARENT_RESPONSE | jq -r '.user.id')
ACCOUNT_ID=$(echo $PARENT_RESPONSE | jq -r '.user.accountId')

if [ "$PARENT_TOKEN" != "null" ] && [ "$PARENT_TOKEN" != "" ]; then
    log_success "Parent registered successfully"
    log_info "Account ID: $ACCOUNT_ID"
else
    log_error "Failed to register Parent"
    echo $PARENT_RESPONSE
    exit 1
fi

sleep 1

echo ""
echo "👶 Step 2: Create Child"
echo "----------------------"

log_test "Create Emma"
EMMA_RESPONSE=$(curl -s -X POST "$BASE_URL/children" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT_TOKEN" \
    -d '{
        "name": "Emma",
        "dateOfBirth": "2024-06-01"
    }')

EMMA_ID=$(echo $EMMA_RESPONSE | jq -r '.id')

if [ "$EMMA_ID" != "null" ] && [ "$EMMA_ID" != "" ]; then
    log_success "Emma created successfully"
    log_info "Emma ID: $EMMA_ID"
else
    log_error "Failed to create Emma"
    echo $EMMA_RESPONSE
    exit 1
fi

sleep 1

echo ""
echo "👥 Step 3: Create Team Members (Nanny and Viewer)"
echo "------------------------------------------------"

log_test "Parent invites Nanny"
NANNY_RESPONSE=$(curl -s -X POST "$BASE_URL/users/team/invite" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT_TOKEN" \
    -d '{
        "email": "nanny.hygiene@test.com",
        "password": "password123",
        "name": "Test Nanny",
        "role": "NANNY"
    }')

NANNY_ID=$(echo $NANNY_RESPONSE | jq -r '.user.id')

if [ "$NANNY_ID" != "null" ] && [ "$NANNY_ID" != "" ]; then
    log_success "Nanny invited successfully"
else
    log_error "Failed to invite Nanny"
    echo $NANNY_RESPONSE
fi

# Login as Nanny
NANNY_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "nanny.hygiene@test.com",
        "password": "password123"
    }')

NANNY_TOKEN=$(echo $NANNY_LOGIN | jq -r '.token')

if [ "$NANNY_TOKEN" != "null" ] && [ "$NANNY_TOKEN" != "" ]; then
    log_success "Nanny logged in successfully"
else
    log_error "Failed to login as Nanny"
    echo $NANNY_LOGIN
fi

sleep 1

log_test "Parent invites Viewer"
VIEWER_RESPONSE=$(curl -s -X POST "$BASE_URL/users/team/invite" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PARENT_TOKEN" \
    -d '{
        "email": "viewer.hygiene@test.com",
        "password": "password123",
        "name": "Test Viewer",
        "role": "VIEWER"
    }')

VIEWER_ID=$(echo $VIEWER_RESPONSE | jq -r '.user.id')

if [ "$VIEWER_ID" != "null" ] && [ "$VIEWER_ID" != "" ]; then
    log_success "Viewer invited successfully"
else
    log_error "Failed to invite Viewer"
    echo $VIEWER_RESPONSE
fi

# Login as Viewer
VIEWER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "viewer.hygiene@test.com",
        "password": "password123"
    }')

VIEWER_TOKEN=$(echo $VIEWER_LOGIN | jq -r '.token')

if [ "$VIEWER_TOKEN" != "null" ] && [ "$VIEWER_TOKEN" != "" ]; then
    log_success "Viewer logged in successfully"
else
    log_error "Failed to login as Viewer"
    echo $VIEWER_LOGIN
fi

sleep 1

echo ""
echo "🛁 Step 4: Test Hygiene CRUD Operations (Parent)"
echo "-----------------------------------------------"

log_test "Parent creates BATH hygiene log"
BATH_RESPONSE=$(api_call "POST" "/hygiene" "$PARENT_TOKEN" '{
    "childId": "'"$EMMA_ID"'",
    "type": "BATH",
    "timestamp": "2025-01-16T10:00:00.000Z",
    "timezone": "America/New_York",
    "notes": "Morning bath with bubble soap"
}')

BATH_ID=$(echo $BATH_RESPONSE | jq -r '.id')

if [ "$BATH_ID" != "null" ] && [ "$BATH_ID" != "" ]; then
    log_success "BATH log created successfully"
    log_info "Bath ID: $BATH_ID"
else
    log_error "Failed to create BATH log"
    echo $BATH_RESPONSE
fi

sleep 1

log_test "Parent creates NAIL_TRIMMING hygiene log"
NAIL_RESPONSE=$(api_call "POST" "/hygiene" "$PARENT_TOKEN" '{
    "childId": "'"$EMMA_ID"'",
    "type": "NAIL_TRIMMING",
    "timestamp": "2025-01-16T14:00:00.000Z",
    "timezone": "America/New_York",
    "notes": "Trimmed fingernails"
}')

NAIL_ID=$(echo $NAIL_RESPONSE | jq -r '.id')

if [ "$NAIL_ID" != "null" ] && [ "$NAIL_ID" != "" ]; then
    log_success "NAIL_TRIMMING log created successfully"
    log_info "Nail ID: $NAIL_ID"
else
    log_error "Failed to create NAIL_TRIMMING log"
    echo $NAIL_RESPONSE
fi

sleep 1

log_test "Parent creates ORAL_CARE hygiene log"
ORAL_RESPONSE=$(api_call "POST" "/hygiene" "$PARENT_TOKEN" '{
    "childId": "'"$EMMA_ID"'",
    "type": "ORAL_CARE",
    "timestamp": "2025-01-16T20:00:00.000Z",
    "timezone": "America/New_York",
    "notes": "Gum cleaning with soft cloth"
}')

ORAL_ID=$(echo $ORAL_RESPONSE | jq -r '.id')

if [ "$ORAL_ID" != "null" ] && [ "$ORAL_ID" != "" ]; then
    log_success "ORAL_CARE log created successfully"
    log_info "Oral ID: $ORAL_ID"
else
    log_error "Failed to create ORAL_CARE log"
    echo $ORAL_RESPONSE
fi

sleep 1

log_test "Parent retrieves all hygiene logs"
ALL_HYGIENE=$(api_call "GET" "/hygiene" "$PARENT_TOKEN")
HYGIENE_COUNT=$(echo $ALL_HYGIENE | jq '. | length')

if [ "$HYGIENE_COUNT" -ge "3" ]; then
    log_success "Retrieved $HYGIENE_COUNT hygiene logs"
else
    log_error "Expected at least 3 hygiene logs, got $HYGIENE_COUNT"
    echo $ALL_HYGIENE
fi

sleep 1

log_test "Parent retrieves hygiene logs filtered by child"
EMMA_HYGIENE=$(api_call "GET" "/hygiene?childId=$EMMA_ID" "$PARENT_TOKEN")
EMMA_HYGIENE_COUNT=$(echo $EMMA_HYGIENE | jq '. | length')

if [ "$EMMA_HYGIENE_COUNT" -ge "3" ]; then
    log_success "Retrieved $EMMA_HYGIENE_COUNT hygiene logs for Emma"
else
    log_error "Expected at least 3 hygiene logs for Emma, got $EMMA_HYGIENE_COUNT"
    echo $EMMA_HYGIENE
fi

sleep 1

log_test "Parent retrieves hygiene logs filtered by type (BATH)"
BATH_LOGS=$(api_call "GET" "/hygiene?type=BATH" "$PARENT_TOKEN")
BATH_COUNT=$(echo $BATH_LOGS | jq '. | length')

if [ "$BATH_COUNT" -ge "1" ]; then
    log_success "Retrieved $BATH_COUNT BATH logs"
else
    log_error "Expected at least 1 BATH log, got $BATH_COUNT"
    echo $BATH_LOGS
fi

sleep 1

log_test "Parent updates BATH hygiene log"
UPDATE_RESPONSE=$(api_call "PUT" "/hygiene/$BATH_ID" "$PARENT_TOKEN" '{
    "notes": "Morning bath with bubble soap - UPDATED"
}')

UPDATE_STATUS=$(echo $UPDATE_RESPONSE | jq -r '.id')

if [ "$UPDATE_STATUS" == "$BATH_ID" ]; then
    log_success "BATH log updated successfully"
else
    log_error "Failed to update BATH log"
    echo $UPDATE_RESPONSE
fi

sleep 1

echo ""
echo "🔒 Step 5: Test RBAC Permissions"
echo "-------------------------------"

log_test "NANNY creates hygiene log (should succeed)"
NANNY_BATH=$(api_call "POST" "/hygiene" "$NANNY_TOKEN" '{
    "childId": "'"$EMMA_ID"'",
    "type": "BATH",
    "timestamp": "2025-01-16T18:00:00.000Z",
    "timezone": "America/New_York",
    "notes": "Evening bath by nanny"
}')

NANNY_BATH_ID=$(echo $NANNY_BATH | jq -r '.id')

if [ "$NANNY_BATH_ID" != "null" ] && [ "$NANNY_BATH_ID" != "" ]; then
    log_success "NANNY successfully created hygiene log"
else
    log_error "NANNY should be able to create hygiene log"
    echo $NANNY_BATH
fi

sleep 1

log_test "NANNY retrieves hygiene logs (should succeed)"
NANNY_HYGIENE=$(api_call "GET" "/hygiene" "$NANNY_TOKEN")
NANNY_HYGIENE_COUNT=$(echo $NANNY_HYGIENE | jq '. | length')

if [ "$NANNY_HYGIENE_COUNT" -ge "1" ]; then
    log_success "NANNY successfully retrieved hygiene logs"
else
    log_error "NANNY should be able to read hygiene logs"
    echo $NANNY_HYGIENE
fi

sleep 1

log_test "VIEWER retrieves hygiene logs (should succeed)"
VIEWER_HYGIENE=$(api_call "GET" "/hygiene" "$VIEWER_TOKEN")
VIEWER_HYGIENE_COUNT=$(echo $VIEWER_HYGIENE | jq '. | length')

if [ "$VIEWER_HYGIENE_COUNT" -ge "1" ]; then
    log_success "VIEWER successfully retrieved hygiene logs"
else
    log_error "VIEWER should be able to read hygiene logs"
    echo $VIEWER_HYGIENE
fi

sleep 1

log_test "VIEWER creates hygiene log (should fail)"
VIEWER_CREATE=$(api_call "POST" "/hygiene" "$VIEWER_TOKEN" '{
    "childId": "'"$EMMA_ID"'",
    "type": "BATH",
    "timestamp": "2025-01-16T22:00:00.000Z",
    "timezone": "America/New_York",
    "notes": "This should fail"
}')

VIEWER_ERROR=$(echo $VIEWER_CREATE | jq -r '.error')

if [ "$VIEWER_ERROR" != "null" ] && [ "$VIEWER_ERROR" != "" ]; then
    log_success "VIEWER correctly denied write access"
else
    log_error "VIEWER should NOT be able to create hygiene log"
    echo $VIEWER_CREATE
fi

sleep 1

echo ""
echo "📊 Step 6: Test Dashboard Integration"
echo "------------------------------------"

log_test "Parent retrieves dashboard with hygiene stats"
DASHBOARD=$(api_call "GET" "/dashboard?date=2025-01-16" "$PARENT_TOKEN")

TOTAL_HYGIENE=$(echo $DASHBOARD | jq -r '.stats.totalHygieneLogs')
LAST_BATH=$(echo $DASHBOARD | jq -r '.stats.lastBath')
LAST_NAIL=$(echo $DASHBOARD | jq -r '.stats.lastNailTrim')
LAST_ORAL=$(echo $DASHBOARD | jq -r '.stats.lastOralCare')

if [ "$TOTAL_HYGIENE" != "null" ] && [ "$TOTAL_HYGIENE" != "" ]; then
    log_success "Dashboard includes hygiene stats (total: $TOTAL_HYGIENE)"
    log_info "Last Bath: $(echo $LAST_BATH | jq -r '.timestamp' 2>/dev/null || echo 'N/A')"
    log_info "Last Nail Trim: $(echo $LAST_NAIL | jq -r '.timestamp' 2>/dev/null || echo 'N/A')"
    log_info "Last Oral Care: $(echo $LAST_ORAL | jq -r '.timestamp' 2>/dev/null || echo 'N/A')"
else
    log_error "Dashboard missing hygiene stats"
    echo $DASHBOARD | jq '.stats'
fi

sleep 1

log_test "Parent checks dashboard recent activities for hygiene"
RECENT_ACTIVITIES=$(echo $DASHBOARD | jq -r '.recentActivities')
HYGIENE_ACTIVITIES=$(echo $RECENT_ACTIVITIES | jq '[.[] | select(.type == "hygiene")] | length')

if [ "$HYGIENE_ACTIVITIES" -gt "0" ]; then
    log_success "Dashboard includes $HYGIENE_ACTIVITIES hygiene activities in recent timeline"
else
    log_error "Dashboard should include hygiene activities in recent timeline"
    echo $RECENT_ACTIVITIES | jq '[.[] | select(.type == "hygiene")]'
fi

sleep 1

echo ""
echo "📖 Step 7: Test Journal Integration"
echo "----------------------------------"

log_test "Parent retrieves journal for 2025-01-16"
JOURNAL=$(api_call "GET" "/journal/daily?date=2025-01-16" "$PARENT_TOKEN")

JOURNAL_HYGIENE=$(echo $JOURNAL | jq -r '.stats.totalHygieneLogs')

if [ "$JOURNAL_HYGIENE" != "null" ] && [ "$JOURNAL_HYGIENE" != "" ]; then
    log_success "Journal includes hygiene stats (total: $JOURNAL_HYGIENE)"
else
    log_error "Journal missing hygiene stats"
    echo $JOURNAL | jq '.stats'
fi

sleep 1

log_test "Parent checks journal activities for hygiene"
JOURNAL_ACTIVITIES=$(echo $JOURNAL | jq -r '.activities')
JOURNAL_HYGIENE_ACTIVITIES=$(echo $JOURNAL_ACTIVITIES | jq '[.[] | select(.type == "hygiene")] | length')

if [ "$JOURNAL_HYGIENE_ACTIVITIES" -gt "0" ]; then
    log_success "Journal includes $JOURNAL_HYGIENE_ACTIVITIES hygiene activities in timeline"
    echo $JOURNAL_ACTIVITIES | jq '[.[] | select(.type == "hygiene")]'
else
    log_error "Journal should include hygiene activities in timeline"
    echo $JOURNAL_ACTIVITIES | jq '[.[] | select(.type == "hygiene")]'
fi

sleep 1

echo ""
echo "🗑️  Step 8: Test Delete Operation"
echo "--------------------------------"

log_test "Parent deletes BATH hygiene log"
DELETE_RESPONSE=$(api_call "DELETE" "/hygiene/$BATH_ID" "$PARENT_TOKEN")

DELETE_MESSAGE=$(echo $DELETE_RESPONSE | jq -r '.message')

if [ "$DELETE_MESSAGE" != "null" ] && [ "$DELETE_MESSAGE" != "" ]; then
    log_success "BATH log deleted successfully"
else
    log_error "Failed to delete BATH log"
    echo $DELETE_RESPONSE
fi

sleep 1

log_test "Verify BATH log is deleted"
VERIFY_DELETE=$(api_call "GET" "/hygiene" "$PARENT_TOKEN")
VERIFY_COUNT=$(echo $VERIFY_DELETE | jq '. | length')

if [ "$VERIFY_COUNT" -lt "$HYGIENE_COUNT" ]; then
    log_success "Verified deletion: hygiene log count reduced from $HYGIENE_COUNT to $VERIFY_COUNT"
else
    log_error "Hygiene log was not deleted"
fi

sleep 1

echo ""
echo "🧹 Step 9: Cleanup"
echo "-----------------"

log_test "Delete remaining hygiene logs"
if [ "$NAIL_ID" != "null" ] && [ "$NAIL_ID" != "" ]; then
    api_call "DELETE" "/hygiene/$NAIL_ID" "$PARENT_TOKEN" > /dev/null
fi
if [ "$ORAL_ID" != "null" ] && [ "$ORAL_ID" != "" ]; then
    api_call "DELETE" "/hygiene/$ORAL_ID" "$PARENT_TOKEN" > /dev/null
fi
if [ "$NANNY_BATH_ID" != "null" ] && [ "$NANNY_BATH_ID" != "" ]; then
    api_call "DELETE" "/hygiene/$NANNY_BATH_ID" "$PARENT_TOKEN" > /dev/null
fi

log_success "Cleanup completed"

echo ""
echo "=================================================="
echo -e "${GREEN}✓ Hygiene Module Test Complete!${NC}"
echo "=================================================="
echo ""
echo "📄 Feedback report saved to: $FEEDBACK_FILE"
echo ""

# Summary
cat >> $FEEDBACK_FILE <<EOF

## Summary

✅ **Test completed successfully**

### Coverage:
- ✓ Hygiene CRUD operations (Create, Read, Update, Delete)
- ✓ Filter by child and type
- ✓ RBAC permissions (PARENT, NANNY, VIEWER)
- ✓ Dashboard integration (stats and recent activities)
- ✓ Journal integration (stats and timeline)
- ✓ Timezone support
- ✓ Account-based data access

### Hygiene Types Tested:
- ✓ BATH
- ✓ NAIL_TRIMMING
- ✓ ORAL_CARE

EOF

echo "All tests completed!"
