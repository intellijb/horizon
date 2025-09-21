export const MapsConstants = {
  // API Configuration
  NAVER_MAPS_BASE_URL: "https://maps.apigw.ntruss.com",
  API_TIMEOUT: 10000, // 10 seconds

  // Cache Configuration
  CACHE_TTL: 3600000, // 1 hour in milliseconds
  MAX_CACHE_SIZE: 1000,

  // Rate Limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_DAY: 10000,

  // Validation
  MAX_WAYPOINTS: 5,
  MAX_SEARCH_RESULTS: 100,
  MAX_BATCH_SIZE: 10,

  // Korean Coordinate Bounds
  KOREA_BOUNDS: {
    MIN_LAT: 33,
    MAX_LAT: 39,
    MIN_LNG: 124,
    MAX_LNG: 132,
  },

  // Default Options
  DEFAULT_ROUTE_OPTION: "traoptimal" as const,
  DEFAULT_LANGUAGE: "ko" as const,
  DEFAULT_PAGE_SIZE: 10,

  // Error Messages
  ERRORS: {
    INVALID_COORDINATES: "Invalid coordinates for Korean region",
    INVALID_API_KEY: "Invalid Naver Maps API credentials",
    RATE_LIMIT_EXCEEDED: "API rate limit exceeded",
    CACHE_ERROR: "Failed to cache data",
    NETWORK_ERROR: "Network error occurred",
    API_ERROR: "Naver Maps API error",
    NOT_FOUND: "Location or route not found",
  },
} as const

export enum MapSearchType {
  GEOCODING = "geocoding",
  REVERSE = "reverse",
  DIRECTIONS = "directions",
}

export enum RouteOptionType {
  FAST = "trafast",
  COMFORT = "tracomfort",
  OPTIMAL = "traoptimal",
  AVOID_TOLL = "traavoidtoll",
  AVOID_CAR_ONLY = "traavoidcaronly",
}