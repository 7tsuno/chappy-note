import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { FileNoteStore } from '../store/fileNoteStore.js';
import { NotesService } from './notesService.js';

const tmpRoot = path.join(os.tmpdir(), 'chappy-note-notes-service-test');

const createService = async () => {
  const base = path.join(tmpRoot, `svc-${Date.now()}-${Math.random()}`);
  const notesRoot = path.join(base, 'data/notes');
  await fs.mkdir(notesRoot, { recursive: true });
  const store = new FileNoteStore(notesRoot);
  await store.init();
  const service = new NotesService(store);
  return { service, store, base };
};

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('NotesService', () => {
  it('lists notes with tag filters applied', async () => {
    const { service, store } = await createService();
    await store.createNote({
      title: 'Async tips',
      content: 'await Promise.all',
      tags: ['Async', 'JavaScript'],
    });
    await store.createNote({
      title: 'React patterns',
      content: 'Hooks and components',
      tags: ['react'],
    });

    const result = await service.listNotes({ limit: 5, tags: ['async'] });

    expect(result.payload.notes).toHaveLength(1);
    expect(result.payload.meta?.appliedTags).toEqual(['async']);
    expect(result.payload.notes[0].matchingTags).toEqual(['async']);
  });

  it('searches notes and scores matches by relevance', async () => {
    const { service, store } = await createService();
    await store.createNote({
      title: 'React Suspense',
      content: 'React suspense lets you coordinate loading states.',
      tags: ['react'],
      summary: 'React concurrent rendering memo',
    });
    await store.createNote({
      title: 'Node profiling',
      content: 'Use node --prof',
      tags: ['node'],
    });

    const result = await service.searchNotes({ query: 'react', limit: 5 });

    expect(result.payload.notes[0].title).toContain('React');
    expect(result.payload.notes[0].matchScore ?? 0).toBeGreaterThan(0.4);
    expect(result.payload.meta?.query).toBe('react');
  });

  it('generates editor drafts from conversation context', async () => {
    const { service } = await createService();
    const payload = await service.generateDraft({
      conversationContext: {
        topic: 'Weekly retro',
        turns: [
          { role: 'user', content: 'まとめてノートにしておいてください。' },
          { role: 'assistant', content: '了解しました。要点はA/B/Cです。' },
        ],
      },
      tagHints: ['Weekly Notes', 'Team'],
    });

    expect(payload.draft.title).toContain('Weekly');
    expect(payload.draft.tags?.slice(0, 2)).toEqual(['weekly-notes', 'team']);
    expect((payload.draft.tags ?? []).length).toBeGreaterThan(2);
    expect(payload.draft.content).toContain('### User');
    expect(payload.suggestions.tags).toEqual(payload.draft.tags);
  });

  it('creates notes and returns detail plus list snapshot', async () => {
    const { service } = await createService();
    const result = await service.createNote({
      title: 'Zod basics',
      content: 'Zod is a validation library.',
      tags: ['TypeScript'],
    });

    expect(result.payload.note.title).toBe('Zod basics');
    expect(result.listSnapshot.notes[0].title).toBe('Zod basics');
    expect(result.listSnapshot.total).toBe(1);
  });

  it('auto assigns tags on create when none are provided', async () => {
    const { service } = await createService();
    const result = await service.createNote({
      title: 'GraphQL Clients',
      content: 'Compare Apollo Client to URQL for GraphQL caching strategies.',
    });

    expect(result.payload.note.tags.length).toBeGreaterThan(0);
    expect(result.payload.note.tags).toContain('graphql');
  });
});
