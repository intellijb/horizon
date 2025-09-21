import { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@modules/platform/database/schema"
import { DirectionsUseCase } from "./directions.usecase"
import { GeocodingUseCase } from "./geocoding.usecase"
import { ReverseGeocodingUseCase } from "./reverse-geocoding.usecase"
import { NaverMapsApiAdapter } from "../extensions/services/naver-maps-api.adapter"
import { MapsRepository } from "../extensions/services/maps.repository"

export class MapsController {
  private directionsUseCase: DirectionsUseCase
  private geocodingUseCase: GeocodingUseCase
  private reverseGeocodingUseCase: ReverseGeocodingUseCase

  constructor(db: NodePgDatabase<typeof schema>) {
    const repository = new MapsRepository(db)
    const naverMapsApi = new NaverMapsApiAdapter()

    this.directionsUseCase = new DirectionsUseCase(repository, naverMapsApi)
    this.geocodingUseCase = new GeocodingUseCase(repository, naverMapsApi)
    this.reverseGeocodingUseCase = new ReverseGeocodingUseCase(repository, naverMapsApi)
  }

  // Geocoding endpoints
  async geocode(query: string, options?: any, userId?: string) {
    return await this.geocodingUseCase.execute(
      {
        query,
        ...options,
      },
      userId,
    )
  }

  async searchNearby(
    query: string,
    center: { lat: number; lng: number },
    radius?: number,
    userId?: string,
  ) {
    return await this.geocodingUseCase.searchNearby(query, center, radius, userId)
  }

  // Reverse geocoding endpoints
  async reverseGeocode(lat: number, lng: number, userId?: string) {
    return await this.reverseGeocodingUseCase.execute({ lat, lng }, userId)
  }

  async findNearestAddress(lat: number, lng: number, userId?: string) {
    return await this.reverseGeocodingUseCase.findNearestAddress(lat, lng, userId)
  }

  async batchReverseGeocode(
    coordinates: Array<{ lat: number; lng: number }>,
    userId?: string,
  ) {
    return await this.reverseGeocodingUseCase.batchReverseGeocode(coordinates, userId)
  }

  // Directions endpoints
  async getDirections(
    start: { lat: number; lng: number },
    goal: { lat: number; lng: number },
    waypoints?: Array<{ lat: number; lng: number }>,
    option?: any,
    userId?: string,
  ) {
    return await this.directionsUseCase.execute(
      {
        start,
        goal,
        waypoints,
        option,
      },
      userId,
    )
  }

  async findBestRoute(
    start: { lat: number; lng: number },
    goals: Array<{ lat: number; lng: number }>,
    criteria?: "time" | "distance" | "cost",
    userId?: string,
  ) {
    return await this.directionsUseCase.findBestRoute(start, goals, criteria, userId)
  }

  async getDistanceAndTime(
    start: { lat: number; lng: number },
    goal: { lat: number; lng: number },
    userId?: string,
  ) {
    return await this.directionsUseCase.getDistanceAndTime(start, goal, userId)
  }
}