import { CoordinatesVO } from "../domain/value-objects/coordinates.value"
import { Route, RouteSegment, RouteGuide } from "../domain/entities/route.entity"
import { MapsConstants } from "../constants/maps.constants"

export class DirectionsService {
  /**
   * Process raw directions response from API
   */
  processDirectionsResponse(response: any, start: CoordinatesVO, goal: CoordinatesVO, waypoints?: CoordinatesVO[]): Route {
    if (response.code !== 0) {
      throw new Error(`Directions API error: ${response.message}`)
    }

    // Get first option's first route
    const routeKey = Object.keys(response.route)[0]
    const routeData = response.route[routeKey][0]
    const summary = routeData.summary

    const segments: RouteSegment[] = routeData.section?.map((s: any) => ({
      pointIndex: s.pointIndex,
      pointCount: s.pointCount,
      distance: s.distance,
      name: s.name,
      congestion: s.congestion,
      speed: s.speed,
    })) || []

    const guides: RouteGuide[] = routeData.guide?.map((g: any) => ({
      pointIndex: g.pointIndex,
      type: g.type,
      instructions: g.instructions,
      distance: g.distance,
      duration: g.duration,
    })) || []

    return Route.create({
      start,
      goal,
      waypoints,
      distanceMeters: summary.distance,
      durationMs: summary.duration,
      tollFare: summary.tollFare || 0,
      taxiFare: summary.taxiFare || 0,
      fuelPrice: summary.fuelPrice || 0,
      path: routeData.path,
      segments,
      guides,
      createdAt: new Date(),
    })
  }

  /**
   * Validate waypoints
   */
  validateWaypoints(waypoints: CoordinatesVO[]): void {
    if (waypoints.length > MapsConstants.MAX_WAYPOINTS) {
      throw new Error(`Maximum ${MapsConstants.MAX_WAYPOINTS} waypoints allowed`)
    }
  }

  /**
   * Calculate straight line distance between two points
   */
  calculateStraightDistance(start: CoordinatesVO, end: CoordinatesVO): number {
    return start.distanceTo(end)
  }

  /**
   * Find the best route from multiple options
   */
  selectBestRoute(routes: Route[], criteria: "time" | "distance" | "cost" = "time"): Route {
    if (routes.length === 0) {
      throw new Error("No routes to select from")
    }

    return routes.reduce((best, current) => {
      switch (criteria) {
        case "time":
          return current.durationMs < best.durationMs ? current : best
        case "distance":
          return current.distanceMeters < best.distanceMeters ? current : best
        case "cost":
          return current.totalCost < best.totalCost ? current : best
        default:
          return best
      }
    })
  }

  /**
   * Check if route is efficient (actual distance vs straight distance)
   */
  calculateRouteEfficiency(route: Route): number {
    const straightDistance = route.start.distanceTo(route.goal)
    return (straightDistance / route.distanceMeters) * 100
  }

  /**
   * Format duration to human readable
   */
  formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000)
    const minutes = Math.floor((milliseconds % 3600000) / 60000)
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
  }

  /**
   * Format distance to human readable
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }
}