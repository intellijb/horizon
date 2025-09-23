import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  HybridEventBus,
  DefaultRoutingStrategy,
  InMemoryBroker,
  RedisBroker,
  InMemoryEventStore,
  EventSerializer,
  DomainEvent,
  EventPriority
} from '@modules/platform/events'

class LocalEvent extends DomainEvent {
  readonly eventType = 'LocalEvent'
  readonly version = 1
  readonly topic = 'local.events'
  readonly priority = EventPriority.HIGH // High priority -> local

  constructor(public readonly data: string) {
    super()
  }
}

class RemoteEvent extends DomainEvent {
  readonly eventType = 'RemoteEvent'
  readonly version = 1
  readonly topic = 'remote.events'
  readonly priority = EventPriority.LOW // Low priority -> remote

  constructor(public readonly data: string) {
    super()
  }
}

describe('HybridEventBus', () => {
  let hybridBus: HybridEventBus
  let localBroker: InMemoryBroker
  let remoteBroker: InMemoryBroker
  let routingStrategy: DefaultRoutingStrategy
  let store: InMemoryEventStore

  beforeEach(() => {
    localBroker = new InMemoryBroker()
    remoteBroker = new InMemoryBroker()
    routingStrategy = new DefaultRoutingStrategy()
    store = new InMemoryEventStore()

    hybridBus = new HybridEventBus({
      localBroker,
      remoteBroker,
      routingStrategy,
      store
    })
  })

  afterEach(async () => {
    await hybridBus.stop()
  })

  describe('routing', () => {
    beforeEach(async () => {
      await hybridBus.start()
    })

    it('should route high-priority events to local broker', async () => {
      const localSpy = jest.spyOn(localBroker, 'publish')
      const remoteSpy = jest.spyOn(remoteBroker, 'publish')

      const event = new LocalEvent('High priority data')
      await hybridBus.publish(event)

      expect(localSpy).toHaveBeenCalled()
      expect(remoteSpy).not.toHaveBeenCalled()
    })

    it('should route low-priority events to remote broker', async () => {
      const localSpy = jest.spyOn(localBroker, 'publish')
      const remoteSpy = jest.spyOn(remoteBroker, 'publish')

      const event = new RemoteEvent('Low priority data')
      await hybridBus.publish(event)

      expect(remoteSpy).toHaveBeenCalled()
      expect(localSpy).not.toHaveBeenCalled()
    })

    it('should route based on custom routing strategy', async () => {
      // Configure specific events to local
      routingStrategy.addLocalEventType('RemoteEvent')

      const localSpy = jest.spyOn(localBroker, 'publish')
      const remoteSpy = jest.spyOn(remoteBroker, 'publish')

      const event = new RemoteEvent('Should go local')
      await hybridBus.publish(event)

      expect(localSpy).toHaveBeenCalled()
      expect(remoteSpy).not.toHaveBeenCalled()
    })
  })

  describe('batch publishing', () => {
    beforeEach(async () => {
      await hybridBus.start()
    })

    it('should route batch events to appropriate brokers', async () => {
      const localSpy = jest.spyOn(localBroker, 'publishBatch')
      const remoteSpy = jest.spyOn(remoteBroker, 'publishBatch')

      const events = [
        new LocalEvent('Local 1'),
        new LocalEvent('Local 2'),
        new RemoteEvent('Remote 1'),
        new RemoteEvent('Remote 2')
      ]

      await hybridBus.publishBatch(events)

      expect(localSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ topic: 'local.events' })
        ])
      )

      expect(remoteSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ topic: 'remote.events' })
        ])
      )
    })

    it('should handle all local events batch', async () => {
      const events = [
        new LocalEvent('Local 1'),
        new LocalEvent('Local 2')
      ]

      await hybridBus.publishBatch(events)

      // Verify events were stored
      const storedEvents = await store.getAllEvents()
      expect(storedEvents).toHaveLength(2)
    })
  })

  describe('subscription', () => {
    beforeEach(async () => {
      await hybridBus.start()
    })

    it('should receive events from both brokers', async () => {
      const handler = jest.fn()
      hybridBus.subscribe(LocalEvent, handler)

      // Publish to local
      const localEvent = new LocalEvent('From local')
      await hybridBus.publish(localEvent)

      // Simulate event from remote broker
      await remoteBroker.publish('LocalEvent', Buffer.from(JSON.stringify({
        type: 'LocalEvent',
        data: { data: 'From remote' },
        metadata: {}
      })))

      await new Promise(resolve => setTimeout(resolve, 100))

      // Handler should be called for both events
      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('should handle unsubscribe correctly', async () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      hybridBus.subscribe(LocalEvent, handler1)
      hybridBus.subscribe(LocalEvent, handler2)
      hybridBus.unsubscribe(LocalEvent, handler1)

      const event = new LocalEvent('Test')
      await hybridBus.publish(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('metrics', () => {
    beforeEach(async () => {
      await hybridBus.start()
    })

    it('should provide metrics from both brokers', async () => {
      await hybridBus.publish(new LocalEvent('Local'))
      await hybridBus.publish(new RemoteEvent('Remote'))

      const metrics = await hybridBus.getMetrics()

      expect(metrics.local).toBeDefined()
      expect(metrics.remote).toBeDefined()
      expect(metrics.local.publishedCount).toBe(1)
      expect(metrics.remote.publishedCount).toBe(1)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await hybridBus.start()
    })

    it('should emit error events', async () => {
      const errorHandler = jest.fn()
      hybridBus.on('publish-error', errorHandler)

      // Force an error by stopping the bus
      await hybridBus.stop()

      const event = new LocalEvent('Will fail')
      await expect(hybridBus.publish(event)).rejects.toThrow()

      expect(errorHandler).toHaveBeenCalled()
    })

    it('should handle broker connection failures gracefully', async () => {
      // Create new bus with mocked broker that fails
      const failingBroker = new InMemoryBroker()
      jest.spyOn(failingBroker, 'connect').mockRejectedValue(new Error('Connection failed'))

      const bus = new HybridEventBus({
        localBroker,
        remoteBroker: failingBroker,
        routingStrategy,
        store
      })

      await expect(bus.start()).rejects.toThrow()
    })
  })
})