import pinoHttp from 'pino-http';
import logger from '../lib/logger.js';
import { sanitizeObject } from './logSanitizer.js';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as any).id,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  // Sanitize request bodies before logging to prevent sensitive data leaks
  serializers: {
    req(req) {
      const serialized: Record<string, unknown> = {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          // Don't log Authorization header
          host: req.headers.host,
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent'],
          'x-request-id': req.headers['x-request-id'],
        },
      };

      // Sanitize body — remove passwords, tokens, etc.
      if (req.body && typeof req.body === 'object') {
        serialized.body = sanitizeObject(req.body);
      }

      return serialized;
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
  // Don't log request body for certain paths
  autoLogging: {
  },
});
