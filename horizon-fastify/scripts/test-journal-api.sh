#!/bin/bash

# Journal API E2E Test Script
# Can test against local server or api.intellijb.com

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
if [ "$1" = "production" ] || [ "$1" = "prod" ]; then
    API_URL="https://api.intellijb.com/api/journal"
    echo -e "${YELLOW}Testing against PRODUCTION: api.intellijb.com${NC}"
else
    API_URL="http://localhost:20000/api/journal"
    echo -e "${YELLOW}Testing against LOCAL: localhost:20000${NC}"
fi

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $2${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to extract JSON field
get_json_field() {
    echo "$1" | python3 -c "import sys, json; print(json.load(sys.stdin).get('$2', ''))"
}

echo ""
echo "================================"
echo "Journal API E2E Tests"
echo "================================"
echo ""

# Test 1: Create a journal card
echo "Testing Journal Cards..."
echo "------------------------"

CARD_RESPONSE=$(curl -s -X POST "${API_URL}/cards" \
    -H "Content-Type: application/json" \
    -d '{
        "category": "health",
        "type": "exercise",
        "name": "Test Run - '"$(date +%s)"'",
        "order": 1
    }')

CARD_ID=$(get_json_field "$CARD_RESPONSE" "id")
if [ ! -z "$CARD_ID" ]; then
    print_result 0 "Create journal card"
else
    print_result 1 "Create journal card: $CARD_RESPONSE"
fi

# Test 2: Get all cards
CARDS_RESPONSE=$(curl -s -X GET "${API_URL}/cards")
if [[ "$CARDS_RESPONSE" == "["* ]]; then
    print_result 0 "Get all journal cards"
else
    print_result 1 "Get all journal cards"
fi

# Test 3: Get specific card
if [ ! -z "$CARD_ID" ]; then
    CARD_GET_RESPONSE=$(curl -s -X GET "${API_URL}/cards/${CARD_ID}")
    RETRIEVED_ID=$(get_json_field "$CARD_GET_RESPONSE" "id")
    if [ "$RETRIEVED_ID" = "$CARD_ID" ]; then
        print_result 0 "Get specific journal card"
    else
        print_result 1 "Get specific journal card"
    fi
fi

# Test 4: Update card
if [ ! -z "$CARD_ID" ]; then
    UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/cards/${CARD_ID}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Updated Test Run",
            "order": 2
        }')
    UPDATED_NAME=$(get_json_field "$UPDATE_RESPONSE" "name")
    if [ "$UPDATED_NAME" = "Updated Test Run" ]; then
        print_result 0 "Update journal card"
    else
        print_result 1 "Update journal card"
    fi
fi

echo ""
echo "Testing Journal Inputs..."
echo "------------------------"

# Test 5: Create journal input
if [ ! -z "$CARD_ID" ]; then
    INPUT_RESPONSE=$(curl -s -X POST "${API_URL}/inputs" \
        -H "Content-Type: application/json" \
        -d '{
            "cardId": "'"$CARD_ID"'",
            "value": "Ran 5km in 25 minutes",
            "order": 1
        }')
    INPUT_ID=$(get_json_field "$INPUT_RESPONSE" "id")
    if [ ! -z "$INPUT_ID" ]; then
        print_result 0 "Create journal input"
    else
        print_result 1 "Create journal input: $INPUT_RESPONSE"
    fi
fi

# Test 6: Get inputs by card
if [ ! -z "$CARD_ID" ]; then
    INPUTS_BY_CARD=$(curl -s -X GET "${API_URL}/inputs?cardId=${CARD_ID}")
    if [[ "$INPUTS_BY_CARD" == "["* ]]; then
        print_result 0 "Get inputs by card ID"
    else
        print_result 1 "Get inputs by card ID"
    fi
fi

# Test 7: Get today's inputs
TODAY_INPUTS=$(curl -s -X GET "${API_URL}/inputs/today")
if [[ "$TODAY_INPUTS" == "["* ]]; then
    print_result 0 "Get today's inputs"
else
    print_result 1 "Get today's inputs"
fi

# Test 8: Get inputs by date
TODAY=$(date +%Y-%m-%d)
DATE_INPUTS=$(curl -s -X GET "${API_URL}/inputs/by-date?date=${TODAY}")
if [[ "$DATE_INPUTS" == "["* ]]; then
    print_result 0 "Get inputs by date"
else
    print_result 1 "Get inputs by date"
fi

# Test 9: Get specific input
if [ ! -z "$INPUT_ID" ]; then
    INPUT_GET_RESPONSE=$(curl -s -X GET "${API_URL}/inputs/${INPUT_ID}")
    RETRIEVED_INPUT_ID=$(get_json_field "$INPUT_GET_RESPONSE" "id")
    if [ "$RETRIEVED_INPUT_ID" = "$INPUT_ID" ]; then
        print_result 0 "Get specific input"
    else
        print_result 1 "Get specific input"
    fi
fi

# Test 10: Update input
if [ ! -z "$INPUT_ID" ]; then
    INPUT_UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/inputs/${INPUT_ID}" \
        -H "Content-Type: application/json" \
        -d '{
            "value": "Ran 6km in 30 minutes"
        }')
    UPDATED_VALUE=$(get_json_field "$INPUT_UPDATE_RESPONSE" "value")
    if [ "$UPDATED_VALUE" = "Ran 6km in 30 minutes" ]; then
        print_result 0 "Update input"
    else
        print_result 1 "Update input"
    fi
fi

# Test 11: Archive input
if [ ! -z "$INPUT_ID" ]; then
    ARCHIVE_RESPONSE=$(curl -s -X POST "${API_URL}/inputs/${INPUT_ID}/archive")
    ARCHIVED_STATUS=$(get_json_field "$ARCHIVE_RESPONSE" "status")
    if [ "$ARCHIVED_STATUS" = "archived" ]; then
        print_result 0 "Archive input"
    else
        print_result 1 "Archive input"
    fi
fi

# Test 12: Activate input
if [ ! -z "$INPUT_ID" ]; then
    ACTIVATE_RESPONSE=$(curl -s -X POST "${API_URL}/inputs/${INPUT_ID}/activate")
    ACTIVE_STATUS=$(get_json_field "$ACTIVATE_RESPONSE" "status")
    if [ "$ACTIVE_STATUS" = "active" ]; then
        print_result 0 "Activate input"
    else
        print_result 1 "Activate input"
    fi
fi

echo ""
echo "Testing Batch Operations..."
echo "---------------------------"

# Test 13: Get today's data
TODAY_DATA=$(curl -s -X GET "${API_URL}/data/today")
HAS_CARDS=$(echo "$TODAY_DATA" | python3 -c "import sys, json; d=json.load(sys.stdin); print('cards' in d)")
HAS_INPUTS=$(echo "$TODAY_DATA" | python3 -c "import sys, json; d=json.load(sys.stdin); print('inputs' in d)")
if [ "$HAS_CARDS" = "True" ] && [ "$HAS_INPUTS" = "True" ]; then
    print_result 0 "Get today's journal data"
else
    print_result 1 "Get today's journal data"
fi

# Test 14: Get data by date
DATE_DATA=$(curl -s -X GET "${API_URL}/data/by-date?date=${TODAY}")
HAS_CARDS=$(echo "$DATE_DATA" | python3 -c "import sys, json; d=json.load(sys.stdin); print('cards' in d)")
HAS_INPUTS=$(echo "$DATE_DATA" | python3 -c "import sys, json; d=json.load(sys.stdin); print('inputs' in d)")
if [ "$HAS_CARDS" = "True" ] && [ "$HAS_INPUTS" = "True" ]; then
    print_result 0 "Get journal data by date"
else
    print_result 1 "Get journal data by date"
fi

echo ""
echo "Testing Delete Operations..."
echo "----------------------------"

# Test 15: Delete input
if [ ! -z "$INPUT_ID" ]; then
    DELETE_INPUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${API_URL}/inputs/${INPUT_ID}")
    if [ "$DELETE_INPUT_STATUS" = "204" ]; then
        print_result 0 "Delete input"
    else
        print_result 1 "Delete input (Status: $DELETE_INPUT_STATUS)"
    fi
fi

# Test 16: Delete card (with cascade)
if [ ! -z "$CARD_ID" ]; then
    DELETE_CARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${API_URL}/cards/${CARD_ID}")
    if [ "$DELETE_CARD_STATUS" = "204" ]; then
        print_result 0 "Delete card (cascade)"
    else
        print_result 1 "Delete card (Status: $DELETE_CARD_STATUS)"
    fi
fi

echo ""
echo "Testing Error Cases..."
echo "----------------------"

# Test 17: 404 for non-existent card
NOT_FOUND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_URL}/cards/non_existent_id")
if [ "$NOT_FOUND_RESPONSE" = "404" ]; then
    print_result 0 "404 for non-existent card"
else
    print_result 1 "404 for non-existent card (Status: $NOT_FOUND_RESPONSE)"
fi

# Test 18: 404 for non-existent input
NOT_FOUND_INPUT=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_URL}/inputs/non_existent_id")
if [ "$NOT_FOUND_INPUT" = "404" ]; then
    print_result 0 "404 for non-existent input"
else
    print_result 1 "404 for non-existent input (Status: $NOT_FOUND_INPUT)"
fi

# Test 19: Invalid date format
INVALID_DATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_URL}/inputs/by-date?date=invalid-date")
if [ "$INVALID_DATE_STATUS" = "400" ]; then
    print_result 0 "Validates date format"
else
    print_result 1 "Validates date format (Status: $INVALID_DATE_STATUS)"
fi

# Test 20: Invalid input for non-existent card
INVALID_CARD_RESPONSE=$(curl -s -X POST "${API_URL}/inputs" \
    -H "Content-Type: application/json" \
    -d '{
        "cardId": "non_existent_card",
        "value": "Test"
    }')
ERROR_MESSAGE=$(get_json_field "$INVALID_CARD_RESPONSE" "error")
if [ ! -z "$ERROR_MESSAGE" ]; then
    print_result 0 "Error for non-existent card reference"
else
    print_result 1 "Error for non-existent card reference"
fi

echo ""
echo "================================"
echo "Test Results Summary"
echo "================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✨${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
fi