export interface Coordinates {
  lat: number
  lng: number
}

export class CoordinatesVO implements Coordinates {
  constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {
    this.validate()
  }

  static create(lat: number, lng: number): CoordinatesVO {
    return new CoordinatesVO(lat, lng)
  }

  static fromString(coordString: string): CoordinatesVO {
    const [lng, lat] = coordString.split(",").map(Number)
    return new CoordinatesVO(lat, lng)
  }

  private validate(): void {
    // Korea coordinates bounds validation
    if (this.lat < 33 || this.lat > 39) {
      throw new Error("Invalid latitude for Korean region")
    }
    if (this.lng < 124 || this.lng > 132) {
      throw new Error("Invalid longitude for Korean region")
    }
  }

  toString(): string {
    return `${this.lng},${this.lat}`
  }

  toArray(): [number, number] {
    return [this.lng, this.lat]
  }

  distanceTo(other: CoordinatesVO): number {
    const R = 6371000 // Earth radius in meters
    const φ1 = (this.lat * Math.PI) / 180
    const φ2 = (other.lat * Math.PI) / 180
    const Δφ = ((other.lat - this.lat) * Math.PI) / 180
    const Δλ = ((other.lng - this.lng) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }
}