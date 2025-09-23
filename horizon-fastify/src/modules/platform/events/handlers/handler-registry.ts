import { IEventHandler, IEventHandlerRegistry } from '../core/interfaces';
import { Constructor } from '../core/types';

export class EventHandlerRegistry implements IEventHandlerRegistry {
  private handlers: Map<string, Set<IEventHandler>> = new Map();
  private static instance: EventHandlerRegistry | null = null;

  constructor() {
    // Allow multiple instances for testing
  }

  static getInstance(): EventHandlerRegistry {
    if (!EventHandlerRegistry.instance) {
      EventHandlerRegistry.instance = new EventHandlerRegistry();
    }
    return EventHandlerRegistry.instance;
  }

  static resetInstance(): void {
    EventHandlerRegistry.instance = null;
  }

  register<T>(eventType: Constructor<T>, handler: IEventHandler<T>): void {
    const eventName = this.getEventName(eventType);

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);
  }

  unregister<T>(eventType: Constructor<T>, handler?: IEventHandler<T>): void {
    const eventName = this.getEventName(eventType);
    const handlers = this.handlers.get(eventName);

    if (!handlers) {
      return;
    }

    if (handler) {
      handlers.delete(handler);
    } else {
      handlers.clear();
    }

    if (handlers.size === 0) {
      this.handlers.delete(eventName);
    }
  }

  getHandlers<T>(eventType: Constructor<T>): IEventHandler<T>[] {
    const eventName = this.getEventName(eventType);
    const handlers = this.handlers.get(eventName);

    if (!handlers) {
      return [];
    }

    return Array.from(handlers) as IEventHandler<T>[];
  }

  getAllHandlers(): Map<string, IEventHandler[]> {
    const result = new Map<string, IEventHandler[]>();

    for (const [eventName, handlers] of this.handlers.entries()) {
      result.set(eventName, Array.from(handlers));
    }

    return result;
  }

  clear(): void {
    this.handlers.clear();
  }

  private getEventName(eventType: Constructor | any): string {
    if (typeof eventType === 'string') {
      return eventType;
    }
    if (eventType.eventType) {
      return eventType.eventType;
    }
    return eventType.name;
  }

  hasHandlers(eventType: Constructor | string): boolean {
    const eventName = typeof eventType === 'string' ? eventType : this.getEventName(eventType);
    const handlers = this.handlers.get(eventName);
    return handlers ? handlers.size > 0 : false;
  }

  getHandlerCount(eventType: Constructor | string): number {
    const eventName = typeof eventType === 'string' ? eventType : this.getEventName(eventType);
    const handlers = this.handlers.get(eventName);
    return handlers ? handlers.size : 0;
  }

  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}