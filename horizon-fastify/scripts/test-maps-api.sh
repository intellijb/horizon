#!/bin/bash

API_URL="http://localhost:20000"

echo "Testing Maps API Endpoints"
echo "=========================="

# Test geocoding
echo -e "\n1. Testing Geocoding (Address to Coordinates)"
curl -X POST "$API_URL/maps/geocode" \
  -H "Content-Type: application/json" \
  -d '{"query": "서울특별시 강남구 테헤란로 212"}' \
  | python3 -m json.tool 2>/dev/null || echo "Geocoding endpoint failed (API keys not configured)"

# Test reverse geocoding
echo -e "\n2. Testing Reverse Geocoding (Coordinates to Address)"
curl -X POST "$API_URL/maps/reverse-geocode" \
  -H "Content-Type: application/json" \
  -d '{"lat": 37.5665, "lng": 126.9780}' \
  | python3 -m json.tool 2>/dev/null || echo "Reverse geocoding endpoint failed (API keys not configured)"

# Test directions
echo -e "\n3. Testing Directions"
curl -X POST "$API_URL/maps/directions" \
  -H "Content-Type: application/json" \
  -d '{
    "start": {"lat": 37.5665, "lng": 126.9780},
    "goal": {"lat": 37.5145, "lng": 127.0595}
  }' \
  | python3 -m json.tool 2>/dev/null || echo "Directions endpoint failed (API keys not configured)"

# Test distance and time
echo -e "\n4. Testing Distance and Time"
curl -X POST "$API_URL/maps/distance-time" \
  -H "Content-Type: application/json" \
  -d '{
    "start": {"lat": 37.5665, "lng": 126.9780},
    "goal": {"lat": 37.5145, "lng": 127.0595}
  }' \
  | python3 -m json.tool 2>/dev/null || echo "Distance/time endpoint failed (API keys not configured)"

echo -e "\nMaps API test complete!"
echo "Note: To use the actual Naver Maps API, set NAVER_API_KEY_ID and NAVER_API_KEY in your .env file"