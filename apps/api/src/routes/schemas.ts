/** Shared JSON-schema pieces for request validation. */

export const nameSchema = { type: 'string', minLength: 2, maxLength: 100 } as const;
export const emailSchema = { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', maxLength: 200 } as const;
export const mobileSchema = { type: 'string', pattern: '^\\+?[0-9 ]{8,16}$' } as const;
export const uuidParams = { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } } as const;
