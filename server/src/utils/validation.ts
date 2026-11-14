/*
 * LEARNING NOTE: Shared boundary validators keep untrusted HTTP input checks consistent.
 * Interview tip: explain why validation belongs at the API boundary as well as in database schemas.
 */

export const isValidEmail = (value: string): boolean =>
  /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);

export const isValidPassword = (value: string): boolean => value.length >= 8;

export const isValidPdfBuffer = (value: Buffer): boolean =>
  value.length >= 5 && value.subarray(0, 5).toString('ascii') === '%PDF-';
