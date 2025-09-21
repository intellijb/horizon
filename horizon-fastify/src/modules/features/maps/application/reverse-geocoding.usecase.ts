import { NaverMapsApiPort, OrderType } from "../domain/ports/naver-maps-api.port"
import { MapsRepositoryPort } from "../domain/ports/maps-repository.port"
import { GeocodedLocation } from "../domain/entities/geocoded-location.entity"
import { CoordinatesVO } from "../domain/value-objects/coordinates.value"
import { GeocodingService } from "../business/geocoding.service"
import { MapSearchType } from "../constants/maps.constants"

export interface ReverseGeocodingRequest {
  lat: number
  lng: number
  orders?: OrderType[]
}

export interface ReverseGeocodingResponse {
  coordinates: { lat: number; lng: number }
  roadAddress?: string
  jibunAddress?: string
  legalAddress?: string
  adminAddress?: string
  components: any
  postalCode?: string
  buildingName?: string
  fullAddress: string
}

export class ReverseGeocodingUseCase {
  private geocodingService: GeocodingService

  constructor(
    private repository: MapsRepositoryPort,
    private naverMapsApi: NaverMapsApiPort,
  ) {
    this.geocodingService = new GeocodingService()
  }

  async execute(request: ReverseGeocodingRequest, userId?: string): Promise<ReverseGeocodingResponse> {
    const coordinates = CoordinatesVO.create(request.lat, request.lng)

    // Check cache first
    const cached = await this.repository.findGeocodedLocationByCoords(coordinates)
    if (cached) {
      return this.formatResponse(cached, coordinates)
    }

    // Build API request
    const apiRequest = {
      coords: coordinates,
      orders: request.orders || ["legalcode", "admcode", "addr", "roadaddr"],
      output: "json" as const,
    }

    // Call Naver Maps API
    const apiResponse = await this.naverMapsApi.reverseGeocode(apiRequest)

    // Process response
    const location = this.geocodingService.processReverseGeocodingResponse(apiResponse, coordinates)

    // Cache result
    await this.repository.saveGeocodedLocation(location)

    // Save search history if user is authenticated
    if (userId) {
      await this.repository.saveSearchHistory(
        userId,
        MapSearchType.REVERSE,
        `${request.lat},${request.lng}`,
      )
    }

    return this.formatResponse(location, coordinates)
  }

  async findNearestAddress(lat: number, lng: number, userId?: string): Promise<string | null> {
    try {
      const result = await this.execute({ lat, lng }, userId)
      return result.fullAddress
    } catch (error) {
      // Ocean or no address area
      return null
    }
  }

  async batchReverseGeocode(
    coordinates: Array<{ lat: number; lng: number }>,
    userId?: string,
  ): Promise<ReverseGeocodingResponse[]> {
    const promises = coordinates.map(coord =>
      this.execute(coord, userId).catch(error => {
        console.error(`Failed for ${coord.lat},${coord.lng}:`, error)
        return null
      }),
    )

    const results = await Promise.all(promises)
    return results.filter(r => r !== null) as ReverseGeocodingResponse[]
  }

  private formatResponse(location: GeocodedLocation, coordinates: CoordinatesVO): ReverseGeocodingResponse {
    const components = location.address.components

    return {
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
      roadAddress: location.address.roadAddress,
      jibunAddress: location.address.jibunAddress,
      legalAddress: components.dongmyun ? `${components.sido} ${components.sigungu} ${components.dongmyun}` : undefined,
      adminAddress: components.dongmyun ? `${components.sido} ${components.sigungu} ${components.dongmyun}` : undefined,
      components,
      postalCode: components.postalCode,
      buildingName: components.buildingName,
      fullAddress: location.address.formatted || location.address.roadAddress || location.address.jibunAddress || "주소 없음",
    }
  }
}