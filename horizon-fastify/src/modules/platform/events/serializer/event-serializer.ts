import { IEventSerializer } from '../core/types';
import { DomainEvent } from '../core/domain-event';

export class EventSerializer implements IEventSerializer {
  private eventTypeMap: Map<string, any> = new Map();

  registerEventType(eventType: string, constructor: any): void {
    this.eventTypeMap.set(eventType, constructor);
  }

  serialize(event: any): Buffer {
    let eventType: string;
    let metadata: any = {};

    if (event instanceof DomainEvent) {
      eventType = event.eventType;
      metadata = event.getMetadata();
    } else {
      eventType = event.constructor.name;
    }

    const serialized = {
      type: eventType,
      data: event.toJSON ? event.toJSON() : event,
      metadata,
      timestamp: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(serialized));
  }

  deserialize<T>(data: Buffer, type?: any): T {
    const parsed = JSON.parse(data.toString());
    const eventType = parsed.type;
    const eventData = parsed.data;
    const metadata = parsed.metadata;

    // If a specific type is provided, use it
    if (type) {
      if (type.fromJSON) {
        return type.fromJSON(eventData, metadata);
      }
      return new type(eventData, metadata);
    }

    // Try to find registered type
    const constructor = this.eventTypeMap.get(eventType);
    if (constructor) {
      if (constructor.fromJSON) {
        return constructor.fromJSON(eventData, metadata);
      }
      return new constructor(eventData, metadata);
    }

    // Return raw data if no constructor found
    return { ...eventData, ...metadata } as T;
  }

  serializeBatch(events: any[]): Buffer[] {
    return events.map(event => this.serialize(event));
  }

  deserializeBatch<T>(data: Buffer[], type?: any): T[] {
    return data.map(buffer => this.deserialize<T>(buffer, type));
  }
}