import { z } from "zod"

// Geocoding schemas
export const geocodingRequestSchema = z.object({
  body: z.object({
    query: z.string().min(2).max(200),
    coordinate: z
      .object({
        lat: z.number().min(33).max(39),
        lng: z.number().min(124).max(132),
      })
      .optional(),
    language: z.enum(["kor", "eng"]).optional(),
    page: z.number().int().positive().optional(),
    count: z.number().int().min(1).max(100).optional(),
  }),
})

export const searchNearbyRequestSchema = z.object({
  body: z.object({
    query: z.string().min(2).max(200),
    center: z.object({
      lat: z.number().min(33).max(39),
      lng: z.number().min(124).max(132),
    }),
    radius: z.number().positive().optional(),
  }),
})

// Reverse geocoding schemas
export const reverseGeocodingRequestSchema = z.object({
  body: z.object({
    lat: z.number().min(33).max(39),
    lng: z.number().min(124).max(132),
    orders: z
      .array(z.enum(["legalcode", "admcode", "addr", "roadaddr"]))
      .optional(),
  }),
})

export const batchReverseGeocodingRequestSchema = z.object({
  body: z.object({
    coordinates: z.array(
      z.object({
        lat: z.number().min(33).max(39),
        lng: z.number().min(124).max(132),
      }),
    ),
  }),
})

// Directions schemas
export const directionsRequestSchema = z.object({
  body: z.object({
    start: z.object({
      lat: z.number().min(33).max(39),
      lng: z.number().min(124).max(132),
    }),
    goal: z.object({
      lat: z.number().min(33).max(39),
      lng: z.number().min(124).max(132),
    }),
    waypoints: z
      .array(
        z.object({
          lat: z.number().min(33).max(39),
          lng: z.number().min(124).max(132),
        }),
      )
      .max(5)
      .optional(),
    option: z
      .enum(["trafast", "tracomfort", "traoptimal", "traavoidtoll", "traavoidcaronly"])
      .optional(),
  }),
})

export const bestRouteRequestSchema = z.object({
  body: z.object({
    start: z.object({
      lat: z.number().min(33).max(39),
      lng: z.number().min(124).max(132),
    }),
    goals: z.array(
      z.object({
        lat: z.number().min(33).max(39),
        lng: z.number().min(124).max(132),
      }),
    ),
    criteria: z.enum(["time", "distance", "cost"]).optional(),
  }),
})

// Response schemas
export const geocodingResponseSchema = z.object({
  locations: z.array(
    z.object({
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      roadAddress: z.string().optional(),
      jibunAddress: z.string().optional(),
      englishAddress: z.string().optional(),
      components: z.any(),
      distance: z.number().optional(),
    }),
  ),
  total: z.number(),
  page: z.number(),
})

export const reverseGeocodingResponseSchema = z.object({
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  roadAddress: z.string().optional(),
  jibunAddress: z.string().optional(),
  legalAddress: z.string().optional(),
  adminAddress: z.string().optional(),
  components: z.any(),
  postalCode: z.string().optional(),
  buildingName: z.string().optional(),
  fullAddress: z.string(),
})

export const directionsResponseSchema = z.object({
  start: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  goal: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  waypoints: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    )
    .optional(),
  distanceMeters: z.number(),
  distanceKm: z.string(),
  durationMs: z.number(),
  durationMinutes: z.number(),
  durationFormatted: z.string(),
  tollFare: z.number(),
  taxiFare: z.number(),
  fuelPrice: z.number(),
  totalCost: z.number(),
  mainRoads: z.array(z.string()),
  turnByTurn: z.array(
    z.object({
      instruction: z.string(),
      distance: z.number(),
      type: z.string(),
    }),
  ),
  efficiency: z.number(),
})

// Type exports
export type GeocodingRequest = z.TypeOf<typeof geocodingRequestSchema>
export type SearchNearbyRequest = z.TypeOf<typeof searchNearbyRequestSchema>
export type ReverseGeocodingRequest = z.TypeOf<typeof reverseGeocodingRequestSchema>
export type BatchReverseGeocodingRequest = z.TypeOf<typeof batchReverseGeocodingRequestSchema>
export type DirectionsRequest = z.TypeOf<typeof directionsRequestSchema>
export type BestRouteRequest = z.TypeOf<typeof bestRouteRequestSchema>

// Export request objects for routes
export const mapsRequests = {
  geocoding: geocodingRequestSchema.shape.body,
  searchNearby: searchNearbyRequestSchema.shape.body,
  reverseGeocoding: reverseGeocodingRequestSchema.shape.body,
  batchReverseGeocoding: batchReverseGeocodingRequestSchema.shape.body,
  directions: directionsRequestSchema.shape.body,
  bestRoute: bestRouteRequestSchema.shape.body,
}

// Export response schemas for routes
export const mapsResponseSchemas = {
  geocoding: geocodingResponseSchema,
  reverseGeocoding: reverseGeocodingResponseSchema,
  directions: directionsResponseSchema,
}