# Maps API Frontend Integration Guide

## Overview
The Maps API provides comprehensive location-based services powered by Naver Maps API, including geocoding, reverse geocoding, directions, and route optimization.

## Base URL
```
http://localhost:20000
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```typescript
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

## Endpoints

### 1. Geocoding - Address to Coordinates
Convert address text to geographic coordinates.

**Endpoint:** `POST /maps/geocode`

**Request:**
```typescript
interface GeocodingRequest {
  query: string           // Address or place name to search
  coordinate?: {          // Optional: Search near this location
    lat: number
    lng: number
  }
  language?: 'kor' | 'eng'  // Default: 'kor'
  page?: number              // Default: 1
  count?: number             // Results per page, default: 10
}
```

**Response:**
```typescript
interface GeocodingResponse {
  results: Array<{
    name: string
    address: {
      roadAddress: string
      jibunAddress: string
      englishAddress?: string
    }
    coordinates: {
      lat: number
      lng: number
    }
    distance?: number  // Distance in meters if coordinate provided
  }>
  totalCount: number
  page: number
  count: number
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/geocode', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: '서울특별시 강남구 테헤란로 212',
    language: 'kor'
  })
})
const data = await response.json()
```

### 2. Search Nearby Places
Search for places near a specific location.

**Endpoint:** `POST /maps/search-nearby`

**Request:**
```typescript
interface SearchNearbyRequest {
  query: string          // Search term (e.g., "스타벅스", "병원")
  center: {              // Center point for search
    lat: number
    lng: number
  }
  radius: number         // Search radius in meters (max: 5000)
}
```

**Response:** Same as GeocodingResponse

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/search-nearby', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: '스타벅스',
    center: { lat: 37.5665, lng: 126.9780 },
    radius: 1000
  })
})
```

### 3. Reverse Geocoding - Coordinates to Address
Convert coordinates to address information.

**Endpoint:** `POST /maps/reverse-geocode`

**Request:**
```typescript
interface ReverseGeocodingRequest {
  lat: number
  lng: number
}
```

**Response:**
```typescript
interface ReverseGeocodingResponse {
  address: {
    roadAddress: string
    jibunAddress: string
    englishAddress?: string
  }
  area: {
    sido: string        // Province
    sigungu: string     // City/District
    dong: string        // Neighborhood
  }
  land?: {
    type: string
    number1: string
    number2?: string
  }
  addition?: {
    type: string
    value: string
  }
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/reverse-geocode', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lat: 37.5665,
    lng: 126.9780
  })
})
```

### 4. Find Nearest Address
Get only the nearest address string for coordinates (simplified version).

**Endpoint:** `POST /maps/nearest-address`

**Request:**
```typescript
interface NearestAddressRequest {
  lat: number
  lng: number
}
```

**Response:**
```typescript
interface NearestAddressResponse {
  address: string | null
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/nearest-address', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lat: 37.5145,
    lng: 127.0595
  })
})
```

### 5. Batch Reverse Geocoding
Convert multiple coordinates to addresses in one request.

**Endpoint:** `POST /maps/batch-reverse-geocode`

**Request:**
```typescript
interface BatchReverseGeocodingRequest {
  coordinates: Array<{
    lat: number
    lng: number
  }>
}
```

**Response:**
```typescript
type BatchReverseGeocodingResponse = Array<ReverseGeocodingResponse>
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/batch-reverse-geocode', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    coordinates: [
      { lat: 37.5665, lng: 126.9780 },
      { lat: 37.4979, lng: 127.0276 },
      { lat: 37.5145, lng: 127.0595 }
    ]
  })
})
```

### 6. Get Directions
Get driving directions between two points with optional waypoints.

**Endpoint:** `POST /maps/directions`

**Request:**
```typescript
interface DirectionsRequest {
  start: {
    lat: number
    lng: number
    name?: string       // Optional: Start location name
  }
  goal: {
    lat: number
    lng: number
    name?: string       // Optional: Destination name
  }
  waypoints?: Array<{   // Optional: Via points
    lat: number
    lng: number
    name?: string
  }>
  option?: 'trafast' | 'tracomfort' | 'traoptimal' | 'traavoidtoll' | 'traavoidcaronly'
  // trafast: Fastest route
  // tracomfort: Comfortable route
  // traoptimal: Optimal balance (default)
  // traavoidtoll: Avoid toll roads
  // traavoidcaronly: Avoid car-only roads
}
```

**Response:**
```typescript
interface DirectionsResponse {
  route: {
    summary: {
      start: {
        location: { lat: number; lng: number }
        name?: string
      }
      goal: {
        location: { lat: number; lng: number }
        name?: string
      }
      waypoints?: Array<{
        location: { lat: number; lng: number }
        name?: string
      }>
      distance: number      // Total distance in meters
      duration: number      // Total time in milliseconds
      tollFare: number      // Toll cost in KRW
      taxiFare: number      // Estimated taxi fare in KRW
      fuelPrice: number     // Estimated fuel cost in KRW
    }
    path: Array<{
      lat: number
      lng: number
    }>
    section?: Array<{
      pointIndex: number    // Index in path array
      pointCount: number    // Number of points in section
      distance: number      // Section distance in meters
      name: string          // Road name
      congestion: number    // Traffic: 0=unknown, 1=smooth, 2=slow, 3=congested, 4=blocked
      speed: number         // Speed in km/h
    }>
    guide?: Array<{
      pointIndex: number
      type: number          // Maneuver type
      instructions: string  // Turn-by-turn instructions
      distance: number      // Distance to next instruction
      duration: number      // Time to next instruction
    }>
  }
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/directions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    start: {
      lat: 37.5665,
      lng: 126.9780,
      name: 'Seoul City Hall'
    },
    goal: {
      lat: 37.4979,
      lng: 127.0276,
      name: 'Gangnam Station'
    },
    waypoints: [
      { lat: 37.5512, lng: 126.9882, name: 'Namsan Tower' }
    ],
    option: 'traoptimal'
  })
})
```

### 7. Find Best Route
Find the optimal route among multiple destinations.

**Endpoint:** `POST /maps/best-route`

**Request:**
```typescript
interface BestRouteRequest {
  start: {
    lat: number
    lng: number
    name?: string
  }
  goals: Array<{        // Multiple possible destinations
    lat: number
    lng: number
    name?: string
  }>
  criteria: 'time' | 'distance'  // Optimization criteria
}
```

**Response:** Same as DirectionsResponse (returns the best route)

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/best-route', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    start: { lat: 37.5665, lng: 126.9780 },
    goals: [
      { lat: 37.4979, lng: 127.0276, name: 'Gangnam Station' },
      { lat: 37.5145, lng: 127.0595, name: 'COEX' },
      { lat: 37.5512, lng: 126.9882, name: 'Namsan Tower' }
    ],
    criteria: 'time'
  })
})
```

### 8. Get Distance and Time
Get simple distance and estimated time between two points.

**Endpoint:** `POST /maps/distance-time`

**Request:**
```typescript
interface DistanceTimeRequest {
  start: {
    lat: number
    lng: number
  }
  goal: {
    lat: number
    lng: number
  }
}
```

**Response:**
```typescript
interface DistanceTimeResponse {
  distance: string      // Formatted distance (e.g., "12.5 km")
  duration: string      // Formatted duration (e.g., "25 minutes")
  cost: number          // Estimated cost in KRW
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:20000/maps/distance-time', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    start: { lat: 37.5665, lng: 126.9780 },
    goal: { lat: 37.4979, lng: 127.0276 }
  })
})
```

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  statusCode: number
  error: string
  message: string
}
```

Common error codes:
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Missing or invalid authentication token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error

**Example error handling:**
```javascript
try {
  const response = await fetch('http://localhost:20000/maps/geocode', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: '강남역' })
  })

  if (!response.ok) {
    const error = await response.json()
    console.error(`Error ${error.statusCode}: ${error.message}`)
    return
  }

  const data = await response.json()
  console.log(data)
} catch (error) {
  console.error('Network error:', error)
}
```

## Rate Limiting

- API calls are cached for 5 minutes to reduce external API usage
- Cache key is based on endpoint and request parameters
- Identical requests within 5 minutes return cached results

## Coordinate Validation

All coordinates must be within the Korean region:
- Latitude: 33.0 to 39.0
- Longitude: 124.0 to 132.0

Coordinates outside this range will return a validation error.

## TypeScript Types Package

For TypeScript projects, you can define these types in a shared types file:

```typescript
// maps.types.ts
export interface Coordinates {
  lat: number
  lng: number
}

export interface Address {
  roadAddress: string
  jibunAddress: string
  englishAddress?: string
}

export interface NamedLocation extends Coordinates {
  name?: string
}

// ... (include all interface definitions from above)
```

## React Hook Example

```typescript
// useGeocoding.ts
import { useState } from 'react'

export function useGeocoding(token: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geocode = async (query: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:20000/maps/geocode', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message)
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { geocode, loading, error }
}

// Usage in component
function AddressSearch() {
  const { geocode, loading, error } = useGeocoding(authToken)

  const handleSearch = async (address: string) => {
    const result = await geocode(address)
    if (result) {
      console.log('Found locations:', result.results)
    }
  }

  // ... render UI
}
```

## Testing with cURL

Quick test examples:

```bash
# Geocoding
curl -X POST http://localhost:20000/maps/geocode \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "강남역"}'

# Reverse Geocoding
curl -X POST http://localhost:20000/maps/reverse-geocode \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"lat": 37.5665, "lng": 126.9780}'

# Get Directions
curl -X POST http://localhost:20000/maps/directions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "start": {"lat": 37.5665, "lng": 126.9780},
    "goal": {"lat": 37.4979, "lng": 127.0276}
  }'
```

## Notes

1. **Language Support**: Geocoding supports both Korean (`kor`) and English (`eng`) languages
2. **Waypoints**: Directions API supports up to 5 waypoints between start and goal
3. **Traffic Information**: Direction responses include real-time traffic congestion levels
4. **Cost Estimates**: Routes include toll fees, taxi fares, and fuel cost estimates in KRW
5. **Path Optimization**: Best route endpoint automatically selects optimal route from multiple destinations
6. **Response Caching**: Identical requests are cached for 5 minutes to improve performance

## Support

For issues or questions about the Maps API, contact the backend team or refer to the API documentation in the repository.