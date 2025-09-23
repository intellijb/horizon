import { IMessageBroker } from '../core/interfaces';
import { BrokerConfig } from '../core/types';
import { RedisBroker } from '../brokers/redis-broker';
import { InMemoryBroker } from '../brokers/in-memory-broker';

export class BrokerFactory {
  private static brokers: Map<string, IMessageBroker> = new Map();

  static create(config: BrokerConfig): IMessageBroker {
    const key = this.getBrokerKey(config);

    // Check if we already have this broker instance (singleton per config)
    if (this.brokers.has(key)) {
      return this.brokers.get(key)!;
    }

    let broker: IMessageBroker;

    switch (config.type) {
      case 'redis':
        broker = new RedisBroker(config.redis);
        break;

      case 'kafka':
        // Placeholder for future Kafka implementation
        broker = this.createKafkaBroker(config.kafka);
        break;

      case 'rabbitmq':
        // Placeholder for future RabbitMQ implementation
        broker = this.createRabbitMQBroker(config.rabbitmq);
        break;

      case 'in-memory':
        broker = new InMemoryBroker();
        break;

      default:
        throw new Error(`Unknown broker type: ${config.type}`);
    }

    // Cache the broker instance
    this.brokers.set(key, broker);

    return broker;
  }

  static async createAndConnect(config: BrokerConfig): Promise<IMessageBroker> {
    const broker = this.create(config);
    await broker.connect();
    return broker;
  }

  private static getBrokerKey(config: BrokerConfig): string {
    if (config.type === 'in-memory') {
      return 'in-memory';
    }

    const parts = [config.type];

    if (config.redis) {
      parts.push(`${config.redis.host}:${config.redis.port}:${config.redis.db || 0}`);
    } else if (config.kafka) {
      parts.push(config.kafka.brokers.join(','));
    } else if (config.rabbitmq) {
      parts.push(config.rabbitmq.url);
    }

    return parts.join(':');
  }

  private static createKafkaBroker(config: any): IMessageBroker {
    // Stub implementation for Kafka - to be implemented when needed
    console.warn('Kafka broker not yet implemented, using in-memory broker as fallback');
    return new InMemoryBroker();

    // Future implementation:
    // import { KafkaBroker } from '../brokers/kafka-broker';
    // return new KafkaBroker(config);
  }

  private static createRabbitMQBroker(config: any): IMessageBroker {
    // Stub implementation for RabbitMQ - to be implemented when needed
    console.warn('RabbitMQ broker not yet implemented, using in-memory broker as fallback');
    return new InMemoryBroker();

    // Future implementation:
    // import { RabbitMQBroker } from '../brokers/rabbitmq-broker';
    // return new RabbitMQBroker(config);
  }

  static clearCache(): void {
    this.brokers.clear();
  }

  static async disconnectAll(): Promise<void> {
    const promises = Array.from(this.brokers.values()).map(broker =>
      broker.disconnect().catch(err => console.error('Error disconnecting broker:', err))
    );

    await Promise.all(promises);
    this.clearCache();
  }
}