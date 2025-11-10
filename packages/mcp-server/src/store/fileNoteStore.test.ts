import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import { FileNoteStore } from './fileNoteStore.js';

const tmpRoot = path.join(os.tmpdir(), 'chappy-note-test');

const createStore = () => {
  const base = path.join(tmpRoot, `store-${Date.now()}-${Math.random()}`);
  const notesRoot = path.join(base, 'data/notes');
  return { store: new FileNoteStore(notesRoot), root: base };
};

beforeEach(async () => {
  await fs.mkdir(tmpRoot, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('FileNoteStore', () => {
  it('creates and retrieves notes', async () => {
    const { store, root } = createStore();
    await store.init();

    const note = await store.createNote({
      title: 'Test Note',
      content: 'Hello World',
      tags: ['Test', 'HELLO'],
    });

    expect(note.id).toBeDefined();
    const expectedPath = path.join(root, 'data', 'notes', `${note.id}.md`);
    expect(note.contentPath).toBe(expectedPath);
    const fetched = await store.getNote(note.id);
    expect(fetched?.content).toContain('Hello World');
    expect(fetched?.tags).toEqual(['test', 'hello']);
  });

  it('updates notes and maintains timestamps', async () => {
    const { store, root } = createStore();
    await store.init();

    const note = await store.createNote({
      title: 'First',
      content: 'Body',
    });

    const updated = await store.updateNote({
      id: note.id,
      title: 'Updated',
      content: 'Updated Body',
    });

    expect(updated?.title).toBe('Updated');
    expect(updated?.content).toContain('Updated Body');
    const list = await store.listNotes();
    expect(list[0].title).toBe('Updated');

    // metadata-only update keeps raw content while refreshing markdown header
    await store.updateNote({
      id: note.id,
      title: 'New Title Only',
    });
    const afterMetaUpdate = await store.getNote(note.id);
    expect(afterMetaUpdate?.content).toBe('Updated Body');
    const markdownPath = path.join(root, 'data', 'notes', `${note.id}.md`);
    const markdown = await fs.readFile(markdownPath, 'utf-8');
    expect(markdown.split('\n')[0]).toBe('# New Title Only');
  });

  it('searches by query and tags', async () => {
    const { store } = createStore();
    await store.init();

    await store.createNote({
      title: 'Async JS',
      content: 'JavaScript async awaits',
      tags: ['js', 'async'],
      sourceConversationId: 'conv-async',
    });

    await store.createNote({
      title: 'React patterns',
      content: 'Components and hooks',
      tags: ['react'],
      summary: 'Hooks summary',
    });

    const queryResults = await store.searchNotes({ query: 'async' });
    expect(queryResults).toHaveLength(1);

    const tagResults = await store.searchNotes({ tags: ['react'] });
    expect(tagResults).toHaveLength(1);

    const summaryResults = await store.searchNotes({ query: 'summary' });
    expect(summaryResults).toHaveLength(1);
  });

  it('stores and updates sourceConversationId metadata', async () => {
    const { store } = createStore();
    await store.init();

    const created = await store.createNote({
      title: 'Conversation linked',
      content: 'Initial body',
      sourceConversationId: 'conv-123',
    });

    expect(created.sourceConversationId).toBe('conv-123');

    await store.updateNote({
      id: created.id,
      title: 'Conversation linked v2',
      sourceConversationId: 'conv-456',
    });

    const fetched = await store.getNote(created.id);
    expect(fetched?.sourceConversationId).toBe('conv-456');
  });
});
