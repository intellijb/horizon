import { NaverMapsApiPort, RouteOption } from "../domain/ports/naver-maps-api.port"
import { MapsRepositoryPort } from "../domain/ports/maps-repository.port"
import { Route } from "../domain/entities/route.entity"
import { CoordinatesVO } from "../domain/value-objects/coordinates.value"
import { DirectionsService } from "../business/directions.service"
import { MapSearchType } from "../constants/maps.constants"

export interface DirectionsRequest {
  start: { lat: number; lng: number }
  goal: { lat: number; lng: number }
  waypoints?: Array<{ lat: number; lng: number }>
  option?: RouteOption
}

export interface DirectionsResponse {
  start: { lat: number; lng: number }
  goal: { lat: number; lng: number }
  waypoints?: Array<{ lat: number; lng: number }>
  distanceMeters: number
  distanceKm: string
  durationMs: number
  durationMinutes: number
  durationFormatted: string
  tollFare: number
  taxiFare: number
  fuelPrice: number
  totalCost: number
  mainRoads: string[]
  turnByTurn: Array<{
    instruction: string
    distance: number
    type: string
  }>
  efficiency: number
}

export class DirectionsUseCase {
  private directionsService: DirectionsService

  constructor(
    private repository: MapsRepositoryPort,
    private naverMapsApi: NaverMapsApiPort,
  ) {
    this.directionsService = new DirectionsService()
  }

  async execute(request: DirectionsRequest, userId?: string): Promise<DirectionsResponse> {
    const startCoords = CoordinatesVO.create(request.start.lat, request.start.lng)
    const goalCoords = CoordinatesVO.create(request.goal.lat, request.goal.lng)
    const waypointCoords = request.waypoints?.map(w => CoordinatesVO.create(w.lat, w.lng))

    // Validate waypoints if provided
    if (waypointCoords) {
      this.directionsService.validateWaypoints(waypointCoords)
    }

    // Check cache first
    const cached = await this.repository.findRoute(startCoords, goalCoords, waypointCoords)
    if (cached) {
      return this.formatResponse(cached)
    }

    // Build API request
    const apiRequest = {
      start: startCoords,
      goal: goalCoords,
      waypoints: waypointCoords,
      option: request.option || "traoptimal",
    }

    // Call Naver Maps API
    const apiResponse = await this.naverMapsApi.getDirections(apiRequest)

    // Process response
    const route = this.directionsService.processDirectionsResponse(
      apiResponse,
      startCoords,
      goalCoords,
      waypointCoords,
    )

    // Cache result
    await this.repository.saveRoute(route)

    // Save search history if user is authenticated
    if (userId) {
      const searchQuery = `${request.start.lat},${request.start.lng} to ${request.goal.lat},${request.goal.lng}`
      await this.repository.saveSearchHistory(userId, MapSearchType.DIRECTIONS, searchQuery)
    }

    return this.formatResponse(route)
  }

  async findBestRoute(
    start: { lat: number; lng: number },
    goals: Array<{ lat: number; lng: number }>,
    criteria: "time" | "distance" | "cost" = "time",
    userId?: string,
  ): Promise<DirectionsResponse> {
    const routes = await Promise.all(
      goals.map(goal => this.execute({ start, goal }, userId)),
    )

    // Convert responses back to Route objects for comparison
    const routeObjects = routes.map(r => {
      const startCoords = CoordinatesVO.create(r.start.lat, r.start.lng)
      const goalCoords = CoordinatesVO.create(r.goal.lat, r.goal.lng)
      return Route.create({
        start: startCoords,
        goal: goalCoords,
        distanceMeters: r.distanceMeters,
        durationMs: r.durationMs,
        tollFare: r.tollFare,
        taxiFare: r.taxiFare,
        fuelPrice: r.fuelPrice,
      })
    })

    const bestRoute = this.directionsService.selectBestRoute(routeObjects, criteria)
    const bestIndex = routeObjects.indexOf(bestRoute)

    return routes[bestIndex]
  }

  async getDistanceAndTime(
    start: { lat: number; lng: number },
    goal: { lat: number; lng: number },
    userId?: string,
  ): Promise<{ distance: string; duration: string; cost: number }> {
    const result = await this.execute({ start, goal }, userId)

    return {
      distance: result.distanceKm + "km",
      duration: result.durationFormatted,
      cost: result.totalCost,
    }
  }

  private formatResponse(route: Route): DirectionsResponse {
    const efficiency = this.directionsService.calculateRouteEfficiency(route)

    return {
      start: {
        lat: route.start.lat,
        lng: route.start.lng,
      },
      goal: {
        lat: route.goal.lat,
        lng: route.goal.lng,
      },
      waypoints: route.waypoints?.map(w => ({
        lat: w.lat,
        lng: w.lng,
      })),
      distanceMeters: route.distanceMeters,
      distanceKm: route.distanceKm.toFixed(2),
      durationMs: route.durationMs,
      durationMinutes: route.durationMinutes,
      durationFormatted: route.durationFormatted,
      tollFare: route.tollFare,
      taxiFare: route.taxiFare,
      fuelPrice: route.fuelPrice,
      totalCost: route.totalCost,
      mainRoads: route.getMainRoads(),
      turnByTurn: route.getTurnByTurnInstructions(),
      efficiency,
    }
  }
}