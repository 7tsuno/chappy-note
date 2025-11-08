import { describe, expect, it } from 'vitest';
import {
  ConversationContextSchema,
  NoteDetailPayloadSchema,
  NoteEditorDraftPayloadSchema,
  NoteMetadataSchema,
  NotePreviewPayloadSchema,
  normalizeTag,
  renderNoteMarkdown,
  TagsSchema
} from './index.js';
import { noteDetailFixture } from './fixtures/noteDetailFixture.js';
import { notePreviewFixture } from './fixtures/notePreviewFixture.js';
import { noteEditorDraftFixture } from './fixtures/noteEditorDraftFixture.js';

const baseMeta = {
  id: '00000000-0000-4000-8000-000000000000',
  title: 'Sample',
  tags: ['sample'],
  sourceConversationId: 'conv-1',
  contentPath: 'data/notes/sample.md',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('NoteMetadataSchema', () => {
  it('validates metadata with normalized tags', () => {
    const parsed = NoteMetadataSchema.parse(baseMeta);
    expect(parsed.title).toBe('Sample');
  });
});

describe('TagsSchema & normalizeTag', () => {
  it('normalizes and validates tags', () => {
    const normalized = normalizeTag(' Data Science! ');
    expect(normalized).toBe('data-science');
    expect(() => TagsSchema.parse([normalized])).not.toThrow();
  });
});

describe('Structured content payloads', () => {
  it('parses preview payload fixtures', () => {
    const parsed = NotePreviewPayloadSchema.parse(notePreviewFixture);
    expect(parsed.notes[0].matchScore).toBeCloseTo(0.92);
  });

  it('parses detail payloads', () => {
    const payload = {
      ...noteDetailFixture,
      note: { ...noteDetailFixture.note, markdown: renderNoteMarkdown({
        title: noteDetailFixture.note.title,
        tags: noteDetailFixture.note.tags,
        body: noteDetailFixture.note.content,
        metadata: {
          createdAt: noteDetailFixture.note.createdAt,
          updatedAt: noteDetailFixture.note.updatedAt,
          sourceConversationId: noteDetailFixture.note.sourceConversationId
        }
      }) }
    };

    const parsed = NoteDetailPayloadSchema.parse(payload);
    expect(parsed.note.markdown).toContain('# Async Patterns in JS');
  });

  it('parses editor draft payloads', () => {
    const parsedCreate = NoteEditorDraftPayloadSchema.parse(noteEditorDraftFixture);
    expect(parsedCreate.mode).toBe('create');
    const editPayload = {
      type: 'noteEditorDraft' as const,
      mode: 'edit' as const,
      draft: {
        ...baseMeta,
        content: 'Updated content'
      }
    };
    const parsedEdit = NoteEditorDraftPayloadSchema.parse(editPayload);
    expect(parsedEdit.mode).toBe('edit');
  });
});

describe('ConversationContextSchema', () => {
  it('accepts messages with roles', () => {
    const ctx = {
      turns: [
        { role: 'user', content: 'What is React?' },
        { role: 'assistant', content: 'A UI library.' }
      ]
    };

    expect(ConversationContextSchema.parse(ctx).turns).toHaveLength(2);
  });
});

describe('renderNoteMarkdown', () => {
  it('renders metadata, body, sections, and diagrams', () => {
    const markdown = renderNoteMarkdown({
      title: 'Sample',
      tags: ['Web Dev', 'React'],
      body: 'Main body',
      summary: 'Quick summary',
      sections: [{ heading: 'Details', content: 'More details' }],
      diagrams: [{ fileName: 'diagram.svg', caption: 'Architecture' }],
      metadata: { createdAt: '2025-11-08T00:00:00.000Z' }
    });

    expect(markdown).toContain('# Sample');
    expect(markdown).toContain('Tags: #web-dev #react');
    expect(markdown).toContain('## Details');
    expect(markdown).toContain('![Architecture](figures/diagram.svg)');
  });
});
