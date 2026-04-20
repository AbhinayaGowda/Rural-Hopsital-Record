import { logger } from '../lib/logger.js';

export function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500;
  if (status >= 500) logger.error(err);
  res.status(status).json({
    data: null,
    error: {
      code: err.code ?? 'INTERNAL',
      message: err.message ?? 'An unexpected error occurred',
    },
  });
}
