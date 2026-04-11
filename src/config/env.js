function getMissingEnvVars() {
  const requiredVars = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

  return requiredVars.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim() === '';
  });
}

function validateDatabaseUrl(databaseUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw new Error('DATABASE_URL is invalid. Expected a full PostgreSQL connection string.');
  }

  const validProtocols = new Set(['postgres:', 'postgresql:']);
  if (!validProtocols.has(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
  }

  if (parsedUrl.password === '') {
    throw new Error('DATABASE_URL is missing the database password.');
  }
}

function validateEnv() {
  const missingVars = getMissingEnvVars();

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  validateDatabaseUrl(process.env.DATABASE_URL);
}

module.exports = {
  validateEnv,
};
