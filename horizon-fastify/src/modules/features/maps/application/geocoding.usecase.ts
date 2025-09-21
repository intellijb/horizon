import { NaverMapsApiPort } from "../domain/ports/naver-maps-api.port"
import { MapsRepositoryPort } from "../domain/ports/maps-repository.port"
import { GeocodedLocation } from "../domain/entities/geocoded-location.entity"
import { CoordinatesVO } from "../domain/value-objects/coordinates.value"
import { GeocodingService } from "../business/geocoding.service"
import { MapSearchType } from "../constants/maps.constants"

export interface GeocodingRequest {
  query: string
  coordinate?: { lat: number; lng: number }
  language?: "kor" | "eng"
  page?: number
  count?: number
}

export interface GeocodingResponse {
  locations: Array<{
    coordinates: { lat: number; lng: number }
    roadAddress?: string
    jibunAddress?: string
    englishAddress?: string
    components: any
    distance?: number
  }>
  total: number
  page: number
}

export class GeocodingUseCase {
  private geocodingService: GeocodingService

  constructor(
    private repository: MapsRepositoryPort,
    private naverMapsApi: NaverMapsApiPort,
  ) {
    this.geocodingService = new GeocodingService()
  }

  async execute(request: GeocodingRequest, userId?: string): Promise<GeocodingResponse> {
    // Validate query
    this.geocodingService.validateQuery(request.query)

    // Check cache first
    const cached = await this.repository.findGeocodedLocation(request.query)
    if (cached && cached.length > 0) {
      return this.formatResponse(cached, request.page || 1)
    }

    // Build API request
    const apiRequest = {
      query: request.query,
      coordinate: request.coordinate ? CoordinatesVO.create(request.coordinate.lat, request.coordinate.lng) : undefined,
      language: request.language,
      page: request.page || 1,
      count: Math.min(request.count || 10, 100),
    }

    // Call Naver Maps API
    const apiResponse = await this.naverMapsApi.geocode(apiRequest)

    // Process response
    const locations = this.geocodingService.processGeocodingResponse(apiResponse)

    // Sort by distance if coordinate provided
    const sorted = request.coordinate
      ? this.geocodingService.sortByDistance(locations)
      : locations

    // Cache results
    for (const location of sorted) {
      await this.repository.saveGeocodedLocation(location)
    }

    // Save search history if user is authenticated
    if (userId) {
      await this.repository.saveSearchHistory(userId, MapSearchType.GEOCODING, request.query)
    }

    return this.formatResponse(sorted, request.page || 1)
  }

  async searchNearby(
    query: string,
    center: { lat: number; lng: number },
    radius?: number,
    userId?: string,
  ): Promise<GeocodingResponse> {
    const centerCoords = CoordinatesVO.create(center.lat, center.lng)

    const request: GeocodingRequest = {
      query,
      coordinate: center,
    }

    const response = await this.execute(request, userId)

    // Filter by radius if specified
    if (radius) {
      response.locations = response.locations.filter(
        loc => loc.distance !== undefined && loc.distance <= radius,
      )
    }

    return response
  }

  private formatResponse(locations: GeocodedLocation[], page: number): GeocodingResponse {
    return {
      locations: locations.map(loc => ({
        coordinates: {
          lat: loc.coordinates.lat,
          lng: loc.coordinates.lng,
        },
        roadAddress: loc.address.roadAddress,
        jibunAddress: loc.address.jibunAddress,
        englishAddress: loc.address.englishAddress,
        components: loc.address.components,
        distance: loc.distance,
      })),
      total: locations.length,
      page,
    }
  }
}