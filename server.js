const http = require('http');
const app = require('./src/app');
const { env } = require('./src/config/env');
const { pool } = require('./src/config/db');
const { initializeSocketServer } = require('./src/sockets/socketServer');

const httpServer = http.createServer(app);
const io = initializeSocketServer(httpServer);

const server = httpServer.listen(env.PORT, () => {
  console.log(`API server listening on port ${env.PORT}`);
});

const shutdown = async () => {
  io.close(() => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
