#!/bin/bash

# Valid token and real topic ID from your database
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MjkyNDRmMy1jZjAxLTQyNjktYTVjYS0yM2U1ZGM2ZDYyN2UiLCJlbWFpbCI6ImludGVsbGlqYkBnbWFpbC5jb20iLCJyb2xlIjoidXNlciIsImRldmljZUlkIjoiNWY5YzFkODctZjcwYi00YmI4LTk2MmItODA3ZWE5ZmU1ZDZlIiwic2Vzc2lvbklkIjoiNmQ3MWJiZTEtMTVkZi00MThkLWJjYTAtZjE1ZGI2NTA5YzNjIiwianRpIjoiZGY1YjA0ZTMtM2Q1MS00ZDU1LTlmYjItNTQzOTQyMDc4MjM4IiwiaWF0IjoxNzU3OTU3ODA1LCJleHAiOjE3NTc5NTg3MDV9._lK5nZSATmRgbnTRS66R6kkkzd4sXtUIhs6vZECcYgA"

# Real topic ID from your database
TOPIC_ID="213c0c1d-8729-4fe7-875a-ac24f9b3e4bd"  # Video Streaming Platform

echo "Creating interview session..."
RESPONSE=$(curl -s -X POST "http://localhost:20000/api/interviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"topicIds\":[\"$TOPIC_ID\"],\"title\":\"System Design Interview\",\"language\":\"en\",\"difficulty\":5}")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Extract session ID if successful
if echo "$RESPONSE" | grep -q "session"; then
  SESSION_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['id'])" 2>/dev/null)

  if [ ! -z "$SESSION_ID" ]; then
    echo -e "\n✅ Interview created! Session ID: $SESSION_ID"

    echo -e "\nSending answer..."
    ANSWER_RESPONSE=$(curl -s -X POST "http://localhost:20000/api/interviews/$SESSION_ID/answer" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"message":"I would use CDN for global content delivery and implement adaptive bitrate streaming."}')

    echo "Answer Response:"
    echo "$ANSWER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ANSWER_RESPONSE"
  fi
fi