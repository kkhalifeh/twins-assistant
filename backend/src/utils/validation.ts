import { Response } from 'express';

export const validateRequiredFields = (
  fields: Record<string, any>,
  requiredFields: string[],
  res: Response
): boolean => {
  for (const field of requiredFields) {
    if (!fields[field]) {
      res.status(400).json({ 
        error: `Missing required field: ${field}` 
      });
      return false;
    }
  }
  return true;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateDate = (date: string): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

export const parseFloatSafe = (value: any): number | null => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

export const parseIntSafe = (value: any): number | null => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};
