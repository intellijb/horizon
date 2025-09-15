#!/bin/bash

# Test script for Interview API endpoints
# This script demonstrates how to use the interview endpoints with the provided access token

ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MjkyNDRmMy1jZjAxLTQyNjktYTVjYS0yM2U1ZGM2ZDYyN2UiLCJlbWFpbCI6ImludGVsbGlqYkBnbWFpbC5jb20iLCJyb2xlIjoidXNlciIsImRldmljZUlkIjoiNWY5YzFkODctZjcwYi00YmI4LTk2MmItODA3ZWE5ZmU1ZDZlIiwic2Vzc2lvbklkIjoiOWRjODk1MmUtODU1NC00ZTEwLTk5MjgtNzI3OGY1ZDlhZmViIiwianRpIjoiYjRjNzkwODYtY2U4NC00NjE4LWFlZTItMWJiZjU5OGJhODAxIiwiaWF0IjoxNzU3OTU2Njc5LCJleHAiOjE3NTc5NTc1Nzl9.MEsW4dMIRN9LGGvprGP55TCEXp-KXbuLnjuMAc1NLtM"
BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing Interview API Endpoints${NC}"
echo "================================"

# Step 1: Create an interview session
echo -e "\n${GREEN}1. Creating interview session...${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/interviews" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "topicIds": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
    "title": "Full Stack Developer Interview",
    "language": "en",
    "difficulty": 3
  }')

echo "Response: $RESPONSE"

# Extract session ID if successful
if echo "$RESPONSE" | grep -q "session"; then
  SESSION_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}Session created with ID: $SESSION_ID${NC}"

  # Step 2: Send an answer to the interview
  echo -e "\n${GREEN}2. Answering interview question...${NC}"
  ANSWER_RESPONSE=$(curl -s -X POST "${BASE_URL}/interviews/${SESSION_ID}/answer" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "message": "JavaScript is a high-level, interpreted programming language that follows the ECMAScript specification. It is widely used for web development, both on the client-side and server-side with Node.js.",
      "temperature": 0.7
    }')

  echo "Response: $ANSWER_RESPONSE"

  # Step 3: Send another answer
  echo -e "\n${GREEN}3. Sending follow-up answer...${NC}"
  FOLLOWUP_RESPONSE=$(curl -s -X POST "${BASE_URL}/interviews/${SESSION_ID}/answer" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "message": "React uses a Virtual DOM to optimize rendering performance. When state changes occur, React creates a new virtual DOM tree, compares it with the previous virtual DOM tree (diffing), and then updates only the changed elements in the real DOM.",
      "temperature": 0.5
    }')

  echo "Response: $FOLLOWUP_RESPONSE"

else
  echo -e "${RED}Failed to create interview session. Please ensure:${NC}"
  echo "1. The server is running (npm run dev)"
  echo "2. The database is properly seeded with interview data"
  echo "3. The access token is valid"
  echo "4. Topic IDs exist in the database"
fi

echo -e "\n${BLUE}Test complete!${NC}"