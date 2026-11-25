import { createApp } from './app.js';
import { env } from './config/env.js';
import { sequelize, testDatabaseConnection } from './config/db.js';
import { logger } from './utils/logger.js';

const app = createApp();

let server;

async function startServer() {
  try {
    await testDatabaseConnection();
    logger.info('Conexión con PostgreSQL verificada correctamente');
  } catch (err) {
    logger.error({ err: err.message }, 'No se pudo conectar inicialmente con PostgreSQL');
  }

  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'SecureVault API escuchando');
  });
}

async function shutdown(signal) {
  logger.info({ signal }, 'Iniciando cierre ordenado');
  if (server) {
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  } else {
    await sequelize.close();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A10: Manejo seguro de promesas rechazadas y excepciones no capturadas
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'unhandledRejection detectado');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message }, 'uncaughtException detectado; cerrando proceso');
  process.exit(1);
});

startServer();
