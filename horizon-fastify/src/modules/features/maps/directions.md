Node.js TypeScript 모듈로 Naver Maps Directions API를 구현하는 상세한 방법을 제공하겠습니다.

## 프로젝트 설정

### 2. TypeScript 설정 (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 모듈 구현

### 1. 타입 정의 (src/types/directions.types.ts)

```typescript
// 요청 파라미터 타입
export interface DirectionsRequest {
  start: Coordinates;
  goal: Coordinates | Coordinates[];
  waypoints?: Coordinates[];
  option?: RouteOption | RouteOption[];
  cartype?: CarType;
  fueltype?: FuelType;
  mileage?: number;
  lang?: Language;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type RouteOption =
  | "trafast" // 실시간 빠른 길
  | "tracomfort" // 실시간 편한 길
  | "traoptimal" // 실시간 최적
  | "traavoidtoll" // 무료 우선
  | "traavoidcaronly"; // 자동차 전용 도로 회피

export type CarType = 1 | 2 | 3 | 4 | 5 | 6;

export type FuelType = "gasoline" | "highgradegasoline" | "diesel" | "lpg";

export type Language = "ko" | "en" | "ja" | "zh";

// 응답 타입
export interface DirectionsResponse {
  code: number;
  message: string;
  currentDateTime: string;
  route: RouteResponse;
}

export interface RouteResponse {
  [option: string]: Route[];
}

export interface Route {
  summary: RouteSummary;
  path: number[][];
  section: Section[];
  guide: Guide[];
}

export interface RouteSummary {
  start: LocationInfo;
  goal: LocationInfo;
  distance: number;
  duration: number;
  departureTime: string;
  bbox: number[][];
  tollFare: number;
  taxiFare: number;
  fuelPrice: number;
}

export interface LocationInfo {
  location: number[];
  dir?: number;
}

export interface Section {
  pointIndex: number;
  pointCount: number;
  distance: number;
  name: string;
  congestion: number;
  speed: number;
}

export interface Guide {
  pointIndex: number;
  type: number;
  instructions: string;
  distance: number;
  duration: number;
}

// 처리된 결과 타입
export interface ProcessedRoute {
  distanceMeters: number;
  distanceKm: string;
  durationMs: number;
  durationMinutes: number;
  durationFormatted: string;
  arrivalTime: string;
  tollFare: number;
  taxiFare: number;
  fuelPrice: number;
  totalCost: number;
  mainRoads: string[];
  turnByTurn: SimplifiedGuide[];
}

export interface SimplifiedGuide {
  instruction: string;
  distance: number;
  type: string;
}
```

### 2. API 클라이언트 (src/services/NaverMapsClient.ts)

```typescript
import axios, { AxiosInstance, AxiosError } from "axios";
import {
  DirectionsRequest,
  DirectionsResponse,
  Coordinates,
  ProcessedRoute,
} from "../types/directions.types";

export class NaverMapsClient {
  private client: AxiosInstance;
  private apiKeyId: string;
  private apiKey: string;

  constructor(apiKeyId: string, apiKey: string) {
    this.apiKeyId = apiKeyId;
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: "https://maps.apigw.ntruss.com",
      timeout: 10000,
      headers: {
        "x-ncp-apigw-api-key-id": apiKeyId,
        "x-ncp-apigw-api-key": apiKey,
      },
    });

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  /**
   * 두 지점 간 경로 조회
   */
  async getDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    const params = this.buildParams(request);

    const response = await this.client.get<DirectionsResponse>(
      "/map-direction/v1/driving",
      { params }
    );

    return response.data;
  }

  /**
   * 간단한 거리와 시간 조회
   */
  async getDistanceAndTime(
    start: Coordinates,
    goal: Coordinates
  ): Promise<ProcessedRoute> {
    const response = await this.getDirections({
      start,
      goal,
      option: "traoptimal",
    });

    return this.processRoute(response);
  }

  /**
   * 여러 목적지 중 최적 경로 찾기
   */
  async findBestRoute(
    start: Coordinates,
    goals: Coordinates[]
  ): Promise<ProcessedRoute> {
    const response = await this.getDirections({
      start,
      goal: goals,
      option: "traoptimal",
    });

    return this.processRoute(response);
  }

  /**
   * 경유지를 포함한 경로 조회
   */
  async getRouteWithWaypoints(
    start: Coordinates,
    goal: Coordinates,
    waypoints: Coordinates[]
  ): Promise<ProcessedRoute> {
    const response = await this.getDirections({
      start,
      goal,
      waypoints,
      option: "traoptimal",
    });

    return this.processRoute(response);
  }

  /**
   * 요청 파라미터 빌드
   */
  private buildParams(request: DirectionsRequest): Record<string, string> {
    const params: Record<string, string> = {
      start: `${request.start.lng},${request.start.lat}`,
      goal: this.formatGoal(request.goal),
    };

    if (request.waypoints && request.waypoints.length > 0) {
      params.waypoints = this.formatWaypoints(request.waypoints);
    }

    if (request.option) {
      params.option = Array.isArray(request.option)
        ? request.option.join(":")
        : request.option;
    }

    if (request.cartype) params.cartype = String(request.cartype);
    if (request.fueltype) params.fueltype = request.fueltype;
    if (request.mileage) params.mileage = String(request.mileage);
    if (request.lang) params.lang = request.lang;

    return params;
  }

  /**
   * 목적지 포맷팅
   */
  private formatGoal(goal: Coordinates | Coordinates[]): string {
    if (Array.isArray(goal)) {
      return goal.map((g) => `${g.lng},${g.lat}`).join(":");
    }
    return `${goal.lng},${goal.lat}`;
  }

  /**
   * 경유지 포맷팅
   */
  private formatWaypoints(waypoints: Coordinates[]): string {
    return waypoints.map((w) => `${w.lng},${w.lat}`).join("|");
  }

  /**
   * 응답 데이터 처리
   */
  private processRoute(response: DirectionsResponse): ProcessedRoute {
    if (response.code !== 0) {
      throw new Error(`API Error: ${response.message}`);
    }

    // 첫 번째 옵션의 첫 번째 경로 사용
    const routeKey = Object.keys(response.route)[0];
    const route = response.route[routeKey][0];
    const summary = route.summary;

    return {
      distanceMeters: summary.distance,
      distanceKm: (summary.distance / 1000).toFixed(2),
      durationMs: summary.duration,
      durationMinutes: Math.round(summary.duration / 60000),
      durationFormatted: this.formatDuration(summary.duration),
      arrivalTime: summary.departureTime,
      tollFare: summary.tollFare || 0,
      taxiFare: summary.taxiFare || 0,
      fuelPrice: summary.fuelPrice || 0,
      totalCost: (summary.tollFare || 0) + (summary.fuelPrice || 0),
      mainRoads: route.section.map((s) => s.name),
      turnByTurn: route.guide.map((g) => ({
        instruction: g.instructions,
        distance: g.distance,
        type: this.getGuideType(g.type),
      })),
    };
  }

  /**
   * 시간 포맷팅
   */
  private formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  }

  /**
   * 안내 타입 변환
   */
  private getGuideType(type: number): string {
    const types: Record<number, string> = {
      1: "직진",
      2: "좌회전",
      3: "우회전",
      6: "유턴",
      87: "경유지",
      88: "도착지",
      121: "톨게이트",
    };
    return types[type] || "안내";
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
            `잘못된 요청: ${data.message || "파라미터를 확인하세요"}`
          );
        case 401:
          throw new Error("인증 실패: API 키를 확인하세요");
        case 429:
          throw new Error("요청 한도 초과: 잠시 후 다시 시도하세요");
        case 500:
          throw new Error("서버 오류: 잠시 후 다시 시도하세요");
        default:
          throw new Error(`API 오류: ${data.message || "알 수 없는 오류"}`);
      }
    } else if (error.request) {
      throw new Error("네트워크 오류: 인터넷 연결을 확인하세요");
    } else {
      throw new Error(`요청 설정 오류: ${error.message}`);
    }
  }
}
```

### 3. 유틸리티 함수 (src/utils/helpers.ts)

```typescript
import { Coordinates } from "../types/directions.types";

/**
 * 두 지점 간 직선 거리 계산 (Haversine formula)
 */
export function calculateStraightDistance(
  start: Coordinates,
  end: Coordinates
): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = toRad(end.lat - start.lat);
  const dLon = toRad(end.lng - start.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(start.lat)) *
      Math.cos(toRad(end.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 좌표 유효성 검증
 */
export function validateCoordinates(coord: Coordinates): boolean {
  return (
    coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180
  );
}

/**
 * 여러 지점의 중심점 계산
 */
export function getCenterPoint(coordinates: Coordinates[]): Coordinates {
  const sumLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
  const sumLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);

  return {
    lat: sumLat / coordinates.length,
    lng: sumLng / coordinates.length,
  };
}
```

### 4. 환경 설정 (.env)

```env
NAVER_API_KEY_ID=your_api_key_id
NAVER_API_KEY=your_api_key
```

### 5. 메인 모듈 (src/index.ts)

```typescript
import { NaverMapsClient } from "./services/NaverMapsClient";
import { Coordinates } from "./types/directions.types";
import * as dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

// 클라이언트 생성 및 export
export const createNaverMapsClient = (
  apiKeyId?: string,
  apiKey?: string
): NaverMapsClient => {
  const keyId = apiKeyId || process.env.NAVER_API_KEY_ID;
  const key = apiKey || process.env.NAVER_API_KEY;

  if (!keyId || !key) {
    throw new Error("API 키가 설정되지 않았습니다");
  }

  return new NaverMapsClient(keyId, key);
};

// 타입 재export
export * from "./types/directions.types";
export { NaverMapsClient } from "./services/NaverMapsClient";
export * from "./utils/helpers";
```

### 6. 사용 예제 (examples/usage.ts)

```typescript
import { createNaverMapsClient, Coordinates } from "../src";

async function main() {
  // 클라이언트 초기화
  const client = createNaverMapsClient();

  // 서울역에서 부산역까지
  const start: Coordinates = { lat: 37.5547, lng: 126.9707 };
  const goal: Coordinates = { lat: 35.1148, lng: 129.042 };

  try {
    // 1. 간단한 거리와 시간 조회
    console.log("=== 기본 경로 조회 ===");
    const route = await client.getDistanceAndTime(start, goal);
    console.log(`거리: ${route.distanceKm}km`);
    console.log(`시간: ${route.durationFormatted}`);
    console.log(`통행료: ${route.tollFare}원`);
    console.log(`유류비: ${route.fuelPrice}원`);
    console.log(`주요 도로: ${route.mainRoads.join(" → ")}`);

    // 2. 경유지 포함 경로
    console.log("\n=== 경유지 포함 경로 ===");
    const waypoint: Coordinates = { lat: 36.3504, lng: 127.3845 }; // 대전
    const routeWithWaypoints = await client.getRouteWithWaypoints(start, goal, [
      waypoint,
    ]);
    console.log(`경유지 포함 거리: ${routeWithWaypoints.distanceKm}km`);

    // 3. 여러 목적지 중 최적 경로
    console.log("\n=== 최적 목적지 찾기 ===");
    const goals: Coordinates[] = [
      { lat: 35.1796, lng: 129.0756 }, // 부산 해운대
      { lat: 35.1148, lng: 129.042 }, // 부산역
      { lat: 35.098, lng: 128.8544 }, // 부산 서면
    ];
    const bestRoute = await client.findBestRoute(start, goals);
    console.log(
      `최적 경로: ${bestRoute.distanceKm}km, ${bestRoute.durationFormatted}`
    );

    // 4. 턴바이턴 안내 (처음 5개만)
    console.log("\n=== 턴바이턴 안내 ===");
    route.turnByTurn.slice(0, 5).forEach((guide, index) => {
      console.log(`${index + 1}. ${guide.instruction} (${guide.distance}m)`);
    });
  } catch (error) {
    console.error("오류 발생:", error);
  }
}

// 실행
main();
```

### 7. package.json 스크립트

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "nodemon --exec ts-node src/index.ts",
    "start": "node dist/index.js",
    "example": "ts-node examples/usage.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  }
}
```

## 모듈 배포 준비

### 1. 패키지 설정 (package.json)

```json
{
  "name": "naver-maps-directions",
  "version": "1.0.0",
  "description": "TypeScript module for Naver Maps Directions API",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "keywords": ["naver", "maps", "directions", "navigation", "typescript"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/naver-maps-directions"
  }
}
```

### 2. 사용 방법

```typescript
// 설치
// npm install naver-maps-directions

import { createNaverMapsClient } from "naver-maps-directions";

const client = createNaverMapsClient("API_KEY_ID", "API_KEY");

// 비동기 함수에서 사용
async function getRoute() {
  const result = await client.getDistanceAndTime(
    { lat: 37.5547, lng: 126.9707 },
    { lat: 35.1148, lng: 129.042 }
  );

  console.log(result);
}
```

이 TypeScript 모듈은 타입 안전성, 에러 처리, 그리고 사용하기 쉬운 API를 제공합니다. 필요에 따라 추가 기능을 확장할 수 있습니다.
