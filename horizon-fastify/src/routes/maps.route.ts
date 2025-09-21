import { FastifyInstance, FastifyRequest } from "fastify"
import { z } from "zod"
import {
  MapsController,
  mapsRequests,
  mapsResponseSchemas,
  type GeocodingRequest,
  type SearchNearbyRequest,
  type ReverseGeocodingRequest,
  type BatchReverseGeocodingRequest,
  type DirectionsRequest,
  type BestRouteRequest,
} from "@modules/features/maps"
import { createRoutesFactory, commonResponses } from "@modules/platform/fastify"

export default async function mapsRoutes(fastify: FastifyInstance) {
  const controller = new MapsController(fastify.db)
  const routes = createRoutesFactory(fastify, {
    tags: ["Maps"],
  })

  // ===== Geocoding Routes =====

  // Geocode address to coordinates
  routes.post("/maps/geocode", {
    summary: "Geocode address",
    description: "Convert address to coordinates",
  })
    .withBody(mapsRequests.geocoding)
    .withResponses({
      200: mapsResponseSchemas.geocoding,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { query, coordinate, language, page, count } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.geocode(
        query,
        { coordinate, language, page, count },
        userId,
      )
      return {
        statusCode: 200,
        data: result,
      }
    })

  // Search nearby places
  routes.post("/maps/search-nearby", {
    summary: "Search nearby places",
    description: "Search for places near a specific coordinate",
  })
    .withBody(mapsRequests.searchNearby)
    .withResponses({
      200: mapsResponseSchemas.geocoding,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { query, center, radius } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.searchNearby(query, center, radius, userId)
      return {
        statusCode: 200,
        data: result,
      }
    })

  // ===== Reverse Geocoding Routes =====

  // Reverse geocode coordinates to address
  routes.post("/maps/reverse-geocode", {
    summary: "Reverse geocode coordinates",
    description: "Convert coordinates to address",
  })
    .withBody(mapsRequests.reverseGeocoding)
    .withResponses({
      200: mapsResponseSchemas.reverseGeocoding,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { lat, lng } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.reverseGeocode(lat, lng, userId)
      return {
        statusCode: 200,
        data: result,
      }
    })

  // Find nearest address
  routes.post("/maps/nearest-address", {
    summary: "Find nearest address",
    description: "Find the nearest address for given coordinates",
  })
    .withBody(mapsRequests.reverseGeocoding)
    .withResponses({
      200: z.object({
        address: z.string().nullable(),
      }),
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { lat, lng } = request.body as any
      const userId = (request as any).user?.id
      const address = await controller.findNearestAddress(lat, lng, userId)
      return {
        statusCode: 200,
        data: { address },
      }
    })

  // Batch reverse geocoding
  routes.post("/maps/batch-reverse-geocode", {
    summary: "Batch reverse geocoding",
    description: "Convert multiple coordinates to addresses",
  })
    .withBody(mapsRequests.batchReverseGeocoding)
    .withResponses({
      200: z.array(mapsResponseSchemas.reverseGeocoding),
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { coordinates } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.batchReverseGeocode(coordinates, userId)
      return {
        statusCode: 200,
        data: result,
      }
    })

  // ===== Directions Routes =====

  // Get directions between two points
  routes.post("/maps/directions", {
    summary: "Get directions",
    description: "Get driving directions between two points with optional waypoints",
  })
    .withBody(mapsRequests.directions)
    .withResponses({
      200: mapsResponseSchemas.directions,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { start, goal, waypoints, option } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.getDirections(start, goal, waypoints, option, userId)
      return {
        statusCode: 200,
        data: result,
      }
    })

  // Find best route among multiple destinations
  routes.post("/maps/best-route", {
    summary: "Find best route",
    description: "Find the optimal route among multiple destinations",
  })
    .withBody(mapsRequests.bestRoute)
    .withResponses({
      200: mapsResponseSchemas.directions,
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { start, goals, criteria } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.findBestRoute(start, goals, criteria, userId)
      return {
        statusCode: 200,
        data: result,
      }
    })

  // Get distance and time
  routes.post("/maps/distance-time", {
    summary: "Get distance and time",
    description: "Get simple distance and time between two points",
  })
    .withBody(
      z.object({
        start: z.object({
          lat: z.number(),
          lng: z.number(),
        }),
        goal: z.object({
          lat: z.number(),
          lng: z.number(),
        }),
      })
    )
    .withResponses({
      200: z.object({
        distance: z.string(),
        duration: z.string(),
        cost: z.number(),
      }),
      ...commonResponses.error(),
    })
    .handle(async (request: FastifyRequest) => {
      const { start, goal } = request.body as any
      const userId = (request as any).user?.id
      const result = await controller.getDistanceAndTime(start, goal, userId)
      return {
        statusCode: 200,
        data: result,
      }
    })
}