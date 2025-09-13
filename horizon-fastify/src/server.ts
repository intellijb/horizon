import { buildApp } from './app';
import { setupGracefulShutdown } from '@modules/utils/shutdown';
import { config } from '@config';

const start = async () => {
  const app = await buildApp();
  
  // Setup graceful shutdown
  const shutdown = setupGracefulShutdown(app, app.log, {
    timeout: 30000, // 30 seconds
    forceExit: true,
    signals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
  });
  
  try {
    const port = config.PORT || 3000;
    const host = config.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    app.log.info(`🚀 Server listening on http://${host}:${port}`);
    app.log.info(`📋 Environment: ${config.NODE_ENV}`);
    app.log.info('✅ Server ready to handle requests');
    
    // Log shutdown handler registration
    app.log.info('🛡️ Graceful shutdown handlers registered');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Handle startup errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection during startup:', err);
  process.exit(1);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});