#!/bin/bash

BASE_URL="http://localhost:3001"

echo "========================================"
echo "🧪 Testing Pumping Integration"
echo "========================================"
echo

# Login
echo "Step 1: Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "khaledkhalifeh@gmail.com", "password": "testpassword123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in successfully"
echo

# Test Dashboard
echo "Step 2: Test Dashboard API..."
DASHBOARD=$(curl -s "$BASE_URL/api/dashboard/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "Dashboard response:"
echo $DASHBOARD | jq '.'
echo

PUMPING_SESSIONS=$(echo $DASHBOARD | jq '.stats.totalPumpingSessions')
PUMPED_VOLUME=$(echo $DASHBOARD | jq '.stats.totalPumpedVolume')

if [ "$PUMPING_SESSIONS" != "null" ]; then
  echo "✅ Dashboard has pumping stats"
  echo "  - Sessions: $PUMPING_SESSIONS"
  echo "  - Volume: ${PUMPED_VOLUME}ml"
else
  echo "❌ Dashboard missing pumping stats"
fi
echo

# Test Journal
echo "Step 3: Test Journal API..."
JOURNAL=$(curl -s "$BASE_URL/api/journal/daily?date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $TOKEN")

echo "Journal stats:"
echo $JOURNAL | jq '.stats'
echo

JOURNAL_PUMPING=$(echo $JOURNAL | jq '.stats.totalPumpingSessions')
JOURNAL_VOLUME=$(echo $JOURNAL | jq '.stats.totalPumpedVolume')

if [ "$JOURNAL_PUMPING" != "null" ]; then
  echo "✅ Journal has pumping stats"
  echo "  - Sessions: $JOURNAL_PUMPING"
  echo "  - Volume: ${JOURNAL_VOLUME}ml"
else
  echo "❌ Journal missing pumping stats"
fi
echo

# Test Analytics
echo "Step 4: Test Analytics/Insights API..."
INSIGHTS=$(curl -s "$BASE_URL/api/analytics/insights?days=7" \
  -H "Authorization: Bearer $TOKEN")

echo "Insights response:"
echo $INSIGHTS | jq '.'
echo

# Check for pumping insights
PUMPING_INSIGHTS=$(echo $INSIGHTS | jq '.pumpingInsights')

if [ "$PUMPING_INSIGHTS" != "null" ]; then
  echo "✅ Analytics has pumping insights"
  echo $PUMPING_INSIGHTS | jq '.'
else
  echo "⚠️  No pumping insights (may be expected if no data)"
fi

echo
echo "========================================"
echo "✅ Integration Test Complete"
echo "========================================"
