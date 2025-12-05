import { z } from 'zod';
import { ElizaValidationError } from '../errors/ElizaValidationError.js';

const ExampleMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(1000),
});

const CharacterStyleSchema = z.object({
  all: z.array(z.string()).optional(),
  chat: z.array(z.string()).optional(),
  post: z.array(z.string()).optional(),
});

export const CreateCharacterInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  personality: z.string().min(10, 'Personality must be at least 10 characters').max(5000),
  backstory: z.string().min(10, 'Backstory must be at least 10 characters').max(10000),
  systemPrompt: z.string().max(5000).optional(),
  exampleMessages: z.array(ExampleMessageSchema).max(20).optional(),
  style: CharacterStyleSchema.optional(),
  externalId: z.string().max(255).optional(),
});

export const UpdateCharacterInputSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  personality: z.string().min(10).max(5000).optional(),
  backstory: z.string().min(10).max(10000).optional(),
  systemPrompt: z.string().max(5000).optional(),
  exampleMessages: z.array(ExampleMessageSchema).max(20).optional(),
  style: CharacterStyleSchema.optional(),
});

export type CreateCharacterInputValidated = z.infer<typeof CreateCharacterInputSchema>;
export type UpdateCharacterInputValidated = z.infer<typeof UpdateCharacterInputSchema>;

export function validateCreateCharacter(input: unknown): CreateCharacterInputValidated {
  const result = CreateCharacterInputSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    throw ElizaValidationError.fromFields(fieldErrors);
  }

  return result.data;
}

export function validateUpdateCharacter(input: unknown): UpdateCharacterInputValidated {
  const result = UpdateCharacterInputSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    throw ElizaValidationError.fromFields(fieldErrors);
  }

  return result.data;
}
