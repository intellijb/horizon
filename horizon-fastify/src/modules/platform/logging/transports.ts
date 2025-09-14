import pino from 'pino';
import { isProduction, isDevelopment } from '@config';

// Production transport configuration
export function createProductionTransport(): pino.TransportSingleOptions | pino.TransportMultiOptions {
  const targets: pino.TransportTargetOptions[] = [];

  // JSON file transport for production logs
  targets.push({
    target: 'pino/file',
    level: 'info',
    options: {
      destination: process.stdout.fd, // Use stdout for containerized environments
    },
  });

  // Error-only file transport
  targets.push({
    target: 'pino/file',
    level: 'error',
    options: {
      destination: process.stderr.fd, // Use stderr for errors
    },
  });

  // If running in production with log aggregation, use multiple targets
  if (targets.length > 1) {
    return {
      targets,
      options: {
        worker: {
          // Use worker threads for better performance
          maxEventLoopDelay: 500,
        },
      },
    };
  }

  return targets[0];
}

// Development transport configuration
export function createDevelopmentTransport(): pino.TransportSingleOptions {
  return {
    target: 'pino-pretty',
    options: {
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      colorize: true,
      singleLine: false,
      hideObject: false,
      sync: false, // Async for better performance
      append: true,
      mkdir: true,
    },
  };
}

// Create environment-appropriate transport
export function createTransport(): pino.TransportSingleOptions | pino.TransportMultiOptions | undefined {
  if (isDevelopment) {
    return createDevelopmentTransport();
  }
  
  if (isProduction) {
    return createProductionTransport();
  }
  
  // Default to no transport (raw JSON to stdout)
  return undefined;
}

// Transport for specific log levels
export function createLevelBasedTransport(level: pino.Level): pino.TransportSingleOptions {
  if (isDevelopment) {
    return {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
      },
    };
  }

  return {
    target: 'pino/file',
    options: {
      destination: level === 'error' ? process.stderr.fd : process.stdout.fd,
    },
  };
}

// Create async transport for high-performance production logging
export function createAsyncTransport(): pino.TransportSingleOptions {
  return {
    target: '@pino/file',
    options: {
      destination: './logs/app.log',
      mkdir: true,
      append: true,
      sync: false,
    },
  };
}

// Metrics transport for performance logging
export function createMetricsTransport(): pino.TransportSingleOptions {
  return {
    target: 'pino/file',
    options: {
      destination: './logs/metrics.log',
      mkdir: true,
      append: true,
    },
  };
}