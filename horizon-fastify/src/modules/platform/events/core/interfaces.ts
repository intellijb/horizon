import {
  MessageHandler,
  EventHandler,
  Constructor,
  IEventMetadata,
  AggregateSnapshot,
  IEventEnvelope
} from './types';

export interface IMessageBroker {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: Buffer): Promise<void>;
  publishBatch(messages: Array<{ topic: string; message: Buffer }>): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  isConnected(): boolean;
  getMetrics(): Promise<BrokerMetrics>;
}

export interface BrokerMetrics {
  publishedCount: number;
  receivedCount: number;
  errorCount: number;
  lastError?: Error;
  queueSize?: number;
}

export interface IEventBus {
  publish<T>(event: T): Promise<void>;
  publishBatch<T>(events: T[]): Promise<void>;
  subscribe<T>(eventType: Constructor<T>, handler: EventHandler<T>): void;
  unsubscribe<T>(eventType: Constructor<T>, handler?: EventHandler<T>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface IEventStore {
  append(event: any, metadata: IEventMetadata): Promise<void>;
  appendBatch(events: Array<{ event: any; metadata: IEventMetadata }>): Promise<void>;
  getEvents(streamId: string, fromVersion?: number, toVersion?: number): Promise<IEventEnvelope[]>;
  getEventsByType<T>(eventType: string, limit?: number, offset?: number): Promise<T[]>;
  getEventsByCorrelationId(correlationId: string): Promise<IEventEnvelope[]>;
  saveSnapshot(snapshot: AggregateSnapshot): Promise<void>;
  getSnapshot(aggregateId: string): Promise<AggregateSnapshot | null>;
  getLastEventVersion(streamId: string): Promise<number>;
  deleteStream(streamId: string): Promise<void>;
}

export interface IEventHandler<T = any> {
  handle(event: T, metadata?: IEventMetadata): Promise<void>;
  onError?(error: Error, event: T): Promise<void>;
  getRetryPolicy?(): RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

export interface IEventHandlerRegistry {
  register<T>(eventType: Constructor<T>, handler: IEventHandler<T>): void;
  unregister<T>(eventType: Constructor<T>, handler?: IEventHandler<T>): void;
  getHandlers<T>(eventType: Constructor<T>): IEventHandler<T>[];
  getAllHandlers(): Map<string, IEventHandler[]>;
  clear(): void;
}

export interface IEventPublisher {
  publish<T>(event: T): Promise<void>;
  publishWithMetadata<T>(event: T, metadata: Partial<IEventMetadata>): Promise<void>;
}

export interface IEventSubscriber {
  subscribe<T>(eventType: Constructor<T>, handler: EventHandler<T>): void;
  unsubscribe<T>(eventType: Constructor<T>, handler?: EventHandler<T>): void;
}

export interface ISagaOrchestrator {
  startSaga(sagaId: string, initialEvent: any): Promise<void>;
  handleSagaEvent(event: any, metadata: IEventMetadata): Promise<void>;
  compensate(sagaId: string, error: Error): Promise<void>;
  getSagaStatus(sagaId: string): Promise<SagaStatus>;
}

export enum SagaStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED'
}