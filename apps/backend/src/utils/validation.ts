// =============================================
// UTILS - apps/backend/src/utils/validation.ts
// =============================================

import { z } from 'zod';

export const validateInput = <T>(schema: z.ZodSchema<T>, data: any): T => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    const error: any = new Error('Dados de entrada inválidos');
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }
  
  return result.data;
};
