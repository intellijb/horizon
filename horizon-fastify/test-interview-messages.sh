#!/bin/bash

# Test Interview Session with Recent Messages API

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Interview Session with Recent Messages${NC}"

# API base URL
API_URL="http://localhost:20000"

# Use an existing session ID from your test data
# You'll need to replace this with an actual session ID
SESSION_ID="YOUR_SESSION_ID_HERE"

# Use a valid token from your test environment
TOKEN="YOUR_TOKEN_HERE"

echo -e "\n${GREEN}Testing GET /interviews/:sessionId${NC}"
echo "Fetching session with recent messages..."

# Make the API call
response=$(curl -s -X GET \
  "${API_URL}/interviews/${SESSION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

# Check if response contains session data
if echo "$response" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Session data retrieved successfully${NC}"

  # Check if recentMessages field exists
  if echo "$response" | grep -q '"recentMessages"'; then
    echo -e "${GREEN}✓ Recent messages field found${NC}"

    # Pretty print the response
    echo -e "\n${YELLOW}Response:${NC}"
    echo "$response" | python3 -m json.tool
  else
    echo -e "${YELLOW}⚠ Recent messages field not found (might be empty or no conversation)${NC}"
  fi
else
  echo -e "${RED}✗ Failed to retrieve session data${NC}"
  echo "Response: $response"
fi

echo -e "\n${YELLOW}Note: Make sure to update SESSION_ID and TOKEN with valid values${NC}"