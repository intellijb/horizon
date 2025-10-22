import { DomainEvent } from '../core/domain-event';
import { IEventMetadata, EventPriority } from '../core/types';

export class UserLoggedInEvent extends DomainEvent {
  readonly eventType = 'UserLoggedIn';
  readonly version = 1;
  readonly topic = 'auth.login';
  readonly priority = EventPriority.HIGH;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly deviceId: string,
    public readonly deviceName: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly loginMethod: 'password' | 'oauth' | 'sso' = 'password',
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      email: this.email,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      loginMethod: this.loginMethod,
      timestamp: this.timestamp,
    };
  }
}

export class UserRegisteredEvent extends DomainEvent {
  readonly eventType = 'UserRegistered';
  readonly version = 1;
  readonly topic = 'auth.register';
  readonly priority = EventPriority.HIGH;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly registrationSource: string = 'web',
    public readonly ipAddress?: string,
    public readonly referralCode?: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      email: this.email,
      registrationSource: this.registrationSource,
      ipAddress: this.ipAddress,
      referralCode: this.referralCode,
      timestamp: this.timestamp,
    };
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  readonly eventType = 'UserLoggedOut';
  readonly version = 1;
  readonly topic = 'auth.logout';
  readonly priority = EventPriority.NORMAL;

  constructor(
    public readonly userId: string,
    public readonly deviceId: string,
    public readonly reason: 'user_initiated' | 'session_expired' | 'forced' = 'user_initiated',
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      deviceId: this.deviceId,
      reason: this.reason,
      timestamp: this.timestamp,
    };
  }
}

export class LoginFailedEvent extends DomainEvent {
  readonly eventType = 'LoginFailed';
  readonly version = 1;
  readonly topic = 'auth.login.failed';
  readonly priority = EventPriority.HIGH;

  constructor(
    public readonly email: string,
    public readonly reason: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly attemptNumber?: number,
    metadata?: Partial<IEventMetadata>
  ) {
    super(metadata);
  }

  toJSON(): any {
    return {
      email: this.email,
      reason: this.reason,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      attemptNumber: this.attemptNumber,
      timestamp: this.timestamp,
    };
  }
}

export class TokenRefreshedEvent extends DomainEvent {
  readonly eventType = 'TokenRefreshed';
  readonly version = 1;
  readonly topic = 'auth.token.refreshed';
  readonly priority = EventPriority.LOW;

  constructor(
    public readonly userId: string,
    public readonly deviceId: string,
    public readonly oldTokenJti: string,
    public readonly newTokenJti: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      deviceId: this.deviceId,
      oldTokenJti: this.oldTokenJti,
      newTokenJti: this.newTokenJti,
      timestamp: this.timestamp,
    };
  }
}

export class PasswordChangedEvent extends DomainEvent {
  readonly eventType = 'PasswordChanged';
  readonly version = 1;
  readonly topic = 'auth.password.changed';
  readonly priority = EventPriority.CRITICAL;

  constructor(
    public readonly userId: string,
    public readonly changedBy: 'user' | 'admin' | 'system',
    public readonly ipAddress?: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      changedBy: this.changedBy,
      ipAddress: this.ipAddress,
      timestamp: this.timestamp,
    };
  }
}

export class AccountLockedEvent extends DomainEvent {
  readonly eventType = 'AccountLocked';
  readonly version = 1;
  readonly topic = 'auth.account.locked';
  readonly priority = EventPriority.CRITICAL;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly reason: string,
    public readonly lockedUntil?: Date,
    public readonly attemptCount?: number,
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      email: this.email,
      reason: this.reason,
      lockedUntil: this.lockedUntil,
      attemptCount: this.attemptCount,
      timestamp: this.timestamp,
    };
  }
}

export class AccountUnlockedEvent extends DomainEvent {
  readonly eventType = 'AccountUnlocked';
  readonly version = 1;
  readonly topic = 'auth.account.unlocked';
  readonly priority = EventPriority.HIGH;

  constructor(
    public readonly userId: string,
    public readonly unlockedBy: 'automatic' | 'admin' | 'user',
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      unlockedBy: this.unlockedBy,
      timestamp: this.timestamp,
    };
  }
}

export class DeviceAddedEvent extends DomainEvent {
  readonly eventType = 'DeviceAdded';
  readonly version = 1;
  readonly topic = 'auth.device.added';
  readonly priority = EventPriority.NORMAL;

  constructor(
    public readonly userId: string,
    public readonly deviceId: string,
    public readonly deviceName: string,
    public readonly deviceType: string,
    public readonly trusted: boolean = false,
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      trusted: this.trusted,
      timestamp: this.timestamp,
    };
  }
}

export class SuspiciousActivityDetectedEvent extends DomainEvent {
  readonly eventType = 'SuspiciousActivityDetected';
  readonly version = 1;
  readonly topic = 'auth.security.suspicious';
  readonly priority = EventPriority.CRITICAL;

  constructor(
    public readonly userId: string | undefined,
    public readonly activityType: string,
    public readonly details: Record<string, any>,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    metadata?: Partial<IEventMetadata>
  ) {
    super({ ...metadata, userId });
  }

  toJSON(): any {
    return {
      userId: this.userId,
      activityType: this.activityType,
      details: this.details,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      timestamp: this.timestamp,
    };
  }
}