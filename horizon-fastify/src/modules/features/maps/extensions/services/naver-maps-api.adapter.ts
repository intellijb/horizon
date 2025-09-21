import axios, { AxiosInstance, AxiosError } from "axios"
import {
  NaverMapsApiPort,
  DirectionsRequest,
  GeocodingRequest,
  ReverseGeocodingRequest,
} from "../../domain/ports/naver-maps-api.port"
import { MapsConstants } from "../../constants/maps.constants"

export class NaverMapsApiAdapter implements NaverMapsApiPort {
  private client: AxiosInstance
  private apiKeyId: string
  private apiKey: string

  constructor() {
    this.apiKeyId = process.env.NAVER_API_KEY_ID || "dummy-key-id"
    this.apiKey = process.env.NAVER_API_KEY || "dummy-key"

    // Log warning if API keys are not configured
    if (this.apiKeyId === "dummy-key-id" || this.apiKey === "dummy-key") {
      console.warn("⚠️ Naver Maps API keys not configured. Set NAVER_API_KEY_ID and NAVER_API_KEY environment variables.")
    }

    this.client = axios.create({
      baseURL: MapsConstants.NAVER_MAPS_BASE_URL,
      timeout: MapsConstants.API_TIMEOUT,
      headers: {
        "x-ncp-apigw-api-key-id": this.apiKeyId,
        "x-ncp-apigw-api-key": this.apiKey,
        Accept: "application/json",
      },
    })

    this.client.interceptors.response.use(
      response => response,
      this.handleError,
    )
  }

  async getDirections(request: DirectionsRequest): Promise<any> {
    const params = this.buildDirectionsParams(request)

    const response = await this.client.get("/map-direction/v1/driving", { params })

    return response.data
  }

  async geocode(request: GeocodingRequest): Promise<any> {
    const params = this.buildGeocodingParams(request)

    const response = await this.client.get("/map-geocode/v2/geocode", { params })

    return response.data
  }

  async reverseGeocode(request: ReverseGeocodingRequest): Promise<any> {
    const params = this.buildReverseGeocodingParams(request)

    const response = await this.client.get("/map-reversegeocode/v2/gc", { params })

    return response.data
  }

  private buildDirectionsParams(request: DirectionsRequest): Record<string, string> {
    const params: Record<string, string> = {
      start: request.start.toString(),
      goal: Array.isArray(request.goal)
        ? request.goal.map(g => g.toString()).join(":")
        : request.goal.toString(),
    }

    if (request.waypoints && request.waypoints.length > 0) {
      params.waypoints = request.waypoints.map(w => w.toString()).join("|")
    }

    if (request.option) {
      params.option = Array.isArray(request.option)
        ? request.option.join(":")
        : request.option
    }

    if (request.cartype) params.cartype = String(request.cartype)
    if (request.fueltype) params.fueltype = request.fueltype
    if (request.mileage) params.mileage = String(request.mileage)
    if (request.lang) params.lang = request.lang

    return params
  }

  private buildGeocodingParams(request: GeocodingRequest): Record<string, string> {
    const params: Record<string, string> = {
      query: request.query,
    }

    if (request.coordinate) {
      params.coordinate = request.coordinate.toString()
    }

    if (request.filter) {
      params.filter = `${request.filter.type}@${request.filter.codes.join(";")}`
    }

    if (request.language) {
      params.language = request.language
    }

    if (request.page) {
      params.page = String(request.page)
    }

    if (request.count) {
      params.count = String(Math.min(request.count, MapsConstants.MAX_SEARCH_RESULTS))
    }

    return params
  }

  private buildReverseGeocodingParams(request: ReverseGeocodingRequest): Record<string, string> {
    const params: Record<string, string> = {
      coords: request.coords.toString(),
    }

    if (request.sourcecrs) {
      params.sourcecrs = request.sourcecrs
    }

    if (request.targetcrs) {
      params.targetcrs = request.targetcrs
    }

    if (request.orders) {
      const orders = Array.isArray(request.orders) ? request.orders : [request.orders]
      params.orders = orders.join(",")
    }

    params.output = request.output || "json"

    return params
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data as any

      switch (status) {
        case 400:
          throw new Error(`Bad request: ${data?.message || data?.errorMessage || "Invalid parameters"}`)
        case 401:
          throw new Error(MapsConstants.ERRORS.INVALID_API_KEY)
        case 429:
          throw new Error(MapsConstants.ERRORS.RATE_LIMIT_EXCEEDED)
        case 500:
          throw new Error(`Server error: ${data?.message || "Please try again later"}`)
        default:
          throw new Error(`${MapsConstants.ERRORS.API_ERROR}: ${data?.message || "Unknown error"}`)
      }
    } else if (error.request) {
      throw new Error(MapsConstants.ERRORS.NETWORK_ERROR)
    } else {
      throw new Error(`Request error: ${error.message}`)
    }
  }
}