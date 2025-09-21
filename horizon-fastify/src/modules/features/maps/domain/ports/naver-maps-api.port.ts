import { CoordinatesVO } from "../value-objects/coordinates.value"

export type RouteOption = "trafast" | "tracomfort" | "traoptimal" | "traavoidtoll" | "traavoidcaronly"
export type CarType = 1 | 2 | 3 | 4 | 5 | 6
export type FuelType = "gasoline" | "highgradegasoline" | "diesel" | "lpg"
export type Language = "ko" | "en" | "ja" | "zh"
export type OrderType = "legalcode" | "admcode" | "addr" | "roadaddr"
export type CoordinateSystem = "EPSG:4326" | "EPSG:3857" | "NHN:2048"

export interface DirectionsRequest {
  start: CoordinatesVO
  goal: CoordinatesVO | CoordinatesVO[]
  waypoints?: CoordinatesVO[]
  option?: RouteOption | RouteOption[]
  cartype?: CarType
  fueltype?: FuelType
  mileage?: number
  lang?: Language
}

export interface GeocodingRequest {
  query: string
  coordinate?: CoordinatesVO
  filter?: {
    type: "HCODE" | "BCODE"
    codes: string[]
  }
  language?: "kor" | "eng"
  page?: number
  count?: number
}

export interface ReverseGeocodingRequest {
  coords: CoordinatesVO
  sourcecrs?: CoordinateSystem
  targetcrs?: CoordinateSystem
  orders?: OrderType | OrderType[]
  output?: "xml" | "json"
}

export interface NaverMapsApiPort {
  // Directions API
  getDirections(request: DirectionsRequest): Promise<any>

  // Geocoding API
  geocode(request: GeocodingRequest): Promise<any>

  // Reverse Geocoding API
  reverseGeocode(request: ReverseGeocodingRequest): Promise<any>
}