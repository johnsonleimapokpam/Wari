const app = require('./src/app');
const { env } = require('./src/config/env');
const { pool } = require('./src/config/db');

const server = app.listen(env.PORT, () => {
  console.log(`API server listening on port ${env.PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
