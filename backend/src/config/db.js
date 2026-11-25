import { Sequelize } from 'sequelize';
import { env } from './env.js';
import { buildConfig } from './config.js';

const dbConfig = buildConfig(env.NODE_ENV);

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: dbConfig.pool,
  dialectOptions: dbConfig.dialectOptions,
  define: dbConfig.define,
});

export async function testDatabaseConnection() {
  await sequelize.authenticate();
}
