import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  EventBus,
  InMemoryBroker,
  InMemoryEventStore,
  EventSerializer,
  DomainEvent,
  UserLoggedInEvent
} from '@modules/platform/events'

class TestEvent extends DomainEvent {
  readonly eventType = 'TestEvent'
  readonly version = 1
  readonly topic = 'test.events'

  constructor(
    public readonly message: string,
    metadata?: any
  ) {
    super(metadata)
  }
}

describe('EventBus', () => {
  let eventBus: EventBus
  let broker: InMemoryBroker
  let store: InMemoryEventStore
  let serializer: EventSerializer

  beforeEach(() => {
    broker = new InMemoryBroker()
    store = new InMemoryEventStore()
    serializer = new EventSerializer()
    eventBus = new EventBus(broker, serializer, store)
  })

  afterEach(async () => {
    await eventBus.stop()
  })

  describe('start/stop', () => {
    it('should start and connect to broker', async () => {
      await eventBus.start()
      expect(eventBus.isStarted()).toBe(true)
      expect(broker.isConnected()).toBe(true)
    })

    it('should stop and disconnect from broker', async () => {
      await eventBus.start()
      await eventBus.stop()
      expect(eventBus.isStarted()).toBe(false)
      expect(broker.isConnected()).toBe(false)
    })

    it('should handle multiple start calls gracefully', async () => {
      await eventBus.start()
      await eventBus.start() // Should not throw
      expect(eventBus.isStarted()).toBe(true)
    })
  })

  describe('publish', () => {
    beforeEach(async () => {
      await eventBus.start()
    })

    it('should publish event to broker', async () => {
      const event = new TestEvent('Hello World')
      await eventBus.publish(event)

      // Check event was stored
      const storedEvents = await store.getEvents('global')
      expect(storedEvents).toHaveLength(1)
      expect(storedEvents[0].event.message).toBe('Hello World')
    })

    it('should throw error if bus not started', async () => {
      await eventBus.stop()
      const event = new TestEvent('Hello')

      await expect(eventBus.publish(event)).rejects.toThrow('EventBus not started')
    })

    it('should store event metadata correctly', async () => {
      const event = new UserLoggedInEvent(
        'user123',
        'test@example.com',
        'device456',
        'Chrome Browser',
        '192.168.1.1',
        'Mozilla/5.0'
      )

      await eventBus.publish(event)

      const storedEvents = await store.getEventsByType<UserLoggedInEvent>('UserLoggedIn')
      expect(storedEvents).toHaveLength(1)
      expect(storedEvents[0].userId).toBe('user123')
      expect(storedEvents[0].email).toBe('test@example.com')
    })
  })

  describe('subscribe', () => {
    beforeEach(async () => {
      await eventBus.start()
    })

    it('should handle subscribed events', async () => {
      const handler = jest.fn()
      eventBus.subscribe(TestEvent, handler)

      const event = new TestEvent('Test Message')
      await eventBus.publish(event)

      // Give time for async handling
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test Message'
      }))
    })

    it('should handle multiple subscribers', async () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      eventBus.subscribe(TestEvent, handler1)
      eventBus.subscribe(TestEvent, handler2)

      const event = new TestEvent('Multi')
      await eventBus.publish(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should unsubscribe specific handler', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      eventBus.subscribe(TestEvent, handler1)
      eventBus.subscribe(TestEvent, handler2)
      eventBus.unsubscribe(TestEvent, handler1)

      // Only handler2 should remain
      const remainingHandlers = (eventBus as any).handlers.get('TestEvent')
      expect(remainingHandlers?.size).toBe(1)
      expect(remainingHandlers?.has(handler2)).toBe(true)
    })

    it('should unsubscribe all handlers when no specific handler provided', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      eventBus.subscribe(TestEvent, handler1)
      eventBus.subscribe(TestEvent, handler2)
      eventBus.unsubscribe(TestEvent)

      const remainingHandlers = (eventBus as any).handlers.get('TestEvent')
      expect(remainingHandlers).toBeUndefined()
    })
  })

  describe('publishBatch', () => {
    beforeEach(async () => {
      await eventBus.start()
    })

    it('should publish multiple events', async () => {
      const events = [
        new TestEvent('Event 1'),
        new TestEvent('Event 2'),
        new TestEvent('Event 3')
      ]

      await eventBus.publishBatch(events)

      const storedEvents = await store.getAllEvents()
      expect(storedEvents).toHaveLength(3)
    })

    it('should handle mixed event types', async () => {
      const events = [
        new TestEvent('Test'),
        new UserLoggedInEvent('user1', 'user1@test.com', 'device1', 'Browser')
      ]

      await eventBus.publishBatch(events)

      const testEvents = await store.getEventsByType('TestEvent')
      const loginEvents = await store.getEventsByType('UserLoggedIn')

      expect(testEvents).toHaveLength(1)
      expect(loginEvents).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await eventBus.start()
    })

    it('should emit error event on handler failure', async () => {
      const errorHandler = jest.fn()
      eventBus.on('handler-error', errorHandler)

      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler failed'))
      eventBus.subscribe(TestEvent, failingHandler)

      const event = new TestEvent('Will fail')
      await eventBus.publish(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(errorHandler).toHaveBeenCalled()
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error)
    })

    it('should not stop other handlers on failure', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Failed'))
      const successHandler = jest.fn()

      eventBus.subscribe(TestEvent, failingHandler)
      eventBus.subscribe(TestEvent, successHandler)

      const event = new TestEvent('Test')
      await eventBus.publish(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(successHandler).toHaveBeenCalled()
    })
  })
})