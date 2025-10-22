import { EventEmitter } from 'events';
import { IEventBus } from '../../events/core/interfaces';

export interface ISagaStep {
  name: string;
  execute(context: any): Promise<any>;
  compensate(context: any, error?: Error): Promise<void>;
}

export interface ISagaDefinition {
  name: string;
  steps: ISagaStep[];
  timeout?: number;
}

export enum SagaState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED'
}

export interface ISagaInstance {
  id: string;
  definitionName: string;
  state: SagaState;
  currentStep: number;
  context: any;
  completedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  error?: Error;
}

export class SagaOrchestrator extends EventEmitter {
  private sagas = new Map<string, ISagaInstance>();
  private definitions = new Map<string, ISagaDefinition>();

  constructor(private eventBus?: IEventBus) {
    super();
  }

  registerSaga(definition: ISagaDefinition): void {
    this.definitions.set(definition.name, definition);
    this.emit('saga-registered', { name: definition.name });
  }

  async startSaga(
    definitionName: string,
    initialContext: any = {}
  ): Promise<string> {
    const definition = this.definitions.get(definitionName);
    if (!definition) {
      throw new Error(`Saga definition not found: ${definitionName}`);
    }

    const sagaId = this.generateSagaId();
    const instance: ISagaInstance = {
      id: sagaId,
      definitionName,
      state: SagaState.PENDING,
      currentStep: 0,
      context: { ...initialContext },
      completedSteps: [],
      startedAt: new Date()
    };

    this.sagas.set(sagaId, instance);
    this.emit('saga-started', { sagaId, definitionName });

    // Execute saga asynchronously
    this.executeSaga(sagaId).catch((error) => {
      console.error(`Saga ${sagaId} failed:`, error);
    });

    return sagaId;
  }

  private async executeSaga(sagaId: string): Promise<void> {
    const instance = this.sagas.get(sagaId);
    if (!instance) return;

    const definition = this.definitions.get(instance.definitionName);
    if (!definition) return;

    instance.state = SagaState.RUNNING;
    this.emit('saga-state-changed', { sagaId, state: instance.state });

    try {
      // Execute each step
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        instance.currentStep = i;

        this.emit('saga-step-starting', { sagaId, step: step.name });

        try {
          const result = await this.executeStep(step, instance.context);
          instance.context = { ...instance.context, ...result };
          instance.completedSteps.push(step.name);

          this.emit('saga-step-completed', {
            sagaId,
            step: step.name,
            result
          });

          // Publish step completed event
          if (this.eventBus) {
            await this.eventBus.publish({
              eventType: 'SagaStepCompleted',
              sagaId,
              stepName: step.name,
              context: instance.context
            });
          }
        } catch (error) {
          instance.error = error as Error;

          this.emit('saga-step-failed', {
            sagaId,
            step: step.name,
            error
          });

          // Start compensation
          await this.compensateSaga(sagaId);
          return;
        }
      }

      // All steps completed successfully
      instance.state = SagaState.COMPLETED;
      instance.completedAt = new Date();

      this.emit('saga-completed', {
        sagaId,
        context: instance.context
      });

      // Publish saga completed event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'SagaCompleted',
          sagaId,
          definitionName: instance.definitionName,
          context: instance.context
        });
      }
    } catch (error) {
      instance.state = SagaState.FAILED;
      instance.error = error as Error;

      this.emit('saga-failed', { sagaId, error });

      // Publish saga failed event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'SagaFailed',
          sagaId,
          error: (error as Error).message
        });
      }
    }
  }

  private async compensateSaga(sagaId: string): Promise<void> {
    const instance = this.sagas.get(sagaId);
    if (!instance) return;

    const definition = this.definitions.get(instance.definitionName);
    if (!definition) return;

    instance.state = SagaState.COMPENSATING;
    this.emit('saga-compensating', { sagaId });

    // Compensate in reverse order
    const stepsToCompensate = [...instance.completedSteps].reverse();

    for (const stepName of stepsToCompensate) {
      const step = definition.steps.find(s => s.name === stepName);
      if (!step) continue;

      this.emit('saga-step-compensating', { sagaId, step: stepName });

      try {
        await this.compensateStep(step, instance.context, instance.error);

        this.emit('saga-step-compensated', { sagaId, step: stepName });

        // Publish compensation event
        if (this.eventBus) {
          await this.eventBus.publish({
            eventType: 'SagaStepCompensated',
            sagaId,
            stepName
          });
        }
      } catch (compensationError) {
        this.emit('saga-compensation-failed', {
          sagaId,
          step: stepName,
          error: compensationError
        });

        // Continue compensating other steps despite errors
      }
    }

    instance.state = SagaState.COMPENSATED;
    instance.completedAt = new Date();

    this.emit('saga-compensated', { sagaId });

    // Publish saga compensated event
    if (this.eventBus) {
      await this.eventBus.publish({
        eventType: 'SagaCompensated',
        sagaId,
        originalError: instance.error?.message
      });
    }
  }

  private async executeStep(step: ISagaStep, context: any): Promise<any> {
    // Add timeout if needed
    return step.execute(context);
  }

  private async compensateStep(
    step: ISagaStep,
    context: any,
    error?: Error
  ): Promise<void> {
    return step.compensate(context, error);
  }

  getSaga(sagaId: string): ISagaInstance | undefined {
    return this.sagas.get(sagaId);
  }

  getSagasByDefinition(definitionName: string): ISagaInstance[] {
    return Array.from(this.sagas.values()).filter(
      s => s.definitionName === definitionName
    );
  }

  private generateSagaId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Example saga implementation
export class CreateOrderSaga {
  static definition: ISagaDefinition = {
    name: 'CreateOrder',
    steps: [
      {
        name: 'ReserveInventory',
        async execute(context) {
          // Reserve inventory items
          console.log('Reserving inventory for order', context.orderId);
          return { inventoryReservationId: 'inv_123' };
        },
        async compensate(context) {
          // Release inventory reservation
          console.log('Releasing inventory reservation', context.inventoryReservationId);
        }
      },
      {
        name: 'ProcessPayment',
        async execute(context) {
          // Process payment
          console.log('Processing payment for order', context.orderId);
          return { paymentId: 'pay_456' };
        },
        async compensate(context) {
          // Refund payment
          console.log('Refunding payment', context.paymentId);
        }
      },
      {
        name: 'CreateShipment',
        async execute(context) {
          // Create shipment
          console.log('Creating shipment for order', context.orderId);
          return { shipmentId: 'ship_789' };
        },
        async compensate(context) {
          // Cancel shipment
          console.log('Cancelling shipment', context.shipmentId);
        }
      }
    ],
    timeout: 30000 // 30 seconds
  };
}