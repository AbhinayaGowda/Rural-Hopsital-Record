import { AppError } from './AppError.js';

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    throw new AppError('VALIDATION_ERROR', msg, 400);
  }
  return result.data;
}
