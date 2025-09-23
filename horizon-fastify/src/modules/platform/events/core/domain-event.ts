import { randomUUID } from 'crypto';
import { IEventMetadata, EventPriority } from './types';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly userId?: string;

  abstract readonly eventType: string;
  abstract readonly version: number;
  abstract readonly topic: string;

  public readonly priority: EventPriority = EventPriority.NORMAL;

  constructor(metadata?: Partial<IEventMetadata>) {
    this.eventId = metadata?.eventId || randomUUID();
    this.timestamp = metadata?.timestamp || new Date();
    this.correlationId = metadata?.correlationId;
    this.causationId = metadata?.causationId;
    this.userId = metadata?.userId;
  }

  getMetadata(): IEventMetadata {
    return {
      eventId: this.eventId,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      causationId: this.causationId,
      userId: this.userId,
      version: this.version,
    };
  }

  toJSON(): any {
    const { eventType, version, topic, priority, ...data } = this;
    return data;
  }

  static fromJSON<T extends DomainEvent>(
    this: new (data: any, metadata?: Partial<IEventMetadata>) => T,
    json: any,
    metadata?: Partial<IEventMetadata>
  ): T {
    return new this(json, metadata);
  }
}

export abstract class AggregateRoot {
  private uncommittedEvents: DomainEvent[] = [];
  protected version: number = 0;

  abstract readonly aggregateId: string;

  protected addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
    this.apply(event);
    this.version++;
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  loadFromHistory(events: DomainEvent[]): void {
    events.forEach(event => {
      this.apply(event);
      this.version++;
    });
  }

  protected abstract apply(event: DomainEvent): void;

  getVersion(): number {
    return this.version;
  }
}

export class IntegrationEvent extends DomainEvent {
  readonly eventType: string = 'IntegrationEvent';
  readonly version: number = 1;
  readonly topic: string = 'integration';
  readonly priority: EventPriority = EventPriority.NORMAL;

  constructor(
    public readonly sourceSystem: string,
    public readonly targetSystem: string,
    public readonly payload: any,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }
}

export class CommandEvent extends DomainEvent {
  readonly eventType: string = 'CommandEvent';
  readonly version: number = 1;
  readonly topic: string = 'commands';
  readonly priority: EventPriority = EventPriority.HIGH;

  constructor(
    public readonly commandName: string,
    public readonly payload: any,
    public readonly targetAggregateId?: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }
}