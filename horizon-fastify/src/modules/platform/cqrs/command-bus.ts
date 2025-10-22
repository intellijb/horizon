import { EventEmitter } from 'events';
import { ICommand, ICommandBus, ICommandHandler, ICommandValidator } from './core/interfaces';
import { IEventBus } from '../events/core/interfaces';
import { randomUUID } from 'crypto';

export class CommandBus extends EventEmitter implements ICommandBus {
  private handlers = new Map<string, ICommandHandler<any, any>>();
  private validators = new Map<string, ICommandValidator<any>>();
  private middleware: Array<(command: ICommand) => Promise<void>> = [];

  constructor(private eventBus?: IEventBus) {
    super();
  }

  async execute<TCommand extends ICommand, TResult = void>(
    command: TCommand
  ): Promise<TResult> {
    const commandType = command.constructor.name;

    // Add metadata if not present
    if (!command.commandId) {
      (command as any).commandId = randomUUID();
    }
    if (!command.timestamp) {
      (command as any).timestamp = new Date();
    }

    this.emit('command-received', command);

    try {
      // Run validation if validator exists
      const validator = this.validators.get(commandType);
      if (validator) {
        const validation = await validator.validate(command);
        if (!validation.isValid) {
          throw new CommandValidationError(validation.errors || ['Validation failed']);
        }
      }

      // Run middleware
      for (const mw of this.middleware) {
        await mw(command);
      }

      // Get handler
      const handler = this.handlers.get(commandType);
      if (!handler) {
        throw new Error(`No handler registered for command: ${commandType}`);
      }

      // Execute command
      const result = await handler.execute(command);

      this.emit('command-executed', {
        command,
        result,
        executedAt: new Date()
      });

      return result;
    } catch (error) {
      this.emit('command-failed', {
        command,
        error,
        failedAt: new Date()
      });
      throw error;
    }
  }

  register<TCommand extends ICommand, TResult = void>(
    commandType: new (...args: any[]) => TCommand,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    const commandName = commandType.name;
    if (this.handlers.has(commandName)) {
      throw new Error(`Handler already registered for command: ${commandName}`);
    }
    this.handlers.set(commandName, handler);
    this.emit('handler-registered', { commandType: commandName });
  }

  registerValidator<TCommand extends ICommand>(
    commandType: new (...args: any[]) => TCommand,
    validator: ICommandValidator<TCommand>
  ): void {
    this.validators.set(commandType.name, validator);
  }

  use(middleware: (command: ICommand) => Promise<void>): void {
    this.middleware.push(middleware);
  }

  unregister(commandType: new (...args: any[]) => any): void {
    const commandName = commandType.name;
    this.handlers.delete(commandName);
    this.validators.delete(commandName);
    this.emit('handler-unregistered', { commandType: commandName });
  }

  getHandlers(): Map<string, ICommandHandler<any, any>> {
    return new Map(this.handlers);
  }

  clearHandlers(): void {
    this.handlers.clear();
    this.validators.clear();
  }
}

export class CommandValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Command validation failed: ${errors.join(', ')}`);
    this.name = 'CommandValidationError';
  }
}

export abstract class Command implements ICommand {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly correlationId?: string;

  constructor(metadata?: Partial<ICommand>) {
    this.commandId = metadata?.commandId || randomUUID();
    this.timestamp = metadata?.timestamp || new Date();
    this.userId = metadata?.userId;
    this.correlationId = metadata?.correlationId;
  }
}

export abstract class CommandHandler<TCommand extends ICommand, TResult = void>
  implements ICommandHandler<TCommand, TResult> {

  constructor(protected eventBus?: IEventBus) {}

  abstract execute(command: TCommand): Promise<TResult>;

  protected async publishEvent(event: any): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }
}

// Decorator for command handlers
export function CommandHandlerDecorator<T extends { new(...args: any[]): {} }>(
  commandType: new (...args: any[]) => ICommand
) {
  return (constructor: T) => {
    // Auto-register handler when class is instantiated
    const originalConstructor = constructor;
    const newConstructor: any = function (...args: any[]) {
      const instance = new originalConstructor(...args);

      // Get global command bus if available
      const commandBus = (globalThis as any).commandBus;
      if (commandBus) {
        commandBus.register(commandType, instance);
      }

      return instance;
    };

    newConstructor.prototype = originalConstructor.prototype;
    return newConstructor;
  };
}