import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  sourceConversationId: z.string().optional(),
  contentPath: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Note = z.infer<typeof NoteSchema>;

export const normalizeTag = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .replace(/\s+/g, '-');
