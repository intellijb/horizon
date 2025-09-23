export interface IEventMetadata {
  eventId: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  version: number;
}

export interface ISerializedEvent {
  type: string;
  data: any;
  metadata: IEventMetadata;
}

export type Constructor<T = {}> = new (...args: any[]) => T;

export type MessageHandler = (message: Buffer) => Promise<void>;

export type EventHandler<T = any> = (event: T) => Promise<void>;

export interface IEventSerializer {
  serialize(event: any): Buffer;
  deserialize<T>(data: Buffer, type: Constructor<T>): T;
}

export interface IRoutingStrategy {
  selectBroker(event: any): 'local' | 'remote';
}

export interface BrokerConfig {
  type: 'redis' | 'kafka' | 'rabbitmq' | 'in-memory';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  kafka?: {
    brokers: string[];
    clientId?: string;
    groupId?: string;
  };
  rabbitmq?: {
    url: string;
    exchange?: string;
  };
}

export interface EventStoreConfig {
  type: 'redis' | 'postgres' | 'dynamodb' | 'in-memory';
  redis?: {
    ttl?: number;
    maxEvents?: number;
  };
  postgres?: {
    table?: string;
  };
  dynamodb?: {
    table?: string;
    region?: string;
  };
}

export interface EventBusConfig {
  broker: BrokerConfig;
  store?: EventStoreConfig;
  hybrid?: boolean;
  routingStrategy?: IRoutingStrategy;
  serializer?: IEventSerializer;
}

export interface AggregateSnapshot {
  aggregateId: string;
  version: number;
  data: any;
  timestamp: Date;
}

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface IEventEnvelope {
  event: any;
  metadata: IEventMetadata;
  priority?: EventPriority;
  retryCount?: number;
  maxRetries?: number;
}