import { describe, expect, it } from 'vitest';
import type { NoteMetadata } from '@chappy/shared';
import { filterByTags, fullTextSearch } from './searchEngine.js';

const sampleNotes: NoteMetadata[] = [
  {
    id: '1',
    title: 'Async JavaScript',
    tags: ['javascript', 'async'],
    sourceConversationId: undefined,
    contentPath: 'notes/1.md',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary: 'Promises and async/await overview',
  },
  {
    id: '2',
    title: 'React patterns',
    tags: ['react'],
    sourceConversationId: undefined,
    contentPath: 'notes/2.md',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary: 'Hooks and Suspense',
  },
];

describe('searchEngine', () => {
  it('filters by multiple tags (AND)', () => {
    const filtered = filterByTags(sampleNotes, ['javascript', 'async']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('returns all notes when no tags are provided', () => {
    expect(filterByTags(sampleNotes, [])).toHaveLength(2);
  });

  it('performs full text search including summaries and content', async () => {
    const results = await fullTextSearch(sampleNotes, 'hooks', async (note) =>
      note.id === '1' ? 'Callback queue details' : 'Hooks deep dive'
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });
});
