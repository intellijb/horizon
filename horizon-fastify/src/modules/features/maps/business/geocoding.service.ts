import { CoordinatesVO } from "../domain/value-objects/coordinates.value"
import { Address } from "../domain/value-objects/address.value"
import { GeocodedLocation } from "../domain/entities/geocoded-location.entity"
import { MapsConstants } from "../constants/maps.constants"

export class GeocodingService {
  /**
   * Process raw geocoding response from API
   */
  processGeocodingResponse(response: any): GeocodedLocation[] {
    if (response.status !== "OK") {
      throw new Error(`Geocoding failed: ${response.errorMessage || response.status}`)
    }

    return response.addresses.map((addr: any) => {
      const coords = CoordinatesVO.create(
        parseFloat(addr.y),
        parseFloat(addr.x),
      )

      const components = this.extractAddressComponents(addr.addressElements)

      const address = Address.create({
        roadAddress: addr.roadAddress,
        jibunAddress: addr.jibunAddress,
        englishAddress: addr.englishAddress,
        components,
      })

      return GeocodedLocation.create({
        coordinates: coords,
        address,
        distance: addr.distance,
      })
    })
  }

  /**
   * Process reverse geocoding response
   */
  processReverseGeocodingResponse(response: any, coordinates: CoordinatesVO): GeocodedLocation {
    if (response.status.code !== 0) {
      if (response.status.code === 3) {
        throw new Error("No address found (ocean or no address area)")
      }
      throw new Error(`Reverse geocoding failed: ${response.status.message}`)
    }

    let roadAddress: string | undefined
    let jibunAddress: string | undefined
    let postalCode: string | undefined
    let buildingName: string | undefined

    const components: any = {
      sido: "",
      sigungu: "",
      dongmyun: "",
      ri: "",
    }

    response.results.forEach((item: any) => {
      const region = item.region
      components.sido = region.area1.name || ""
      components.sigungu = region.area2.name || ""
      components.dongmyun = region.area3.name || ""
      components.ri = region.area4?.name || ""

      switch (item.name) {
        case "roadaddr":
          if (item.land) {
            roadAddress = `${this.formatRegion(components)} ${item.land.name || ""} ${item.land.number1 || ""}`.trim()
            postalCode = item.land.addition1?.value
            buildingName = item.land.addition0?.value
            components.roadName = item.land.name
            components.buildingNumber = item.land.number1
          }
          break
        case "addr":
          if (item.land) {
            const landPrefix = item.land.type === "2" ? "산 " : ""
            const landNumber = item.land.number2
              ? `${item.land.number1}-${item.land.number2}`
              : item.land.number1 || ""
            jibunAddress = `${this.formatRegion(components)} ${landPrefix}${landNumber}`.trim()
            components.landNumber = landNumber
          }
          break
      }
    })

    components.postalCode = postalCode
    components.buildingName = buildingName

    const address = Address.create({
      roadAddress,
      jibunAddress,
      components,
    })

    return GeocodedLocation.create({
      coordinates,
      address,
      placeName: buildingName,
    })
  }

  /**
   * Validate search query
   */
  validateQuery(query: string): void {
    if (!query || query.trim().length < 2) {
      throw new Error("Search query must be at least 2 characters")
    }
    if (query.length > 200) {
      throw new Error("Search query too long")
    }
  }

  /**
   * Calculate address similarity score
   */
  calculateSimilarity(query: string, address: string): number {
    const normalizedQuery = query.replace(/\s+/g, "").toLowerCase()
    const normalizedAddress = address.replace(/\s+/g, "").toLowerCase()

    let matches = 0
    for (let i = 0; i < normalizedQuery.length; i++) {
      if (normalizedAddress.includes(normalizedQuery[i])) {
        matches++
      }
    }

    return matches / normalizedQuery.length
  }

  /**
   * Sort locations by distance
   */
  sortByDistance(locations: GeocodedLocation[]): GeocodedLocation[] {
    return [...locations].sort((a, b) => {
      if (a.distance === undefined) return 1
      if (b.distance === undefined) return -1
      return a.distance - b.distance
    })
  }

  private extractAddressComponents(elements: any[]): any {
    const components: any = {}

    const typeMapping: Record<string, string> = {
      SIDO: "sido",
      SIGUGUN: "sigungu",
      DONGMYUN: "dongmyun",
      RI: "ri",
      ROAD_NAME: "roadName",
      BUILDING_NUMBER: "buildingNumber",
      BUILDING_NAME: "buildingName",
      LAND_NUMBER: "landNumber",
      POSTAL_CODE: "postalCode",
    }

    elements.forEach((element) => {
      element.types.forEach((type: string) => {
        const key = typeMapping[type]
        if (key && element.longName) {
          components[key] = element.longName
        }
      })
    })

    return components
  }

  private formatRegion(components: any): string {
    const parts: string[] = []
    if (components.sido) parts.push(components.sido)
    if (components.sigungu) parts.push(components.sigungu)
    if (components.dongmyun) parts.push(components.dongmyun)
    if (components.ri) parts.push(components.ri)
    return parts.join(" ")
  }
}