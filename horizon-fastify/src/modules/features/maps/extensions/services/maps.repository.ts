import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { MapsRepositoryPort } from "../../domain/ports/maps-repository.port"
import { Route } from "../../domain/entities/route.entity"
import { GeocodedLocation } from "../../domain/entities/geocoded-location.entity"
import { CoordinatesVO } from "../../domain/value-objects/coordinates.value"

// In-memory cache implementation for now
// In production, consider using Redis or database tables
export class MapsRepository implements MapsRepositoryPort {
  private routeCache: Map<string, Route> = new Map()
  private geocodingCache: Map<string, GeocodedLocation[]> = new Map()
  private reverseGeocodingCache: Map<string, GeocodedLocation> = new Map()
  private searchHistory: Map<string, Array<{ type: string; query: string; createdAt: Date }>> = new Map()

  constructor(private db: NodePgDatabase<typeof schema>) {}

  // Route operations
  async saveRoute(route: Route): Promise<Route> {
    const key = this.getRouteKey(route.start, route.goal, route.waypoints)
    this.routeCache.set(key, route)

    // Set expiration
    setTimeout(() => {
      this.routeCache.delete(key)
    }, 3600000) // 1 hour

    return route
  }

  async findRoute(
    start: CoordinatesVO,
    goal: CoordinatesVO,
    waypoints?: CoordinatesVO[],
  ): Promise<Route | null> {
    const key = this.getRouteKey(start, goal, waypoints)
    return this.routeCache.get(key) || null
  }

  async findRouteById(id: string): Promise<Route | null> {
    // Not implemented for in-memory cache
    return null
  }

  async deleteRoute(id: string): Promise<void> {
    // Not implemented for in-memory cache
  }

  // Geocoding cache operations
  async saveGeocodedLocation(location: GeocodedLocation): Promise<GeocodedLocation> {
    const addressKey = location.address.formatted || location.address.roadAddress || ""

    if (addressKey) {
      const existing = this.geocodingCache.get(addressKey) || []
      const updated = [...existing.filter(l => l.coordinates !== location.coordinates), location]
      this.geocodingCache.set(addressKey, updated)
    }

    // Also save in reverse geocoding cache
    const coordsKey = `${location.coordinates.lat},${location.coordinates.lng}`
    this.reverseGeocodingCache.set(coordsKey, location)

    // Set expiration
    setTimeout(() => {
      if (addressKey) {
        this.geocodingCache.delete(addressKey)
      }
      this.reverseGeocodingCache.delete(coordsKey)
    }, 3600000) // 1 hour

    return location
  }

  async findGeocodedLocation(query: string): Promise<GeocodedLocation[] | null> {
    // Search in cache with partial matching
    for (const [key, value] of this.geocodingCache.entries()) {
      if (key.toLowerCase().includes(query.toLowerCase())) {
        return value
      }
    }
    return null
  }

  async findGeocodedLocationByCoords(coords: CoordinatesVO): Promise<GeocodedLocation | null> {
    const key = `${coords.lat},${coords.lng}`
    return this.reverseGeocodingCache.get(key) || null
  }

  async deleteGeocodedLocation(id: string): Promise<void> {
    // Not implemented for in-memory cache
  }

  // Search history
  async saveSearchHistory(
    userId: string,
    searchType: "geocoding" | "directions" | "reverse",
    query: string,
  ): Promise<void> {
    const history = this.searchHistory.get(userId) || []
    history.unshift({
      type: searchType,
      query,
      createdAt: new Date(),
    })

    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(100)
    }

    this.searchHistory.set(userId, history)
  }

  async getSearchHistory(
    userId: string,
    limit: number = 10,
  ): Promise<Array<{ type: string; query: string; createdAt: Date }>> {
    const history = this.searchHistory.get(userId) || []
    return history.slice(0, limit)
  }

  // Clean up
  async cleanExpiredCache(olderThan: Date): Promise<void> {
    // For in-memory cache, this is handled by setTimeout
    // In production, implement proper cleanup logic
  }

  // Helper methods
  private getRouteKey(start: CoordinatesVO, goal: CoordinatesVO, waypoints?: CoordinatesVO[]): string {
    let key = `${start.lat},${start.lng}-${goal.lat},${goal.lng}`
    if (waypoints && waypoints.length > 0) {
      key += `-${waypoints.map(w => `${w.lat},${w.lng}`).join("-")}`
    }
    return key
  }
}