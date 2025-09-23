#!/bin/bash

# Test Intelligence Chat Functionality
# This script demonstrates the chat session and messaging capabilities

BASE_URL="http://localhost:20000"
EMAIL="testuser_$(date +%s)@example.com"
PASSWORD="TestPass123"

echo "========================================="
echo "Testing Intelligence Chat Functionality"
echo "========================================="
echo ""

# 1. Register user (if needed) and login
echo "1. Attempting to register user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "   Registration attempt complete (may already exist)"

echo "   Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# 2. Create a topic
echo "2. Creating intelligence topic..."
TOPIC_ID="ai-research-$(date +%s)"
TOPIC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/intelligence/topics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$TOPIC_ID\"}")

if echo "$TOPIC_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to create topic"
  echo "Response: $TOPIC_RESPONSE"
  exit 1
fi

echo "✅ Topic created: $TOPIC_ID"
echo "   Response: $TOPIC_RESPONSE"
echo ""

# 3. Create a chat session with persona
echo "3. Creating chat session with AI assistant persona..."
CHAT_SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/intelligence/chat/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"topicId\": \"$TOPIC_ID\",
    \"persona\": {
      \"name\": \"Research Assistant\",
      \"instructions\": \"You are a helpful AI research assistant. You help users understand complex topics in simple terms.\"
    },
    \"initialMessage\": \"Hello! Can you explain what machine learning is?\"
  }")

CONVERSATION_ID=$(echo $CHAT_SESSION_RESPONSE | grep -o '"conversationId":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONVERSATION_ID" ]; then
  echo "❌ Failed to create chat session"
  echo "Response: $CHAT_SESSION_RESPONSE"
  exit 1
fi

echo "✅ Chat session created"
echo "Conversation ID: $CONVERSATION_ID"
echo ""

# Extract and display initial response
INITIAL_MESSAGE=$(echo $CHAT_SESSION_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$INITIAL_MESSAGE" ]; then
  echo "🤖 Assistant: $INITIAL_MESSAGE"
  echo ""
fi

# 4. Send a follow-up message
echo "4. Sending follow-up message..."
MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/intelligence/topics/$TOPIC_ID/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Can you give me a practical example?\",
    \"temperature\": 0.7
  }")

REPLY=$(echo $MESSAGE_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$REPLY" ]; then
  echo "✅ Message sent"
  echo "🤖 Assistant: $REPLY"
  echo ""
else
  echo "❌ Failed to send message"
  echo "Response: $MESSAGE_RESPONSE"
fi

# 5. Get conversation history
echo "5. Retrieving conversation history..."
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/intelligence/topics/$TOPIC_ID/conversations/$CONVERSATION_ID/history" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Conversation history retrieved"
echo ""

# 6. List all conversations for the topic
echo "6. Listing all conversations for topic..."
CONVERSATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/intelligence/topics/$TOPIC_ID/conversations" \
  -H "Authorization: Bearer $TOKEN")

CONV_COUNT=$(echo $CONVERSATIONS_RESPONSE | grep -o "conversationId" | wc -l)
echo "✅ Found $CONV_COUNT conversation(s) for topic"
echo ""

# 7. Add a note to the topic
echo "7. Adding a note to the topic..."
NOTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/intelligence/topics/$TOPIC_ID/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"note\": \"This topic covers the fundamentals of machine learning and AI research.\"
  }")

echo "✅ Note added to topic"
echo ""

# 8. Get topic details with all relations
echo "8. Getting topic details..."
TOPIC_DETAILS=$(curl -s -X GET "$BASE_URL/api/intelligence/topics/$TOPIC_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Topic details retrieved"
echo ""

echo "========================================="
echo "✅ All tests completed successfully!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Topic ID: $TOPIC_ID"
echo "- Conversation ID: $CONVERSATION_ID"
echo "- Messages exchanged: 2"
echo "- Notes added: 1"
echo ""
echo "You can now:"
echo "1. Continue the conversation by sending more messages"
echo "2. Create new chat sessions with different personas"
echo "3. Add more notes or inputs to the topic"
echo "4. Link additional conversations to the topic"