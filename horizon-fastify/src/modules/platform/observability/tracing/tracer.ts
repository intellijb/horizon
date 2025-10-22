import { SpanContext, SpanKind, SpanStatusCode } from './types';

export interface ITracer {
  startSpan(name: string, options?: SpanOptions): ISpan;
  getCurrentSpan(): ISpan | undefined;
  withSpan<T>(span: ISpan, fn: () => T): T;
  inject(context: SpanContext, carrier: any): void;
  extract(carrier: any): SpanContext | undefined;
}

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, any>;
  parent?: ISpan | SpanContext;
  startTime?: Date;
}

export interface ISpan {
  readonly spanContext: SpanContext;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: Date;
  endTime?: Date;
  readonly attributes: Record<string, any>;
  readonly events: SpanEvent[];
  readonly status: SpanStatus;

  setAttribute(key: string, value: any): void;
  setAttributes(attributes: Record<string, any>): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  setStatus(status: SpanStatus): void;
  end(endTime?: Date): void;
  isRecording(): boolean;
}

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes?: Record<string, any>;
}

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

class SimpleSpan implements ISpan {
  readonly spanContext: SpanContext;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: Date;
  endTime?: Date;
  readonly attributes: Record<string, any> = {};
  readonly events: SpanEvent[] = [];
  status: SpanStatus = { code: SpanStatusCode.UNSET };
  private recording = true;

  constructor(name: string, context: SpanContext, options?: SpanOptions) {
    this.name = name;
    this.spanContext = context;
    this.kind = options?.kind || SpanKind.INTERNAL;
    this.startTime = options?.startTime || new Date();

    if (options?.attributes) {
      this.attributes = { ...options.attributes };
    }
  }

  setAttribute(key: string, value: any): void {
    if (!this.isRecording()) return;
    this.attributes[key] = value;
  }

  setAttributes(attributes: Record<string, any>): void {
    if (!this.isRecording()) return;
    Object.assign(this.attributes, attributes);
  }

  addEvent(name: string, attributes?: Record<string, any>): void {
    if (!this.isRecording()) return;
    this.events.push({
      name,
      timestamp: new Date(),
      attributes
    });
  }

  setStatus(status: SpanStatus): void {
    if (!this.isRecording()) return;
    this.status = status;
  }

  end(endTime?: Date): void {
    if (!this.isRecording()) return;
    this.endTime = endTime || new Date();
    this.recording = false;
  }

  isRecording(): boolean {
    return this.recording;
  }
}

export class Tracer implements ITracer {
  private currentSpan?: ISpan;
  private spanStack: ISpan[] = [];
  private spanIdCounter = 0;

  startSpan(name: string, options?: SpanOptions): ISpan {
    const spanId = this.generateSpanId();

    let traceId: string;
    if (options?.parent) {
      // Check if parent is ISpan (has spanContext property)
      if ('spanContext' in options.parent) {
        traceId = options.parent.spanContext.traceId;
      } else {
        // parent is SpanContext
        traceId = options.parent.traceId;
      }
    } else {
      traceId = this.generateTraceId();
    }

    const context: SpanContext = {
      traceId,
      spanId,
      traceFlags: 1,
      traceState: ''
    };

    const span = new SimpleSpan(name, context, options);

    // Set as current span
    this.currentSpan = span;
    this.spanStack.push(span);

    return span;
  }

  getCurrentSpan(): ISpan | undefined {
    return this.currentSpan;
  }

  withSpan<T>(span: ISpan, fn: () => T): T {
    const previousSpan = this.currentSpan;
    this.currentSpan = span;

    try {
      return fn();
    } finally {
      this.currentSpan = previousSpan;
    }
  }

  inject(context: SpanContext, carrier: any): void {
    carrier['x-trace-id'] = context.traceId;
    carrier['x-span-id'] = context.spanId;
    carrier['x-trace-flags'] = context.traceFlags.toString();
    if (context.traceState) {
      carrier['x-trace-state'] = context.traceState;
    }
  }

  extract(carrier: any): SpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];

    if (!traceId || !spanId) {
      return undefined;
    }

    return {
      traceId,
      spanId,
      traceFlags: parseInt(carrier['x-trace-flags'] || '1'),
      traceState: carrier['x-trace-state'] || ''
    };
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSpanId(): string {
    return `span-${++this.spanIdCounter}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Decorator for tracing methods
export function Trace(spanName?: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const tracer = (this as any).tracer || getGlobalTracer();
      if (!tracer) {
        return originalMethod.apply(this, args);
      }

      const name = spanName || `${className}.${methodName}`;
      const span = tracer.startSpan(name, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'code.function': methodName,
          'code.class': className,
          'args.count': args.length
        }
      });

      try {
        const result = await originalMethod.apply(this, args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        span.setAttribute('error', true);
        span.setAttribute('error.message', (error as Error).message);
        span.setAttribute('error.stack', (error as Error).stack);
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

// Global tracer instance
let globalTracer: ITracer | undefined;

export function setGlobalTracer(tracer: ITracer): void {
  globalTracer = tracer;
}

export function getGlobalTracer(): ITracer | undefined {
  return globalTracer;
}