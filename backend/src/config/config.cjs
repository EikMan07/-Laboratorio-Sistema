require('dotenv').config();

function decodeCa(rawCa) {
  if (!rawCa) return null;
  const trimmed = rawCa.trim();
  if (trimmed.includes('BEGIN CERTIFICATE')) {
    return trimmed.replace(/\\n/g, '\n');
  }
  return Buffer.from(trimmed, 'base64').toString('utf8');
}

function buildSslOption(databaseUrl = process.env.DATABASE_URL || '', nodeEnv = process.env.NODE_ENV) {
  const ca = decodeCa(process.env.DB_SSL_CA);
  if (ca) {
    return {
      require: true,
      rejectUnauthorized: true,
      ca,
    };
  }

  const requiresSsl = nodeEnv === 'production' || databaseUrl.includes('supabase');
  if (requiresSsl) {
    return {
      require: true,
      rejectUnauthorized: false,
    };
  }

  return false;
}

function buildConfig(nodeEnv) {
  const databaseUrl = process.env.DATABASE_URL || '';
  const ssl = buildSslOption(databaseUrl, nodeEnv);

  return {
    use_env_variable: 'DATABASE_URL',
    url: databaseUrl,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      idle: 30000,
      acquire: 5000,
    },
    dialectOptions: {
      statement_timeout: 5000,
      ...(ssl ? { ssl } : {}),
    },
    define: {
      underscored: true,
    },
  };
}

module.exports = {
  development: buildConfig('development'),
  test: buildConfig('test'),
  production: buildConfig('production'),
  buildConfig,
  buildSslOption,
};
