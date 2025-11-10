import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  NoteMetadataSchema,
  NoteMetadata,
  NoteContent,
  normalizeTag,
  renderNoteMarkdown,
} from '@chappy/shared';

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
  summary?: string;
  sourceConversationId?: string;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  summary?: string;
  sourceConversationId?: string;
}

export interface SearchOptions {
  query?: string;
  tags?: string[];
}

interface IndexFile {
  notes: NoteMetadata[];
}

const INDEX_FILENAME = 'notes.index.json';

export class FileNoteStore {
  private readonly notesDir: string;
  private readonly figuresDir: string;
  private readonly rawDir: string;
  private readonly indexPath: string;

  constructor(private readonly rootDir: string = path.resolve(process.cwd(), 'data/notes')) {
    this.notesDir = this.rootDir;
    this.figuresDir = path.join(this.rootDir, 'figures');
    this.rawDir = path.join(this.rootDir, 'raw');
    this.indexPath = path.join(this.rootDir, INDEX_FILENAME);
  }

  async init() {
    await fs.mkdir(this.notesDir, { recursive: true });
    await fs.mkdir(this.figuresDir, { recursive: true });
    await fs.mkdir(this.rawDir, { recursive: true });
    try {
      await fs.access(this.indexPath);
    } catch {
      const initial: IndexFile = { notes: [] };
      await this.writeIndexFile(initial);
    }
  }

  async createNote(input: CreateNoteInput): Promise<NoteContent> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const tags = this.normalizeTags(input.tags);
    const metadata: NoteMetadata = {
      id,
      title: input.title,
      tags,
      sourceConversationId: input.sourceConversationId,
      contentPath: this.contentFilePath(id),
      createdAt: now,
      updatedAt: now,
      summary: input.summary,
    };

    const content: NoteContent = { ...metadata, content: input.content };
    await this.writeMarkdown(metadata, input.content, input.summary);
    await this.writeRawContent(id, input.content);
    await this.updateIndex((prev) => ({
      notes: [...prev.notes, metadata],
    }));

    return content;
  }

  async updateNote(input: UpdateNoteInput): Promise<NoteContent | null> {
    const index = await this.readIndex();
    const existing = index.notes.find((note) => note.id === input.id);
    if (!existing) return null;

    const updated: NoteMetadata = {
      ...existing,
      title: input.title ?? existing.title,
      tags: input.tags ? this.normalizeTags(input.tags) : existing.tags,
      updatedAt: new Date().toISOString(),
      summary: input.summary ?? existing.summary,
      sourceConversationId: input.sourceConversationId ?? existing.sourceConversationId,
    };

    const fallbackContent = await this.readRawContent(existing.id);
    const newContent = input.content ?? fallbackContent;
    await this.writeMarkdown(updated, newContent, updated.summary);
    await this.writeRawContent(updated.id, newContent);
    await this.updateIndex((prev) => ({
      notes: prev.notes.map((note) => (note.id === updated.id ? updated : note)),
    }));

    return { ...updated, content: newContent };
  }

  async listNotes(): Promise<NoteMetadata[]> {
    const index = await this.readIndex();
    return index.notes.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getNote(id: string): Promise<NoteContent | null> {
    const index = await this.readIndex();
    const metadata = index.notes.find((note) => note.id === id);
    if (!metadata) return null;
    const content = await this.readRawContent(metadata.id);
    return { ...metadata, content };
  }

  async searchNotes(options: SearchOptions): Promise<NoteMetadata[]> {
    const index = await this.readIndex();
    const tags = options.tags ? this.normalizeTags(options.tags) : [];
    const query = options.query?.toLowerCase();
    const notes = index.notes.filter((note) => {
      const matchesTags = tags.length ? tags.every((tag) => note.tags.includes(tag)) : true;
      return matchesTags;
    });

    if (!query) {
      return notes;
    }

    const results: NoteMetadata[] = [];
    for (const note of notes) {
      const content = await this.readRawContent(note.id);
      const summary = note.summary?.toLowerCase() ?? '';
      if (
        note.title.toLowerCase().includes(query) ||
        summary.includes(query) ||
        content.toLowerCase().includes(query)
      ) {
        results.push(note);
      }
    }
    return results;
  }

  private async readIndex(): Promise<IndexFile> {
    const raw = await fs.readFile(this.indexPath, 'utf-8');
    const json = JSON.parse(raw);
    const parsed = NoteMetadataSchema.array().safeParse(json.notes);
    if (!parsed.success) {
      throw new Error('Invalid index file');
    }
    return { notes: parsed.data };
  }

  private async updateIndex(updater: (prev: IndexFile) => IndexFile) {
    const prev = await this.readIndex();
    const next = updater(prev);
    const validated = NoteMetadataSchema.array().parse(next.notes);
    await this.writeIndexFile({ notes: validated });
  }

  private async writeIndexFile(data: IndexFile) {
    const json = JSON.stringify(data, null, 2);
    await this.writeFileAtomic(this.indexPath, json);
  }

  private async writeMarkdown(metadata: NoteMetadata, content: string, summary?: string) {
    const absolutePath = this.absoluteContentPath(metadata.contentPath);
    const markdown = renderNoteMarkdown({
      title: metadata.title,
      body: content,
      tags: metadata.tags,
      summary: summary ?? metadata.summary,
      metadata: {
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        sourceConversationId: metadata.sourceConversationId,
      },
    });
    await this.writeFileAtomic(absolutePath, markdown);
  }

  private async writeFileAtomic(targetPath: string, data: string) {
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    const tempPath = `${targetPath}.${randomUUID()}.tmp`;
    await fs.writeFile(tempPath, data, 'utf-8');
    await fs.rename(tempPath, targetPath);
  }

  private async writeRawContent(id: string, content: string) {
    const rawPath = this.rawFilePath(id);
    await this.writeFileAtomic(rawPath, content);
  }

  private async readRawContent(id: string): Promise<string> {
    const rawPath = this.rawFilePath(id);
    try {
      return await fs.readFile(rawPath, 'utf-8');
    } catch {
      const markdownPath = path.join(this.notesDir, `${id}.md`);
      return await fs.readFile(markdownPath, 'utf-8');
    }
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags?.length) return [];
    const unique = new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean));
    return Array.from(unique);
  }

  private rawFilePath(id: string) {
    return path.join(this.rawDir, `${id}.txt`);
  }

  private contentFilePath(id: string) {
    return path.join(this.notesDir, `${id}.md`);
  }

  private absoluteContentPath(contentPath: string) {
    if (path.isAbsolute(contentPath)) return contentPath;
    if (contentPath.startsWith('data/notes') || contentPath.startsWith('notes/')) {
      return path.resolve(process.cwd(), contentPath);
    }
    return path.join(this.notesDir, contentPath);
  }
}
