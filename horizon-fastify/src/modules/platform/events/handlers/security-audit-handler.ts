import { BaseEventHandler, EventHandler, HandleEvent, RetryableHandler } from './decorators';
import {
  UserLoggedInEvent,
  UserRegisteredEvent,
  LoginFailedEvent,
  AccountLockedEvent,
  PasswordChangedEvent,
  SuspiciousActivityDetectedEvent
} from '../schemas/auth-events';
import { IEventMetadata } from '../core/types';

interface SecurityLog {
  timestamp: Date;
  eventType: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  correlationId?: string;
}

@EventHandler(
  UserLoggedInEvent,
  LoginFailedEvent,
  AccountLockedEvent,
  PasswordChangedEvent,
  SuspiciousActivityDetectedEvent
)
@RetryableHandler({
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
})
export class SecurityAuditHandler extends BaseEventHandler {
  private logs: SecurityLog[] = [];

  @HandleEvent()
  async handle(event: any, metadata?: IEventMetadata): Promise<void> {
    const log = this.createSecurityLog(event, metadata);

    // Store in memory for now (would be stored in database/logging service)
    this.logs.push(log);

    // Log to console for monitoring
    this.logToConsole(log);

    // Check for patterns requiring immediate action
    await this.checkSecurityPatterns(log);
  }

  private createSecurityLog(event: any, metadata?: IEventMetadata): SecurityLog {
    const baseLog: SecurityLog = {
      timestamp: event.timestamp || new Date(),
      eventType: event.eventType || event.constructor.name,
      severity: this.determineSeverity(event),
      details: {},
      correlationId: metadata?.correlationId,
    };

    if (event instanceof UserLoggedInEvent) {
      return {
        ...baseLog,
        userId: event.userId,
        email: event.email,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        severity: 'low',
        details: {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          loginMethod: event.loginMethod,
        },
      };
    }

    if (event instanceof LoginFailedEvent) {
      return {
        ...baseLog,
        email: event.email,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        severity: event.attemptNumber && event.attemptNumber > 3 ? 'high' : 'medium',
        details: {
          reason: event.reason,
          attemptNumber: event.attemptNumber,
        },
      };
    }

    if (event instanceof AccountLockedEvent) {
      return {
        ...baseLog,
        userId: event.userId,
        email: event.email,
        severity: 'critical',
        details: {
          reason: event.reason,
          lockedUntil: event.lockedUntil,
          attemptCount: event.attemptCount,
        },
      };
    }

    if (event instanceof PasswordChangedEvent) {
      return {
        ...baseLog,
        userId: event.userId,
        ipAddress: event.ipAddress,
        severity: event.changedBy === 'admin' ? 'high' : 'medium',
        details: {
          changedBy: event.changedBy,
        },
      };
    }

    if (event instanceof SuspiciousActivityDetectedEvent) {
      return {
        ...baseLog,
        userId: event.userId || undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        severity: 'critical',
        details: {
          activityType: event.activityType,
          ...event.details,
        },
      };
    }

    // Default log for unknown events
    return {
      ...baseLog,
      details: event,
    };
  }

  private determineSeverity(event: any): 'low' | 'medium' | 'high' | 'critical' {
    if (event instanceof SuspiciousActivityDetectedEvent || event instanceof AccountLockedEvent) {
      return 'critical';
    }
    if (event instanceof PasswordChangedEvent) {
      return 'high';
    }
    if (event instanceof LoginFailedEvent) {
      return 'medium';
    }
    return 'low';
  }

  private logToConsole(log: SecurityLog): void {
    const prefix = `[SECURITY-${log.severity.toUpperCase()}]`;
    const message = `${prefix} ${log.eventType}`;

    const logData = {
      timestamp: log.timestamp.toISOString(),
      ...log,
    };

    switch (log.severity) {
      case 'critical':
        console.error(message, logData);
        break;
      case 'high':
        console.warn(message, logData);
        break;
      default:
        console.log(message, logData);
    }
  }

  private async checkSecurityPatterns(log: SecurityLog): Promise<void> {
    // Check for brute force attempts
    if (log.eventType === 'LoginFailed') {
      const recentFailures = this.getRecentFailuresForEmail(log.email!);
      if (recentFailures.length >= 5) {
        await this.alertSecurityTeam('Possible brute force attack', {
          email: log.email,
          attempts: recentFailures.length,
          ipAddresses: [...new Set(recentFailures.map(l => l.ipAddress))],
        });
      }
    }

    // Check for suspicious IP patterns
    if (log.ipAddress) {
      const recentFromIp = this.getRecentLogsFromIp(log.ipAddress);
      if (recentFromIp.length >= 10 && this.hasMixedUsers(recentFromIp)) {
        await this.alertSecurityTeam('Suspicious IP activity', {
          ipAddress: log.ipAddress,
          eventCount: recentFromIp.length,
          affectedUsers: [...new Set(recentFromIp.map(l => l.userId).filter(Boolean))],
        });
      }
    }

    // Check for rapid password changes
    if (log.eventType === 'PasswordChanged') {
      const recentPasswordChanges = this.getRecentPasswordChanges(log.userId!);
      if (recentPasswordChanges.length >= 2) {
        await this.alertSecurityTeam('Multiple password changes detected', {
          userId: log.userId,
          changeCount: recentPasswordChanges.length,
        });
      }
    }
  }

  private getRecentFailuresForEmail(email: string): SecurityLog[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.logs.filter(
      log =>
        log.eventType === 'LoginFailed' &&
        log.email === email &&
        log.timestamp > fiveMinutesAgo
    );
  }

  private getRecentLogsFromIp(ipAddress: string): SecurityLog[] {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return this.logs.filter(
      log => log.ipAddress === ipAddress && log.timestamp > tenMinutesAgo
    );
  }

  private getRecentPasswordChanges(userId: string): SecurityLog[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.logs.filter(
      log =>
        log.eventType === 'PasswordChanged' &&
        log.userId === userId &&
        log.timestamp > oneHourAgo
    );
  }

  private hasMixedUsers(logs: SecurityLog[]): boolean {
    const userIds = logs.map(l => l.userId).filter(Boolean);
    return new Set(userIds).size > 3;
  }

  private async alertSecurityTeam(alertType: string, details: Record<string, any>): Promise<void> {
    // In production, this would send alerts via email, Slack, PagerDuty, etc.
    console.error(`[SECURITY-ALERT] ${alertType}`, {
      timestamp: new Date().toISOString(),
      ...details,
    });

    // Could also publish a security alert event
    // await this.eventBus.publish(new SecurityAlertEvent(alertType, details));
  }

  // Method to retrieve logs for monitoring/analysis
  getSecurityLogs(
    filters?: {
      userId?: string;
      email?: string;
      eventType?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): SecurityLog[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.email) {
        filteredLogs = filteredLogs.filter(log => log.email === filters.email);
      }
      if (filters.eventType) {
        filteredLogs = filteredLogs.filter(log => log.eventType === filters.eventType);
      }
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate);
      }
    }

    return filteredLogs;
  }

  // Clear old logs to prevent memory issues
  clearOldLogs(olderThan: Date): void {
    this.logs = this.logs.filter(log => log.timestamp > olderThan);
  }
}