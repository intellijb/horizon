#!/bin/bash

API_URL="http://localhost:20000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Testing Maps API with Naver Keys${NC}"
echo -e "${YELLOW}================================${NC}"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local data=$3

    echo -e "\n${GREEN}Testing: $name${NC}"
    echo "Endpoint: $endpoint"
    echo "Request: $data"
    echo "---"

    response=$(curl -s -X POST "$API_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")

    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        echo "$response" | python3 -m json.tool
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed: $response${NC}"
    fi
}

# 1. Test Geocoding (Address to Coordinates)
test_endpoint \
    "Geocoding - Korean Address" \
    "/maps/geocode" \
    '{"query": "서울특별시 강남구 테헤란로 212"}'

# 2. Test Geocoding with English
test_endpoint \
    "Geocoding - English Query" \
    "/maps/geocode" \
    '{"query": "Gangnam Station", "language": "eng"}'

# 3. Test Search Nearby
test_endpoint \
    "Search Nearby - Starbucks near Seoul City Hall" \
    "/maps/search-nearby" \
    '{"query": "스타벅스", "center": {"lat": 37.5665, "lng": 126.9780}, "radius": 1000}'

# 4. Test Reverse Geocoding (Seoul City Hall coordinates)
test_endpoint \
    "Reverse Geocoding - Seoul City Hall" \
    "/maps/reverse-geocode" \
    '{"lat": 37.5665, "lng": 126.9780}'

# 5. Test Reverse Geocoding (Gangnam Station)
test_endpoint \
    "Reverse Geocoding - Gangnam Station" \
    "/maps/reverse-geocode" \
    '{"lat": 37.4979, "lng": 127.0276}'

# 6. Test Find Nearest Address
test_endpoint \
    "Find Nearest Address" \
    "/maps/nearest-address" \
    '{"lat": 37.5145, "lng": 127.0595}'

# 7. Test Batch Reverse Geocoding
test_endpoint \
    "Batch Reverse Geocoding - Multiple Locations" \
    "/maps/batch-reverse-geocode" \
    '{
        "coordinates": [
            {"lat": 37.5665, "lng": 126.9780},
            {"lat": 37.4979, "lng": 127.0276},
            {"lat": 37.5145, "lng": 127.0595}
        ]
    }'

# 8. Test Directions (Seoul City Hall to Gangnam Station)
test_endpoint \
    "Directions - Seoul City Hall to Gangnam Station" \
    "/maps/directions" \
    '{
        "start": {"lat": 37.5665, "lng": 126.9780},
        "goal": {"lat": 37.4979, "lng": 127.0276}
    }'

# 9. Test Directions with Waypoint
test_endpoint \
    "Directions with Waypoint - Via Namsan Tower" \
    "/maps/directions" \
    '{
        "start": {"lat": 37.5665, "lng": 126.9780},
        "goal": {"lat": 37.4979, "lng": 127.0276},
        "waypoints": [{"lat": 37.5512, "lng": 126.9882}]
    }'

# 10. Test Directions with Option (Avoid Toll)
test_endpoint \
    "Directions - Avoid Toll Roads" \
    "/maps/directions" \
    '{
        "start": {"lat": 37.5665, "lng": 126.9780},
        "goal": {"lat": 37.4979, "lng": 127.0276},
        "option": "traavoidtoll"
    }'

# 11. Test Best Route
test_endpoint \
    "Best Route - Multiple Destinations" \
    "/maps/best-route" \
    '{
        "start": {"lat": 37.5665, "lng": 126.9780},
        "goals": [
            {"lat": 37.4979, "lng": 127.0276},
            {"lat": 37.5145, "lng": 127.0595},
            {"lat": 37.5512, "lng": 126.9882}
        ],
        "criteria": "time"
    }'

# 12. Test Distance and Time
test_endpoint \
    "Distance and Time - Simple Query" \
    "/maps/distance-time" \
    '{
        "start": {"lat": 37.5665, "lng": 126.9780},
        "goal": {"lat": 37.4979, "lng": 127.0276}
    }'

echo -e "\n${YELLOW}================================${NC}"
echo -e "${GREEN}Maps API Test Complete!${NC}"
echo -e "${YELLOW}================================${NC}"