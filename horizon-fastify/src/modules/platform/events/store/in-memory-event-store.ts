import { IEventStore } from '../core/interfaces';
import { IEventMetadata, IEventEnvelope, AggregateSnapshot } from '../core/types';

export class InMemoryEventStore implements IEventStore {
  private events: Map<string, IEventEnvelope[]> = new Map();
  private eventsByType: Map<string, IEventEnvelope[]> = new Map();
  private eventsByCorrelation: Map<string, IEventEnvelope[]> = new Map();
  private snapshots: Map<string, AggregateSnapshot> = new Map();
  private eventCounter: Map<string, number> = new Map();

  async append(event: any, metadata: IEventMetadata): Promise<void> {
    const streamId = this.getStreamId(event, metadata);
    const envelope: IEventEnvelope = { event, metadata };

    // Add to stream
    if (!this.events.has(streamId)) {
      this.events.set(streamId, []);
      this.eventCounter.set(streamId, 0);
    }
    this.events.get(streamId)!.push(envelope);

    // Increment counter
    const currentCount = this.eventCounter.get(streamId)! + 1;
    this.eventCounter.set(streamId, currentCount);

    // Add to type index
    const eventType = this.getEventType(event);
    if (!this.eventsByType.has(eventType)) {
      this.eventsByType.set(eventType, []);
    }
    this.eventsByType.get(eventType)!.push(envelope);

    // Add to correlation index
    if (metadata.correlationId) {
      if (!this.eventsByCorrelation.has(metadata.correlationId)) {
        this.eventsByCorrelation.set(metadata.correlationId, []);
      }
      this.eventsByCorrelation.get(metadata.correlationId)!.push(envelope);
    }
  }

  async appendBatch(events: Array<{ event: any; metadata: IEventMetadata }>): Promise<void> {
    for (const { event, metadata } of events) {
      await this.append(event, metadata);
    }
  }

  async getEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<IEventEnvelope[]> {
    const streamEvents = this.events.get(streamId) || [];

    if (fromVersion === undefined && toVersion === undefined) {
      return [...streamEvents];
    }

    const from = fromVersion || 1;
    const to = toVersion || streamEvents.length;

    return streamEvents.slice(from - 1, to);
  }

  async getEventsByType<T>(
    eventType: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<T[]> {
    const typeEvents = this.eventsByType.get(eventType) || [];
    const sliced = typeEvents.slice(offset, offset + limit);
    return sliced.map(envelope => envelope.event as T);
  }

  async getEventsByCorrelationId(correlationId: string): Promise<IEventEnvelope[]> {
    return [...(this.eventsByCorrelation.get(correlationId) || [])];
  }

  async saveSnapshot(snapshot: AggregateSnapshot): Promise<void> {
    this.snapshots.set(snapshot.aggregateId, snapshot);
  }

  async getSnapshot(aggregateId: string): Promise<AggregateSnapshot | null> {
    return this.snapshots.get(aggregateId) || null;
  }

  async getLastEventVersion(streamId: string): Promise<number> {
    return this.eventCounter.get(streamId) || 0;
  }

  async deleteStream(streamId: string): Promise<void> {
    // Remove from main events
    const streamEvents = this.events.get(streamId) || [];
    this.events.delete(streamId);
    this.eventCounter.delete(streamId);

    // Remove from type index
    for (const envelope of streamEvents) {
      const eventType = this.getEventType(envelope.event);
      const typeEvents = this.eventsByType.get(eventType);
      if (typeEvents) {
        const filtered = typeEvents.filter(e => e !== envelope);
        if (filtered.length > 0) {
          this.eventsByType.set(eventType, filtered);
        } else {
          this.eventsByType.delete(eventType);
        }
      }
    }

    // Remove from correlation index
    for (const envelope of streamEvents) {
      if (envelope.metadata.correlationId) {
        const correlationEvents = this.eventsByCorrelation.get(envelope.metadata.correlationId);
        if (correlationEvents) {
          const filtered = correlationEvents.filter(e => e !== envelope);
          if (filtered.length > 0) {
            this.eventsByCorrelation.set(envelope.metadata.correlationId, filtered);
          } else {
            this.eventsByCorrelation.delete(envelope.metadata.correlationId);
          }
        }
      }
    }

    // Remove snapshot
    this.snapshots.delete(streamId);
  }

  private getStreamId(event: any, metadata: IEventMetadata): string {
    if (event.aggregateId) {
      return event.aggregateId;
    }
    if (event.streamId) {
      return event.streamId;
    }
    if (metadata.userId) {
      return `user:${metadata.userId}`;
    }
    return 'global';
  }

  private getEventType(event: any): string {
    if (event.eventType) {
      return event.eventType;
    }
    if (event.constructor && event.constructor.name) {
      return event.constructor.name;
    }
    return 'UnknownEvent';
  }

  // Test helper methods
  clear(): void {
    this.events.clear();
    this.eventsByType.clear();
    this.eventsByCorrelation.clear();
    this.snapshots.clear();
    this.eventCounter.clear();
  }

  getAllEvents(): IEventEnvelope[] {
    const allEvents: IEventEnvelope[] = [];
    for (const streamEvents of this.events.values()) {
      allEvents.push(...streamEvents);
    }
    return allEvents;
  }

  getStreamCount(): number {
    return this.events.size;
  }

  getEventCount(): number {
    let count = 0;
    for (const streamEvents of this.events.values()) {
      count += streamEvents.length;
    }
    return count;
  }
}