import http from 'http';
import { logger } from '../lib/logger.js';
import { env } from '../utils/env.js';

/**
 * Simple HTTP server for Railway health checks on worker services
 * Workers don't expose HTTP endpoints by default, so this provides
 * a minimal health check endpoint for Railway's monitoring
 */

// On Railway, PORT is injected per-service and is what Railway probes for health checks.
// Fall back to HEALTH_CHECK_PORT for local dev, then 3001.
const DEFAULT_HEALTH_PORT = Number(process.env.PORT) || env.HEALTH_CHECK_PORT || 3001;

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  uptime: number;
}

let isHealthy = true;
const startTime = Date.now();

export function setHealthStatus(healthy: boolean): void {
  isHealthy = healthy;
}

export function startHealthServer(serviceName: string, portNumber?: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const status: HealthStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: serviceName,
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };

      const statusCode = isHealthy ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
      
      logger.debug('Health check requested', { status: status.status, service: serviceName });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(portNumber ?? DEFAULT_HEALTH_PORT, () => {
    logger.info(`Health check server started`, { 
      service: serviceName, 
      port: portNumber ?? DEFAULT_HEALTH_PORT,
    });
  });

  return server;
}

export function stopHealthServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        logger.error('Error stopping health server', { error: err });
        reject(err);
      } else {
        logger.info('Health server stopped');
        resolve();
      }
    });
  });
}
