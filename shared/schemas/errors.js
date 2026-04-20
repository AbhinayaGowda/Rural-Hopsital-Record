export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR', // zod parse failure — show field-level
  NOT_FOUND:        'NOT_FOUND',        // resource doesn't exist
  FORBIDDEN:        'FORBIDDEN',        // role doesn't permit action
  UNAUTHORIZED:     'UNAUTHORIZED',     // no/invalid token
  CONFLICT:         'CONFLICT',         // unique constraint, duplicate head, etc.
  RPC_ERROR:        'RPC_ERROR',        // Postgres function raised
  INTERNAL:         'INTERNAL',         // unexpected — log + generic message
};
