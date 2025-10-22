export interface ICommand {
  readonly commandId?: string;
  readonly timestamp?: Date;
  readonly userId?: string;
  readonly correlationId?: string;
}

export interface IQuery {
  readonly queryId?: string;
  readonly timestamp?: Date;
  readonly userId?: string;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}

export interface ICommandBus {
  execute<TCommand extends ICommand, TResult = void>(
    command: TCommand
  ): Promise<TResult>;

  register<TCommand extends ICommand, TResult = void>(
    commandType: new (...args: any[]) => TCommand,
    handler: ICommandHandler<TCommand, TResult>
  ): void;
}

export interface IQueryBus {
  execute<TQuery extends IQuery, TResult>(
    query: TQuery
  ): Promise<TResult>;

  register<TQuery extends IQuery, TResult>(
    queryType: new (...args: any[]) => TQuery,
    handler: IQueryHandler<TQuery, TResult>
  ): void;
}

export interface ICommandValidator<TCommand extends ICommand> {
  validate(command: TCommand): Promise<ValidationResult>;
}

export interface IQueryValidator<TQuery extends IQuery> {
  validate(query: TQuery): Promise<ValidationResult>;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  registerNew(entity: any): void;
  registerDirty(entity: any): void;
  registerDeleted(entity: any): void;
}

export interface IProjection {
  readonly projectionId: string;
  readonly version: number;
  readonly lastEventId?: string;
  readonly lastUpdated: Date;
}

export interface IProjectionBuilder<TEvent = any, TProjection = any> {
  build(events: TEvent[]): Promise<TProjection>;
  update(projection: TProjection, event: TEvent): Promise<TProjection>;
}

export interface IReadModel {
  readonly id: string;
  readonly version: number;
  readonly lastModified: Date;
}

export interface IWriteModel {
  readonly aggregateId: string;
  readonly version: number;
  applyEvent(event: any): void;
  getUncommittedEvents(): any[];
  markEventsAsCommitted(): void;
}