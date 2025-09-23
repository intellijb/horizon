Naver Maps Geocoding API를 위한 완전한 TypeScript 모듈을 제공하겠습니다.

## Geocoding 모듈 구조

### 1. Geocoding 타입 정의 (src/types/geocoding.types.ts)

```typescript
// Geocoding 요청 타입
export interface GeocodingRequest {
  query: string;
  coordinate?: Coordinates;
  filter?: GeocodingFilter;
  language?: GeocodingLanguage;
  page?: number;
  count?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingFilter {
  type: "HCODE" | "BCODE";
  codes: string[];
}

export type GeocodingLanguage = "kor" | "eng";

// Geocoding 응답 타입
export interface GeocodingResponse {
  status: "OK" | "INVALID_REQUEST" | "SYSTEM_ERROR";
  meta: GeocodingMeta;
  addresses: Address[];
  errorMessage?: string;
}

export interface GeocodingMeta {
  totalCount: number;
  page: number;
  count: number;
}

export interface Address {
  roadAddress: string;
  jibunAddress: string;
  englishAddress: string;
  addressElements: AddressElement[];
  x: string; // 경도
  y: string; // 위도
  distance?: number;
}

export interface AddressElement {
  types: AddressElementType[];
  longName: string;
  shortName: string;
  code: string;
}

export type AddressElementType =
  | "SIDO" // 시/도
  | "SIGUGUN" // 시/구/군
  | "DONGMYUN" // 동/면
  | "RI" // 리
  | "ROAD_NAME" // 도로명
  | "BUILDING_NUMBER" // 건물 번호
  | "BUILDING_NAME" // 건물 이름
  | "LAND_NUMBER" // 번지
  | "POSTAL_CODE"; // 우편번호

// 처리된 주소 타입
export interface ProcessedAddress {
  roadAddress: string;
  jibunAddress: string;
  englishAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distance?: number;
  postalCode?: string;
  buildingName?: string;
  detailedAddress: DetailedAddress;
}

export interface DetailedAddress {
  sido?: string; // 시/도
  sigugun?: string; // 시/구/군
  dongmyun?: string; // 동/면
  ri?: string; // 리
  roadName?: string; // 도로명
  buildingNumber?: string; // 건물 번호
  buildingName?: string; // 건물 이름
  landNumber?: string; // 번지
  postalCode?: string; // 우편번호
}
```

### 2. Geocoding 서비스 클래스 (src/services/GeocodingService.ts)

```typescript
import axios, { AxiosInstance, AxiosError } from "axios";
import {
  GeocodingRequest,
  GeocodingResponse,
  ProcessedAddress,
  DetailedAddress,
  AddressElementType,
  Coordinates,
} from "../types/geocoding.types";

export class GeocodingService {
  private client: AxiosInstance;
  private cache: Map<string, GeocodingResponse>;
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
        Accept: "application/json",
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  /**
   * 주소를 좌표로 변환 (Geocoding)
   */
  async geocode(address: string): Promise<ProcessedAddress[]> {
    const request: GeocodingRequest = {
      query: address,
      language: "kor",
    };

    const response = await this.search(request);
    return this.processAddresses(response);
  }

  /**
   * 좌표를 주소로 변환 (Reverse Geocoding)
   * 주의: 이 API는 일반 geocoding만 지원합니다.
   * Reverse geocoding은 별도의 API 엔드포인트가 필요합니다.
   */
  async reverseGeocode(coordinates: Coordinates): Promise<ProcessedAddress[]> {
    // Reverse geocoding을 위해서는 별도의 /reverse-geocode 엔드포인트 필요
    throw new Error("Reverse geocoding requires separate API endpoint");
  }

  /**
   * 상세 검색
   */
  async search(request: GeocodingRequest): Promise<GeocodingResponse> {
    const cacheKey = this.getCacheKey(request);

    // 캐시 확인
    if (this.enableCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached;
    }

    const params = this.buildParams(request);
    const response = await this.client.get<GeocodingResponse>(
      "/map-geocode/v2/geocode",
      { params }
    );

    // 성공 응답 캐싱
    if (response.data.status === "OK" && this.enableCache) {
      this.cache.set(cacheKey, response.data);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
    }

    return response.data;
  }

  /**
   * 근처 주소 검색
   */
  async searchNearby(
    query: string,
    center: Coordinates,
    radius?: number
  ): Promise<ProcessedAddress[]> {
    const request: GeocodingRequest = {
      query,
      coordinate: center,
      language: "kor",
    };

    const response = await this.search(request);
    let addresses = this.processAddresses(response);

    // 거리 필터링 (옵션)
    if (radius) {
      addresses = addresses.filter(
        (addr) => addr.distance !== undefined && addr.distance <= radius
      );
    }

    return addresses;
  }

  /**
   * 행정구역 필터링 검색
   */
  async searchWithFilter(
    query: string,
    filterType: "HCODE" | "BCODE",
    codes: string[]
  ): Promise<ProcessedAddress[]> {
    const request: GeocodingRequest = {
      query,
      filter: {
        type: filterType,
        codes,
      },
      language: "kor",
    };

    const response = await this.search(request);
    return this.processAddresses(response);
  }

  /**
   * 영문 주소 검색
   */
  async searchEnglish(query: string): Promise<ProcessedAddress[]> {
    const request: GeocodingRequest = {
      query,
      language: "eng",
    };

    const response = await this.search(request);
    return this.processAddresses(response);
  }

  /**
   * 페이징 검색
   */
  async searchWithPaging(
    query: string,
    page: number = 1,
    count: number = 10
  ): Promise<{
    addresses: ProcessedAddress[];
    meta: {
      totalCount: number;
      page: number;
      count: number;
      totalPages: number;
    };
  }> {
    const request: GeocodingRequest = {
      query,
      page,
      count: Math.min(count, 100), // 최대 100개
    };

    const response = await this.search(request);
    const addresses = this.processAddresses(response);

    return {
      addresses,
      meta: {
        ...response.meta,
        totalPages: Math.ceil(response.meta.totalCount / count),
      },
    };
  }

  /**
   * 요청 파라미터 빌드
   */
  private buildParams(request: GeocodingRequest): Record<string, string> {
    const params: Record<string, string> = {
      query: request.query,
    };

    if (request.coordinate) {
      params.coordinate = `${request.coordinate.lng},${request.coordinate.lat}`;
    }

    if (request.filter) {
      params.filter = `${request.filter.type}@${request.filter.codes.join(
        ";"
      )}`;
    }

    if (request.language) {
      params.language = request.language;
    }

    if (request.page) {
      params.page = String(request.page);
    }

    if (request.count) {
      params.count = String(Math.min(request.count, 100));
    }

    return params;
  }

  /**
   * 응답 처리
   */
  private processAddresses(response: GeocodingResponse): ProcessedAddress[] {
    if (response.status !== "OK") {
      throw new Error(
        `Geocoding failed: ${response.errorMessage || response.status}`
      );
    }

    return response.addresses.map((address) => {
      const detailed = this.extractDetailedAddress(address.addressElements);

      return {
        roadAddress: address.roadAddress,
        jibunAddress: address.jibunAddress,
        englishAddress: address.englishAddress,
        coordinates: {
          lat: parseFloat(address.y),
          lng: parseFloat(address.x),
        },
        distance: address.distance,
        postalCode: detailed.postalCode,
        buildingName: detailed.buildingName,
        detailedAddress: detailed,
      };
    });
  }

  /**
   * 상세 주소 추출
   */
  private extractDetailedAddress(elements: any[]): DetailedAddress {
    const detailed: DetailedAddress = {};

    const typeMapping: Record<AddressElementType, keyof DetailedAddress> = {
      SIDO: "sido",
      SIGUGUN: "sigugun",
      DONGMYUN: "dongmyun",
      RI: "ri",
      ROAD_NAME: "roadName",
      BUILDING_NUMBER: "buildingNumber",
      BUILDING_NAME: "buildingName",
      LAND_NUMBER: "landNumber",
      POSTAL_CODE: "postalCode",
    };

    elements.forEach((element) => {
      element.types.forEach((type: AddressElementType) => {
        const key = typeMapping[type];
        if (key && element.longName) {
          detailed[key] = element.longName;
        }
      });
    });

    return detailed;
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(request: GeocodingRequest): string {
    return JSON.stringify({
      query: request.query,
      coordinate: request.coordinate,
      filter: request.filter,
      language: request.language,
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
          throw new Error(
            `잘못된 요청: ${data.errorMessage || "검색어를 확인하세요"}`
          );
        case 401:
          throw new Error("인증 실패: API 키를 확인하세요");
        case 429:
          throw new Error("요청 한도 초과: 잠시 후 다시 시도하세요");
        case 500:
          throw new Error(
            `서버 오류: ${data.errorMessage || "잠시 후 다시 시도하세요"}`
          );
        default:
          throw new Error(
            `API 오류: ${data.errorMessage || "알 수 없는 오류"}`
          );
      }
    } else if (error.request) {
      throw new Error("네트워크 오류: 인터넷 연결을 확인하세요");
    } else {
      throw new Error(`요청 설정 오류: ${error.message}`);
    }
  }
}
```

### 3. 유틸리티 함수 (src/utils/geocoding.utils.ts)

```typescript
import { ProcessedAddress, Coordinates } from "../types/geocoding.types";

/**
 * 주소 포맷터
 */
export class AddressFormatter {
  /**
   * 간단한 주소 포맷
   */
  static formatSimple(address: ProcessedAddress): string {
    const parts = [];

    if (address.detailedAddress.sido) {
      parts.push(address.detailedAddress.sido);
    }
    if (address.detailedAddress.sigugun) {
      parts.push(address.detailedAddress.sigugun);
    }
    if (address.detailedAddress.dongmyun) {
      parts.push(address.detailedAddress.dongmyun);
    }

    return parts.join(" ");
  }

  /**
   * 상세 주소 포맷
   */
  static formatDetailed(address: ProcessedAddress): string {
    return address.roadAddress || address.jibunAddress;
  }

  /**
   * 우편 주소 포맷
   */
  static formatPostal(address: ProcessedAddress): string {
    const postal = address.postalCode ? `[${address.postalCode}] ` : "";
    return `${postal}${address.roadAddress}`;
  }
}

/**
 * 좌표 유효성 검증
 */
export function validateCoordinates(coord: Coordinates): boolean {
  // 대한민국 좌표 범위
  const isValidLat = coord.lat >= 33 && coord.lat <= 39;
  const isValidLng = coord.lng >= 124 && coord.lng <= 132;

  return isValidLat && isValidLng;
}

/**
 * 주소 유사도 계산
 */
export function calculateAddressSimilarity(
  query: string,
  address: ProcessedAddress
): number {
  const normalizedQuery = query.replace(/\s+/g, "").toLowerCase();
  const normalizedAddress = address.roadAddress
    .replace(/\s+/g, "")
    .toLowerCase();

  let matches = 0;
  for (let i = 0; i < normalizedQuery.length; i++) {
    if (normalizedAddress.includes(normalizedQuery[i])) {
      matches++;
    }
  }

  return matches / normalizedQuery.length;
}

/**
 * 주소 목록 정렬
 */
export function sortAddressesByDistance(
  addresses: ProcessedAddress[]
): ProcessedAddress[] {
  return [...addresses].sort((a, b) => {
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });
}

/**
 * 주소 중복 제거
 */
export function deduplicateAddresses(
  addresses: ProcessedAddress[]
): ProcessedAddress[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    const key = `${addr.coordinates.lat},${addr.coordinates.lng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

### 4. 통합 클라이언트 (src/services/NaverMapsFullClient.ts)

```typescript
import { NaverMapsClient } from "./NaverMapsClient";
import { GeocodingService } from "./GeocodingService";
import { DirectionsRequest, ProcessedRoute } from "../types/directions.types";
import {
  GeocodingRequest,
  ProcessedAddress,
  Coordinates,
} from "../types/geocoding.types";

export class NaverMapsFullClient {
  private directions: NaverMapsClient;
  private geocoding: GeocodingService;

  constructor(apiKeyId: string, apiKey: string) {
    this.directions = new NaverMapsClient(apiKeyId, apiKey);
    this.geocoding = new GeocodingService(apiKeyId, apiKey);
  }

  /**
   * 주소로 경로 찾기
   */
  async findRouteByAddress(
    startAddress: string,
    endAddress: string
  ): Promise<{
    route: ProcessedRoute;
    startLocation: ProcessedAddress;
    endLocation: ProcessedAddress;
  }> {
    // 주소를 좌표로 변환
    const [startResults, endResults] = await Promise.all([
      this.geocoding.geocode(startAddress),
      this.geocoding.geocode(endAddress),
    ]);

    if (startResults.length === 0) {
      throw new Error(`출발지 주소를 찾을 수 없습니다: ${startAddress}`);
    }
    if (endResults.length === 0) {
      throw new Error(`도착지 주소를 찾을 수 없습니다: ${endAddress}`);
    }

    const startLocation = startResults[0];
    const endLocation = endResults[0];

    // 경로 검색
    const route = await this.directions.getDistanceAndTime(
      startLocation.coordinates,
      endLocation.coordinates
    );

    return {
      route,
      startLocation,
      endLocation,
    };
  }

  /**
   * 근처 POI로 경로 찾기
   */
  async findRouteToNearbyPlace(
    start: Coordinates,
    placeQuery: string,
    maxDistance?: number
  ): Promise<{
    route: ProcessedRoute;
    destination: ProcessedAddress;
  }> {
    // 근처 장소 검색
    const places = await this.geocoding.searchNearby(
      placeQuery,
      start,
      maxDistance
    );

    if (places.length === 0) {
      throw new Error(`근처에 "${placeQuery}"를 찾을 수 없습니다`);
    }

    // 가장 가까운 장소 선택
    const destination = places[0];

    // 경로 검색
    const route = await this.directions.getDistanceAndTime(
      start,
      destination.coordinates
    );

    return {
      route,
      destination,
    };
  }

  /**
   * 다중 경유지 주소 경로
   */
  async findRouteWithAddressWaypoints(
    startAddress: string,
    endAddress: string,
    waypointAddresses: string[]
  ): Promise<{
    route: ProcessedRoute;
    locations: {
      start: ProcessedAddress;
      end: ProcessedAddress;
      waypoints: ProcessedAddress[];
    };
  }> {
    // 모든 주소를 병렬로 지오코딩
    const addressPromises = [
      this.geocoding.geocode(startAddress),
      this.geocoding.geocode(endAddress),
      ...waypointAddresses.map((addr) => this.geocoding.geocode(addr)),
    ];

    const results = await Promise.all(addressPromises);

    // 결과 검증
    results.forEach((result, index) => {
      if (result.length === 0) {
        const addressType =
          index === 0
            ? "출발지"
            : index === 1
            ? "도착지"
            : `경유지 ${index - 1}`;
        throw new Error(`${addressType} 주소를 찾을 수 없습니다`);
      }
    });

    const start = results[0][0];
    const end = results[1][0];
    const waypoints = results.slice(2).map((r) => r[0]);

    // 경로 검색
    const route = await this.directions.getRouteWithWaypoints(
      start.coordinates,
      end.coordinates,
      waypoints.map((w) => w.coordinates)
    );

    return {
      route,
      locations: {
        start,
        end,
        waypoints,
      },
    };
  }

  /**
   * 지역 내 최적 경로 찾기
   */
  async findOptimalRouteInArea(
    start: Coordinates,
    destinationQuery: string,
    areaCode?: string
  ): Promise<{
    route: ProcessedRoute;
    destinations: ProcessedAddress[];
    selected: ProcessedAddress;
  }> {
    // 지역 필터링된 검색
    let destinations: ProcessedAddress[];

    if (areaCode) {
      destinations = await this.geocoding.searchWithFilter(
        destinationQuery,
        "HCODE",
        [areaCode]
      );
    } else {
      destinations = await this.geocoding.geocode(destinationQuery);
    }

    if (destinations.length === 0) {
      throw new Error(`"${destinationQuery}"를 찾을 수 없습니다`);
    }

    // 여러 목적지 중 최적 경로 찾기
    const route = await this.directions.findBestRoute(
      start,
      destinations.map((d) => d.coordinates)
    );

    // 선택된 목적지 찾기
    const selected =
      destinations.find(
        (d) => Math.abs(d.coordinates.lat - route.arrivalTime) < 0.0001
      ) || destinations[0];

    return {
      route,
      destinations,
      selected,
    };
  }
}
```

### 5. 사용 예제 (examples/geocoding-usage.ts)

```typescript
import { GeocodingService } from "../src/services/GeocodingService";
import { NaverMapsFullClient } from "../src/services/NaverMapsFullClient";
import { AddressFormatter } from "../src/utils/geocoding.utils";
import * as dotenv from "dotenv";

dotenv.config();

async function geocodingExamples() {
  const geocoding = new GeocodingService(
    process.env.NAVER_API_KEY_ID!,
    process.env.NAVER_API_KEY!
  );

  console.log("=== 기본 지오코딩 ===");
  const addresses = await geocoding.geocode("분당구 불정로 6");

  addresses.forEach((addr, index) => {
    console.log(`\n결과 ${index + 1}:`);
    console.log(`도로명: ${addr.roadAddress}`);
    console.log(`지번: ${addr.jibunAddress}`);
    console.log(`좌표: ${addr.coordinates.lat}, ${addr.coordinates.lng}`);
    console.log(`우편번호: ${addr.postalCode}`);
    console.log(`건물명: ${addr.buildingName}`);
    console.log(`간단 주소: ${AddressFormatter.formatSimple(addr)}`);
  });

  console.log("\n=== 근처 검색 ===");
  const nearby = await geocoding.searchNearby(
    "스타벅스",
    { lat: 37.3595, lng: 127.1054 },
    1000 // 1km 반경
  );

  console.log(`1km 내 스타벅스: ${nearby.length}개 발견`);
  nearby.slice(0, 3).forEach((place) => {
    console.log(`- ${place.roadAddress} (${place.distance}m)`);
  });

  console.log("\n=== 영문 주소 검색 ===");
  const englishAddresses = await geocoding.searchEnglish("Gangnam");
  console.log(`영문 검색 결과: ${englishAddresses[0].englishAddress}`);

  console.log("\n=== 페이징 검색 ===");
  const pagedResult = await geocoding.searchWithPaging("강남", 1, 5);
  console.log(`전체 결과: ${pagedResult.meta.totalCount}개`);
  console.log(
    `현재 페이지: ${pagedResult.meta.page}/${pagedResult.meta.totalPages}`
  );
}

async function integratedExamples() {
  const client = new NaverMapsFullClient(
    process.env.NAVER_API_KEY_ID!,
    process.env.NAVER_API_KEY!
  );

  console.log("\n=== 주소로 경로 찾기 ===");
  const routeResult = await client.findRouteByAddress("서울역", "부산역");

  console.log(`출발: ${routeResult.startLocation.roadAddress}`);
  console.log(`도착: ${routeResult.endLocation.roadAddress}`);
  console.log(`거리: ${routeResult.route.distanceKm}km`);
  console.log(`시간: ${routeResult.route.durationFormatted}`);

  console.log("\n=== 근처 장소로 경로 ===");
  const nearbyRoute = await client.findRouteToNearbyPlace(
    { lat: 37.5547, lng: 126.9707 },
    "편의점",
    500
  );

  console.log(`가장 가까운 편의점: ${nearbyRoute.destination.roadAddress}`);
  console.log(`거리: ${nearbyRoute.route.distanceMeters}m`);
  console.log(
    `도보 시간: ${Math.round(nearbyRoute.route.distanceMeters / 80)}분`
  );
}

// 실행
async function main() {
  try {
    await geocodingExamples();
    await integratedExamples();
  } catch (error) {
    console.error("오류:", error);
  }
}

main();
```

### 6. 패키지 설정 업데이트 (package.json)

```json
{
  "name": "naver-maps-sdk",
  "version": "2.0.0",
  "description": "Complete TypeScript SDK for Naver Maps API (Directions & Geocoding)",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "nodemon --exec ts-node src/index.ts",
    "test:geocoding": "ts-node examples/geocoding-usage.ts",
    "test:directions": "ts-node examples/directions-usage.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "keywords": [
    "naver",
    "maps",
    "geocoding",
    "directions",
    "navigation",
    "typescript",
    "korea"
  ]
}
```

### 7. 통합 export (src/index.ts)

```typescript
// Services
export { NaverMapsClient } from "./services/NaverMapsClient";
export { GeocodingService } from "./services/GeocodingService";
export { NaverMapsFullClient } from "./services/NaverMapsFullClient";

// Types
export * from "./types/directions.types";
export * from "./types/geocoding.types";

// Utils
export * from "./utils/helpers";
export * from "./utils/geocoding.utils";

// Factory function
export const createNaverMapsSDK = (apiKeyId: string, apiKey: string) => ({
  directions: new NaverMapsClient(apiKeyId, apiKey),
  geocoding: new GeocodingService(apiKeyId, apiKey),
  full: new NaverMapsFullClient(apiKeyId, apiKey),
});
```

이 모듈은 Geocoding과 Directions API를 완벽하게 통합하여 주소-좌표 변환, 경로 검색, 그리고 두 기능을 결합한 고급 기능들을 제공합니다. 타입 안전성, 에러 처리, 캐싱, 그리고 다양한 헬퍼 함수들이 포함되어 있습니다.
