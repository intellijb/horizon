export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState: string;
}

export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4
}

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2
}