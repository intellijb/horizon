import { buildApp } from './app.js';

const start = async () => {
  const app = await buildApp();
  
  try {
    const port = app.config.PORT || 3000;
    const host = app.config.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();