import { describe, expect, it } from 'vitest';
import { normalizeTag, NoteSchema } from './index.js';

describe('NoteSchema', () => {
  it('validates a note', () => {
    const payload = {
      id: '00000000-0000-4000-8000-000000000000',
      title: 'Sample',
      tags: ['sample'],
      sourceConversationId: 'abc',
      contentPath: 'data/notes/sample.md',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(NoteSchema.parse(payload)).toEqual(payload);
  });
});

describe('normalizeTag', () => {
  it('normalizes complex tag names', () => {
    expect(normalizeTag(' Data Science! ')).toBe('data-science');
  });
});
