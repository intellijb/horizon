import { Route } from "../entities/route.entity"
import { GeocodedLocation } from "../entities/geocoded-location.entity"
import { CoordinatesVO } from "../value-objects/coordinates.value"

export interface MapsRepositoryPort {
  // Route operations (for caching)
  saveRoute(route: Route): Promise<Route>
  findRoute(start: CoordinatesVO, goal: CoordinatesVO, waypoints?: CoordinatesVO[]): Promise<Route | null>
  findRouteById(id: string): Promise<Route | null>
  deleteRoute(id: string): Promise<void>

  // Geocoding cache operations
  saveGeocodedLocation(location: GeocodedLocation): Promise<GeocodedLocation>
  findGeocodedLocation(query: string): Promise<GeocodedLocation[] | null>
  findGeocodedLocationByCoords(coords: CoordinatesVO): Promise<GeocodedLocation | null>
  deleteGeocodedLocation(id: string): Promise<void>

  // Search history
  saveSearchHistory(userId: string, searchType: "geocoding" | "directions" | "reverse", query: string): Promise<void>
  getSearchHistory(userId: string, limit?: number): Promise<Array<{ type: string; query: string; createdAt: Date }>>

  // Clean up old cached data
  cleanExpiredCache(olderThan: Date): Promise<void>
}