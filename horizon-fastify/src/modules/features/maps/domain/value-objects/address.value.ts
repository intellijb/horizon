export interface AddressComponents {
  sido?: string // 시/도
  sigungu?: string // 시/구/군
  dongmyun?: string // 동/면
  ri?: string // 리
  roadName?: string // 도로명
  buildingNumber?: string // 건물 번호
  buildingName?: string // 건물 이름
  landNumber?: string // 번지
  postalCode?: string // 우편번호
}

export interface AddressVO {
  roadAddress?: string
  jibunAddress?: string
  englishAddress?: string
  components: AddressComponents
  formatted: string
}

export class Address implements AddressVO {
  constructor(
    public readonly roadAddress: string | undefined,
    public readonly jibunAddress: string | undefined,
    public readonly englishAddress: string | undefined,
    public readonly components: AddressComponents,
    public readonly formatted: string,
  ) {}

  static create(data: {
    roadAddress?: string
    jibunAddress?: string
    englishAddress?: string
    components: AddressComponents
  }): Address {
    const formatted = data.roadAddress || data.jibunAddress || ""
    return new Address(
      data.roadAddress,
      data.jibunAddress,
      data.englishAddress,
      data.components,
      formatted,
    )
  }

  getSimpleAddress(): string {
    const parts: string[] = []
    if (this.components.sido) parts.push(this.components.sido)
    if (this.components.sigungu) parts.push(this.components.sigungu)
    if (this.components.dongmyun) parts.push(this.components.dongmyun)
    return parts.join(" ")
  }

  getPostalAddress(): string {
    const postal = this.components.postalCode ? `[${this.components.postalCode}] ` : ""
    return `${postal}${this.roadAddress || this.jibunAddress || ""}`
  }
}