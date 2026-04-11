const { Pool } = require('pg');
const { getDatabaseUrl } = require('../config/env');

const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
