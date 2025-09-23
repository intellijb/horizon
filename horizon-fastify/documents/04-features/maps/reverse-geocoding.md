Naver Maps Reverse Geocoding API를 위한 완전한 TypeScript 모듈을 제공하겠습니다.

## Reverse Geocoding 모듈 구현

### 1. Reverse Geocoding 타입 정의 (src/types/reverse-geocoding.types.ts)

```typescript
// 좌표계 타입
export type CoordinateSystem =
  | "EPSG:4326" // WGS84 경위도 (기본값)
  | "EPSG:3857" // 구글 맵
  | "NHN:2048"; // UTM-K

// 변환 타입
export type OrderType =
  | "legalcode" // 법정동
  | "admcode" // 행정동
  | "addr" // 지번 주소
  | "roadaddr"; // 도로명 주소

// 요청 타입
export interface ReverseGeocodingRequest {
  coords: Coordinates;
  sourcecrs?: CoordinateSystem;
  targetcrs?: CoordinateSystem;
  orders?: OrderType | OrderType[];
  output?: "xml" | "json";
  callback?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// 응답 타입
export interface ReverseGeocodingResponse {
  status: ResponseStatus;
  results: ReverseGeocodingResult[];
}

export interface ResponseStatus {
  code: number;
  name: string;
  message: string;
}

export interface ReverseGeocodingResult {
  name: OrderType;
  code: CodeInfo;
  region: RegionInfo;
  land?: LandInfo;
}

export interface CodeInfo {
  id: string;
  type: "L" | "A" | "S"; // L: 법정동, A: 행정동, S: 동일명 행정동
  mappingId: string;
}

export interface RegionInfo {
  area0: AreaInfo; // 국가
  area1: AreaInfo; // 시/도
  area2: AreaInfo; // 시/군/구
  area3: AreaInfo; // 읍/면/동
  area4: AreaInfo; // 리
}

export interface AreaInfo {
  name: string;
  coords: {
    center: {
      crs: string;
      x: number;
      y: number;
    };
  };
  alias?: string;
}

export interface LandInfo {
  type?: string; // 지적 타입 (1: 일반토지, 2: 산)
  name?: string; // 도로명
  number1?: string; // 본번호 또는 건물번호
  number2?: string; // 부번호
  addition0?: AdditionInfo; // 건물 정보
  addition1?: AdditionInfo; // 우편번호
  addition2?: AdditionInfo; // 도로 코드
  coords?: {
    center: {
      crs: string;
      x: number;
      y: number;
    };
  };
}

export interface AdditionInfo {
  type: string;
  value: string;
}

// 처리된 응답 타입
export interface ProcessedReverseGeocodingResult {
  legalAddress?: ProcessedAddress;
  adminAddress?: ProcessedAddress;
  jibunAddress?: ProcessedAddress;
  roadAddress?: ProcessedAddress;
  coordinates: Coordinates;
  postalCode?: string;
  buildingName?: string;
  fullAddress: string;
}

export interface ProcessedAddress {
  type: "legal" | "admin" | "jibun" | "road";
  codeId: string;
  codeType: string;
  region: {
    country: string;
    sido: string;
    sigungu: string;
    dongmyun: string;
    ri?: string;
  };
  detail?: {
    landType?: string;
    mainNumber?: string;
    subNumber?: string;
    roadName?: string;
    buildingNumber?: string;
  };
  formatted: string;
}
```

### 2. Reverse Geocoding 서비스 (src/services/ReverseGeocodingService.ts)

```typescript
import axios, { AxiosInstance, AxiosError } from "axios";
import {
  ReverseGeocodingRequest,
  ReverseGeocodingResponse,
  ProcessedReverseGeocodingResult,
  ProcessedAddress,
  Coordinates,
  OrderType,
  CoordinateSystem,
  ReverseGeocodingResult,
} from "../types/reverse-geocoding.types";

export class ReverseGeocodingService {
  private client: AxiosInstance;
  private cache: Map<string, ReverseGeocodingResponse>;
  private cacheTimeout: number = 3600000; // 1시간

  constructor(
    private apiKeyId: string,
    private apiKey: string,
    private enableCache: boolean = true
  ) {
    this.cache = new Map();

    this.client = axios.create({
      baseURL: "https://maps.apigw.ntruss.com",
      timeout: 10000,
      headers: {
        "x-ncp-apigw-api-key-id": apiKeyId,
        "x-ncp-apigw-api-key": apiKey,
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  /**
   * 기본 Reverse Geocoding (모든 주소 타입 반환)
   */
  async reverseGeocode(
    coordinates: Coordinates
  ): Promise<ProcessedReverseGeocodingResult> {
    const request: ReverseGeocodingRequest = {
      coords: coordinates,
      orders: ["legalcode", "admcode", "addr", "roadaddr"],
      output: "json",
    };

    const response = await this.lookup(request);
    return this.processResponse(response, coordinates);
  }

  /**
   * 특정 주소 타입만 조회
   */
  async reverseGeocodeByType(
    coordinates: Coordinates,
    orderType: OrderType
  ): Promise<ProcessedAddress | null> {
    const request: ReverseGeocodingRequest = {
      coords: coordinates,
      orders: [orderType],
      output: "json",
    };

    const response = await this.lookup(request);
    const processed = this.processResponse(response, coordinates);

    switch (orderType) {
      case "legalcode":
        return processed.legalAddress || null;
      case "admcode":
        return processed.adminAddress || null;
      case "addr":
        return processed.jibunAddress || null;
      case "roadaddr":
        return processed.roadAddress || null;
      default:
        return null;
    }
  }

  /**
   * 다른 좌표계 지원
   */
  async reverseGeocodeWithCRS(
    coordinates: Coordinates,
    sourceCRS: CoordinateSystem,
    targetCRS?: CoordinateSystem
  ): Promise<ProcessedReverseGeocodingResult> {
    const request: ReverseGeocodingRequest = {
      coords: coordinates,
      sourcecrs: sourceCRS,
      targetcrs: targetCRS || sourceCRS,
      orders: ["legalcode", "admcode", "addr", "roadaddr"],
      output: "json",
    };

    const response = await this.lookup(request);
    return this.processResponse(response, coordinates);
  }

  /**
   * 배치 처리
   */
  async reverseGeocodeBatch(
    coordinatesList: Coordinates[]
  ): Promise<ProcessedReverseGeocodingResult[]> {
    const promises = coordinatesList.map((coords) =>
      this.reverseGeocode(coords).catch((error) => {
        console.error(`Failed for ${coords.lat},${coords.lng}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter(
      (r) => r !== null
    ) as ProcessedReverseGeocodingResult[];
  }

  /**
   * 가장 가까운 주소 찾기
   */
  async findNearestAddress(coordinates: Coordinates): Promise<string | null> {
    try {
      const result = await this.reverseGeocode(coordinates);
      return result.fullAddress;
    } catch (error) {
      // 해상이나 주소가 없는 지역
      return null;
    }
  }

  /**
   * API 호출
   */
  private async lookup(
    request: ReverseGeocodingRequest
  ): Promise<ReverseGeocodingResponse> {
    const cacheKey = this.getCacheKey(request);

    // 캐시 확인
    if (this.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const params = this.buildParams(request);
    const response = await this.client.get<ReverseGeocodingResponse>(
      "/map-reversegeocode/v2/gc",
      { params }
    );

    // 성공 응답 캐싱
    if (response.data.status.code === 0 && this.enableCache) {
      this.cache.set(cacheKey, response.data);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
    }

    return response.data;
  }

  /**
   * 요청 파라미터 빌드
   */
  private buildParams(
    request: ReverseGeocodingRequest
  ): Record<string, string> {
    const params: Record<string, string> = {
      coords: `${request.coords.lng},${request.coords.lat}`,
    };

    if (request.sourcecrs) {
      params.sourcecrs = request.sourcecrs;
    }

    if (request.targetcrs) {
      params.targetcrs = request.targetcrs;
    }

    if (request.orders) {
      const orders = Array.isArray(request.orders)
        ? request.orders
        : [request.orders];
      params.orders = orders.join(",");
    }

    params.output = request.output || "json";

    if (request.callback) {
      params.callback = request.callback;
    }

    return params;
  }

  /**
   * 응답 처리
   */
  private processResponse(
    response: ReverseGeocodingResponse,
    coordinates: Coordinates
  ): ProcessedReverseGeocodingResult {
    if (response.status.code !== 0) {
      if (response.status.code === 3) {
        throw new Error("주소를 찾을 수 없습니다 (해상 또는 주소 없는 지역)");
      }
      throw new Error(`Reverse geocoding failed: ${response.status.message}`);
    }

    const result: ProcessedReverseGeocodingResult = {
      coordinates,
      fullAddress: "",
    };

    response.results.forEach((item) => {
      const processed = this.processResultItem(item);

      switch (item.name) {
        case "legalcode":
          result.legalAddress = processed;
          break;
        case "admcode":
          result.adminAddress = processed;
          break;
        case "addr":
          result.jibunAddress = processed;
          break;
        case "roadaddr":
          result.roadAddress = processed;
          if (item.land?.addition1?.value) {
            result.postalCode = item.land.addition1.value;
          }
          if (item.land?.addition0?.value) {
            result.buildingName = item.land.addition0.value;
          }
          break;
      }
    });

    // 우선순위: 도로명 > 지번 > 행정동 > 법정동
    result.fullAddress =
      result.roadAddress?.formatted ||
      result.jibunAddress?.formatted ||
      result.adminAddress?.formatted ||
      result.legalAddress?.formatted ||
      "주소 없음";

    return result;
  }

  /**
   * 개별 결과 처리
   */
  private processResultItem(item: ReverseGeocodingResult): ProcessedAddress {
    const region = {
      country: item.region.area0.name || "kr",
      sido: item.region.area1.name || "",
      sigungu: item.region.area2.name || "",
      dongmyun: item.region.area3.name || "",
      ri: item.region.area4?.name || undefined,
    };

    let formatted = "";
    let detail: ProcessedAddress["detail"] = {};

    switch (item.name) {
      case "legalcode":
      case "admcode":
        formatted = this.formatRegionAddress(region);
        break;

      case "addr":
        if (item.land) {
          detail = {
            landType: item.land.type === "2" ? "산" : "",
            mainNumber: item.land.number1,
            subNumber: item.land.number2,
          };
          const landPrefix = detail.landType ? "산 " : "";
          const landNumber = detail.subNumber
            ? `${detail.mainNumber}-${detail.subNumber}`
            : detail.mainNumber || "";
          formatted = `${this.formatRegionAddress(
            region
          )} ${landPrefix}${landNumber}`.trim();
        }
        break;

      case "roadaddr":
        if (item.land) {
          detail = {
            roadName: item.land.name,
            buildingNumber: item.land.number1,
          };
          formatted = `${this.formatRegionAddress(region, false)} ${
            detail.roadName || ""
          } ${detail.buildingNumber || ""}`.trim();
        }
        break;
    }

    return {
      type: this.mapOrderTypeToAddressType(item.name),
      codeId: item.code.id,
      codeType: item.code.type,
      region,
      detail,
      formatted,
    };
  }

  /**
   * 지역 주소 포맷팅
   */
  private formatRegionAddress(
    region: ProcessedAddress["region"],
    includeRi: boolean = true
  ): string {
    const parts = [];

    if (region.sido) parts.push(region.sido);
    if (region.sigungu) parts.push(region.sigungu);
    if (region.dongmyun) parts.push(region.dongmyun);
    if (includeRi && region.ri) parts.push(region.ri);

    return parts.join(" ");
  }

  /**
   * 주소 타입 매핑
   */
  private mapOrderTypeToAddressType(
    orderType: OrderType
  ): ProcessedAddress["type"] {
    switch (orderType) {
      case "legalcode":
        return "legal";
      case "admcode":
        return "admin";
      case "addr":
        return "jibun";
      case "roadaddr":
        return "road";
      default:
        return "legal";
    }
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(request: ReverseGeocodingRequest): string {
    return JSON.stringify({
      coords: request.coords,
      orders: request.orders,
      sourcecrs: request.sourcecrs,
      targetcrs: request.targetcrs,
    });
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 에러 핸들링
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 400:
          throw new Error("잘못된 요청: 좌표를 확인하세요");
        case 401:
          throw new Error("인증 실패: API 키를 확인하세요");
        case 500:
          throw new Error("서버 오류: 잠시 후 다시 시도하세요");
        default:
          throw new Error(
            `API 오류: ${data?.status?.message || "알 수 없는 오류"}`
          );
      }
    } else {
      throw new Error("네트워크 오류");
    }
  }
}
```

### 3. 통합 지오코딩 서비스 (src/services/FullGeocodingService.ts)

```typescript
import { GeocodingService } from "./GeocodingService";
import { ReverseGeocodingService } from "./ReverseGeocodingService";
import {
  Coordinates,
  ProcessedAddress as GeocodedAddress,
} from "../types/geocoding.types";
import { ProcessedReverseGeocodingResult } from "../types/reverse-geocoding.types";

export class FullGeocodingService {
  private geocoding: GeocodingService;
  private reverseGeocoding: ReverseGeocodingService;

  constructor(apiKeyId: string, apiKey: string) {
    this.geocoding = new GeocodingService(apiKeyId, apiKey);
    this.reverseGeocoding = new ReverseGeocodingService(apiKeyId, apiKey);
  }

  /**
   * 주소 ↔ 좌표 양방향 변환
   */
  async convert(input: string | Coordinates): Promise<{
    type: "forward" | "reverse";
    input: string | Coordinates;
    result: GeocodedAddress[] | ProcessedReverseGeocodingResult;
  }> {
    if (typeof input === "string") {
      // Forward geocoding
      const result = await this.geocoding.geocode(input);
      return {
        type: "forward",
        input,
        result,
      };
    } else {
      // Reverse geocoding
      const result = await this.reverseGeocoding.reverseGeocode(input);
      return {
        type: "reverse",
        input,
        result,
      };
    }
  }

  /**
   * 주소 정규화
   */
  async normalizeAddress(address: string): Promise<string> {
    // 주소를 좌표로 변환
    const geocoded = await this.geocoding.geocode(address);

    if (geocoded.length === 0) {
      throw new Error("주소를 찾을 수 없습니다");
    }

    // 좌표를 다시 주소로 변환하여 정규화된 주소 획득
    const reversed = await this.reverseGeocoding.reverseGeocode(
      geocoded[0].coordinates
    );

    return reversed.fullAddress;
  }

  /**
   * 주소 검증
   */
  async validateAddress(address: string): Promise<{
    isValid: boolean;
    normalized?: string;
    suggestions?: string[];
    coordinates?: Coordinates;
  }> {
    try {
      const results = await this.geocoding.geocode(address);

      if (results.length === 0) {
        return {
          isValid: false,
          suggestions: [],
        };
      }

      const reversed = await this.reverseGeocoding.reverseGeocode(
        results[0].coordinates
      );

      return {
        isValid: true,
        normalized: reversed.fullAddress,
        suggestions: results.slice(1, 4).map((r) => r.roadAddress),
        coordinates: results[0].coordinates,
      };
    } catch (error) {
      return {
        isValid: false,
      };
    }
  }

  /**
   * 좌표 간 주소 비교
   */
  async compareLocations(
    coord1: Coordinates,
    coord2: Coordinates
  ): Promise<{
    location1: ProcessedReverseGeocodingResult;
    location2: ProcessedReverseGeocodingResult;
    sameDong: boolean;
    sameGu: boolean;
    sameSido: boolean;
    distance: number;
  }> {
    const [loc1, loc2] = await Promise.all([
      this.reverseGeocoding.reverseGeocode(coord1),
      this.reverseGeocoding.reverseGeocode(coord2),
    ]);

    const distance = this.calculateDistance(coord1, coord2);

    return {
      location1: loc1,
      location2: loc2,
      sameDong:
        loc1.adminAddress?.region.dongmyun ===
        loc2.adminAddress?.region.dongmyun,
      sameGu:
        loc1.adminAddress?.region.sigungu === loc2.adminAddress?.region.sigungu,
      sameSido:
        loc1.adminAddress?.region.sido === loc2.adminAddress?.region.sido,
      distance,
    };
  }

  /**
   * 거리 계산 (Haversine)
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // 미터
    const φ1 = (coord1.lat * Math.PI) / 180;
    const φ2 = (coord2.lat * Math.PI) / 180;
    const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
```

### 4. 사용 예제 (examples/reverse-geocoding-usage.ts)

```typescript
import { ReverseGeocodingService } from "../src/services/ReverseGeocodingService";
import { FullGeocodingService } from "../src/services/FullGeocodingService";
import * as dotenv from "dotenv";

dotenv.config();

async function reverseGeocodingExamples() {
  const service = new ReverseGeocodingService(
    process.env.NAVER_API_KEY_ID!,
    process.env.NAVER_API_KEY!
  );

  console.log("=== 기본 Reverse Geocoding ===");
  const coordinates = { lat: 37.3595963, lng: 127.1054328 };
  const result = await service.reverseGeocode(coordinates);

  console.log(`좌표: ${coordinates.lat}, ${coordinates.lng}`);
  console.log(`전체 주소: ${result.fullAddress}`);
  console.log(`우편번호: ${result.postalCode || "없음"}`);
  console.log(`건물명: ${result.buildingName || "없음"}`);

  if (result.roadAddress) {
    console.log(`도로명 주소: ${result.roadAddress.formatted}`);
  }
  if (result.jibunAddress) {
    console.log(`지번 주소: ${result.jibunAddress.formatted}`);
  }

  console.log("\n=== 특정 주소 타입만 조회 ===");
  const legalAddr = await service.reverseGeocodeByType(
    coordinates,
    "legalcode"
  );
  console.log(`법정동: ${legalAddr?.formatted}`);

  console.log("\n=== 배치 처리 ===");
  const batchCoords = [
    { lat: 37.5665, lng: 126.978 }, // 서울시청
    { lat: 37.5512, lng: 126.9882 }, // 남산타워
    { lat: 37.5145, lng: 127.0595 }, // 코엑스
  ];

  const batchResults = await service.reverseGeocodeBatch(batchCoords);
  batchResults.forEach((res, idx) => {
    console.log(`${idx + 1}. ${res.fullAddress}`);
  });

  console.log("\n=== 해상 좌표 처리 ===");
  const seaCoords = { lat: 37.5666, lng: 125.9913 }; // 서해상
  try {
    const seaResult = await service.findNearestAddress(seaCoords);
    console.log(`결과: ${seaResult || "주소 없음"}`);
  } catch (error) {
    console.log("해상 지역: 주소를 찾을 수 없습니다");
  }
}

async function fullGeocodingExamples() {
  const service = new FullGeocodingService(
    process.env.NAVER_API_KEY_ID!,
    process.env.NAVER_API_KEY!
  );

  console.log("\n=== 주소 정규화 ===");
  const messyAddress = "서울 강남구 테헤란로 212";
  const normalized = await service.normalizeAddress(messyAddress);
  console.log(`입력: ${messyAddress}`);
  console.log(`정규화: ${normalized}`);

  console.log("\n=== 주소 검증 ===");
  const validation = await service.validateAddress("강남역");
  console.log(`유효성: ${validation.isValid}`);
  console.log(`정규화된 주소: ${validation.normalized}`);
  console.log(`제안: ${validation.suggestions?.join(", ")}`);

  console.log("\n=== 좌표 간 비교 ===");
  const coord1 = { lat: 37.4979, lng: 127.0276 }; // 강남역
  const coord2 = { lat: 37.5133, lng: 127.1003 }; // 잠실역

  const comparison = await service.compareLocations(coord1, coord2);
  console.log(`위치 1: ${comparison.location1.fullAddress}`);
  console.log(`위치 2: ${comparison.location2.fullAddress}`);
  console.log(`같은 동?: ${comparison.sameDong}`);
  console.log(`같은 구?: ${comparison.sameGu}`);
  console.log(`거리: ${Math.round(comparison.distance)}m`);
}

// 실행
async function main() {
  try {
    await reverseGeocodingExamples();
    await fullGeocodingExamples();
  } catch (error) {
    console.error("오류:", error);
  }
}

main();
```

이 모듈은 Reverse Geocoding API의 모든 기능을 타입 안전하게 구현하며, 좌표계 변환, 배치 처리, 주소 정규화, 검증 등의 고급 기능을 제공합니다.
