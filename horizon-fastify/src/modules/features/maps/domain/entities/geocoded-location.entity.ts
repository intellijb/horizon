import { CoordinatesVO } from "../value-objects/coordinates.value"
import { AddressVO } from "../value-objects/address.value"

export interface GeocodedLocationEntity {
  id?: string
  coordinates: CoordinatesVO
  address: AddressVO
  distance?: number
  placeId?: string
  placeName?: string
  category?: string
  createdAt?: Date
}

export class GeocodedLocation implements GeocodedLocationEntity {
  constructor(
    public readonly coordinates: CoordinatesVO,
    public readonly address: AddressVO,
    public readonly distance?: number,
    public readonly placeId?: string,
    public readonly placeName?: string,
    public readonly category?: string,
    public readonly id?: string,
    public readonly createdAt?: Date,
  ) {}

  static create(data: GeocodedLocationEntity): GeocodedLocation {
    return new GeocodedLocation(
      data.coordinates,
      data.address,
      data.distance,
      data.placeId,
      data.placeName,
      data.category,
      data.id,
      data.createdAt,
    )
  }

  toJSON() {
    return {
      id: this.id,
      coordinates: {
        lat: this.coordinates.lat,
        lng: this.coordinates.lng,
      },
      address: {
        roadAddress: this.address.roadAddress,
        jibunAddress: this.address.jibunAddress,
        englishAddress: this.address.englishAddress,
        components: this.address.components,
        formatted: this.address.formatted,
      },
      distance: this.distance,
      placeId: this.placeId,
      placeName: this.placeName,
      category: this.category,
      createdAt: this.createdAt,
    }
  }
}