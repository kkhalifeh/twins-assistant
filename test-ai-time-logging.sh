#!/bin/bash

# Test AI time logging functionality

# Get user token first
echo "=== Getting user token ===" TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

echo "Token: $TOKEN"
echo ""

# Test 1: Log feeding at a specific time (5pm)
echo "=== Test 1: Log feeding at 5pm ==="
curl -s -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"log 40ml for maryam of formula at 5pm"}' | jq '.'
echo ""
echo ""

# Test 2: Log feeding at 17:30
echo "=== Test 2: Log feeding at 17:30 ==="
curl -s -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"log 50ml for emma at 17:30"}' | jq '.'
echo ""
echo ""

# Test 3: Log feeding without time (should use current time)
echo "=== Test 3: Log feeding without time ==="
curl -s -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"log 60ml for maryam"}' | jq '.'
echo ""
echo ""

# Test 4: Log diaper at 3pm
echo "=== Test 4: Log diaper at 3pm ==="
curl -s -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"log wet diaper for emma at 3pm"}' | jq '.'
echo ""
echo ""

# Test 5: Start sleep at 2:30pm
echo "=== Test 5: Start sleep at 2:30pm ==="
curl -s -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"maryam started sleeping at 2:30pm"}' | jq '.'
echo ""
echo ""

echo "=== Checking database for logged times ==="
echo "Recent feeding logs:"
PGPASSWORD=password psql -h localhost -U postgres -d twins_assistant -c "SELECT c.name, f.amount, f.\"startTime\", f.notes FROM \"FeedingLog\" f JOIN \"Child\" c ON f.\"childId\" = c.id ORDER BY f.\"startTime\" DESC LIMIT 5;"
echo ""

echo "Recent diaper logs:"
PGPASSWORD=password psql -h localhost -U postgres -d twins_assistant -c "SELECT c.name, d.type, d.timestamp FROM \"DiaperLog\" d JOIN \"Child\" c ON d.\"childId\" = c.id ORDER BY d.timestamp DESC LIMIT 5;"
echo ""

echo "Recent sleep logs:"
PGPASSWORD=password psql -h localhost -U postgres -d twins_assistant -c "SELECT c.name, s.type, s.\"startTime\", s.\"endTime\" FROM \"SleepLog\" s JOIN \"Child\" c ON s.\"childId\" = c.id ORDER BY s.\"startTime\" DESC LIMIT 5;"
