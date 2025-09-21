import { CoordinatesVO } from "../value-objects/coordinates.value"

export interface RouteSegment {
  pointIndex: number
  pointCount: number
  distance: number
  name: string
  congestion: number
  speed: number
}

export interface RouteGuide {
  pointIndex: number
  type: number
  instructions: string
  distance: number
  duration: number
}

export interface RouteEntity {
  id?: string
  start: CoordinatesVO
  goal: CoordinatesVO
  waypoints?: CoordinatesVO[]
  distanceMeters: number
  durationMs: number
  tollFare: number
  taxiFare: number
  fuelPrice: number
  path?: number[][]
  segments?: RouteSegment[]
  guides?: RouteGuide[]
  createdAt?: Date
}

export class Route implements RouteEntity {
  constructor(
    public readonly start: CoordinatesVO,
    public readonly goal: CoordinatesVO,
    public readonly distanceMeters: number,
    public readonly durationMs: number,
    public readonly tollFare: number,
    public readonly taxiFare: number,
    public readonly fuelPrice: number,
    public readonly waypoints?: CoordinatesVO[],
    public readonly path?: number[][],
    public readonly segments?: RouteSegment[],
    public readonly guides?: RouteGuide[],
    public readonly id?: string,
    public readonly createdAt?: Date,
  ) {}

  static create(data: RouteEntity): Route {
    return new Route(
      data.start,
      data.goal,
      data.distanceMeters,
      data.durationMs,
      data.tollFare,
      data.taxiFare,
      data.fuelPrice,
      data.waypoints,
      data.path,
      data.segments,
      data.guides,
      data.id,
      data.createdAt,
    )
  }

  get distanceKm(): number {
    return this.distanceMeters / 1000
  }

  get durationMinutes(): number {
    return Math.round(this.durationMs / 60000)
  }

  get durationFormatted(): string {
    const hours = Math.floor(this.durationMs / 3600000)
    const minutes = Math.floor((this.durationMs % 3600000) / 60000)
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
  }

  get totalCost(): number {
    return this.tollFare + this.fuelPrice
  }

  getMainRoads(): string[] {
    return this.segments?.map(s => s.name).filter(Boolean) || []
  }

  getTurnByTurnInstructions(): Array<{ instruction: string; distance: number; type: string }> {
    if (!this.guides) return []

    return this.guides.map(guide => ({
      instruction: guide.instructions,
      distance: guide.distance,
      type: this.getGuideType(guide.type),
    }))
  }

  private getGuideType(type: number): string {
    const types: Record<number, string> = {
      1: "직진",
      2: "좌회전",
      3: "우회전",
      6: "유턴",
      87: "경유지",
      88: "도착지",
      121: "톨게이트",
    }
    return types[type] || "안내"
  }
}