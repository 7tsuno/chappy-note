import { randomUUID } from 'node:crypto';
import {
  ConversationContext,
  NoteContent,
  NoteDetailPayload,
  NoteDetailPayloadSchema,
  NoteEditorDraftPayload,
  NoteEditorDraftPayloadSchema,
  NoteMetadata,
  NotePreview,
  NotePreviewPayload,
  NotePreviewPayloadSchema,
  normalizeTag,
  renderNoteMarkdown,
  TAG_MAX_COUNT,
} from '@chappy/shared';

import { FileNoteStore } from '../store/fileNoteStore.js';
import { TagEngine } from '../utils/tagEngine.js';

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 50;
export const DEFAULT_SEARCH_LIMIT = 8;

export interface ListOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
}

export interface SearchOptions extends ListOptions {
  query?: string;
}

export interface CreateNoteOptions {
  title: string;
  content: string;
  tags?: string[];
  summary?: string;
  sourceConversationId?: string;
}

export interface UpdateNoteOptions extends Partial<CreateNoteOptions> {
  id: string;
}

export interface GenerateDraftOptions {
  conversationContext: ConversationContext;
  tagHints?: string[];
  titleHint?: string;
  summaryHint?: string;
  sourceConversationId?: string;
}

export interface ListResult {
  payload: NotePreviewPayload;
  limit: number;
  offset: number;
  total: number;
  appliedTags: string[];
  query?: string;
}

export interface DetailResult {
  payload: NoteDetailPayload;
  listSnapshot: NotePreviewPayload;
}

export class NotesService {
  constructor(
    private readonly store: FileNoteStore,
    private readonly tagEngine: TagEngine = new TagEngine()
  ) {}

  async listNotes(options: ListOptions = {}): Promise<ListResult> {
    const limit = this.clampNumber(options.limit ?? DEFAULT_LIST_LIMIT, 1, MAX_LIST_LIMIT);
    const offset = this.clampNumber(options.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
    const appliedTags = this.normalizeTags(options.tags);

    const notes = await this.store.listNotes();
    const filtered = appliedTags.length
      ? notes.filter((note) => appliedTags.every((tag) => note.tags.includes(tag)))
      : notes;

    const total = filtered.length;
    const slice = filtered.slice(offset, offset + limit);
    const previewNotes = await this.buildPreviewEntries(slice, { appliedTags });

    const payload = NotePreviewPayloadSchema.parse({
      type: 'notePreview',
      notes: previewNotes,
      total,
      meta: { appliedTags },
    });

    return { payload, limit, offset, total, appliedTags };
  }

  async searchNotes(options: SearchOptions = {}): Promise<ListResult> {
    const limit = this.clampNumber(options.limit ?? DEFAULT_SEARCH_LIMIT, 1, MAX_LIST_LIMIT);
    const offset = this.clampNumber(options.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
    const appliedTags = this.normalizeTags(options.tags);
    const query = options.query?.trim() ?? '';

    const matches = await this.store.searchNotes({
      tags: appliedTags,
      query: query || undefined,
    });

    const enriched = await Promise.all(
      matches.map(async (meta) => {
        const note = await this.store.getNote(meta.id);
        if (!note) return null;
        const matchingTags = appliedTags.filter((tag) => note.tags.includes(tag));
        const excerpt = this.createExcerpt(meta.summary ?? note.content, query);
        const matchScore = this.calculateMatchScore({
          query,
          note,
          matchingTags,
        });
        const preview: NotePreview = {
          id: note.id,
          title: note.title,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          excerpt,
          matchingTags,
          matchScore,
        };
        return preview;
      })
    );

    const compact = enriched.filter((entry): entry is NotePreview => entry !== null);
    compact.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    const limited = compact.slice(offset, offset + limit);

    const payload = NotePreviewPayloadSchema.parse({
      type: 'notePreview',
      notes: limited,
      total: compact.length,
      meta: {
        appliedTags,
        query: query || undefined,
      },
    });

    return { payload, limit, offset, total: compact.length, appliedTags, query: query || undefined };
  }

  async createNote(input: CreateNoteOptions): Promise<DetailResult> {
    let tags = this.normalizeTags(input.tags);
    if (!tags.length) {
      const auto = this.tagEngine.suggestFromContent({
        title: input.title,
        content: input.content,
        summary: input.summary,
        hints: input.tags,
      });
      tags = this.normalizeTags(auto);
    }
    const note = await this.store.createNote({
      ...input,
      tags,
    });

    const payload = this.buildDetailPayload(note);
    const listSnapshot = (await this.listNotes({ limit: DEFAULT_LIST_LIMIT, offset: 0 })).payload;
    return { payload, listSnapshot };
  }

  async updateNote(input: UpdateNoteOptions): Promise<DetailResult | null> {
    const tags = this.normalizeTags(input.tags);
    const updated = await this.store.updateNote({
      ...input,
      tags: input.tags ? tags : undefined,
    });
    if (!updated) return null;

    const payload = this.buildDetailPayload(updated);
    const listSnapshot = (await this.listNotes({ limit: DEFAULT_LIST_LIMIT, offset: 0 })).payload;
    return { payload, listSnapshot };
  }

  async generateDraft(options: GenerateDraftOptions): Promise<NoteEditorDraftPayload> {
    const normalizedHints = this.normalizeTags(options.tagHints);
    const tagSuggestions = this.tagEngine.suggestFromConversation(
      options.conversationContext,
      normalizedHints
    );
    const { conversationContext } = options;
    const title = this.resolveTitle(options.titleHint, conversationContext.topic, conversationContext.turns);
    const summary = this.resolveSummary(options.summaryHint, conversationContext.turns);
    const content = this.formatConversation(conversationContext.turns);

    const payload = NoteEditorDraftPayloadSchema.parse({
      type: 'noteEditorDraft',
      mode: 'create',
      draft: {
        title,
        tags: tagSuggestions,
        content,
        summary,
        sourceConversationId: options.sourceConversationId ?? `conv-${randomUUID()}`,
      },
      suggestions: {
        tags: tagSuggestions,
        title,
      },
    });

    return payload;
  }

  private buildDetailPayload(note: NoteContent): NoteDetailPayload {
    const markdown = renderNoteMarkdown({
      title: note.title,
      tags: note.tags,
      body: note.content,
      summary: note.summary,
      metadata: {
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        sourceConversationId: note.sourceConversationId,
      },
    });

    return NoteDetailPayloadSchema.parse({
      type: 'noteDetail',
      note: {
        ...note,
        markdown,
      },
    });
  }

  private async buildPreviewEntries(
    notes: NoteMetadata[],
    options: { appliedTags: string[]; query?: string }
  ): Promise<NotePreview[]> {
    const previews: NotePreview[] = [];
    for (const meta of notes) {
      const note = await this.store.getNote(meta.id);
      if (!note) continue;
      const matchingTags = options.appliedTags.filter((tag) => note.tags.includes(tag));
      const excerpt = this.createExcerpt(meta.summary ?? note.content, options.query);
      previews.push({
        id: note.id,
        title: note.title,
        tags: note.tags,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        excerpt,
        matchingTags,
      });
    }
    return previews;
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags?.length) return [];
    const set = new Set<string>();
    for (const raw of tags) {
      const normalized = normalizeTag(raw);
      if (normalized) {
        set.add(normalized);
      }
      if (set.size >= TAG_MAX_COUNT) break;
    }
    return Array.from(set);
  }

  private clampNumber(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  private createExcerpt(text: string | undefined, query?: string, length = 140): string {
    const cleaned = (text ?? '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '（本文なし）';
    if (!query) {
      return this.truncate(cleaned, length);
    }
    const lower = cleaned.toLowerCase();
    const target = query.toLowerCase();
    const index = lower.indexOf(target);
    if (index === -1) {
      return this.truncate(cleaned, length);
    }
    const start = Math.max(0, index - Math.floor(length / 2));
    const excerpt = cleaned.slice(start, start + length);
    const prefix = start > 0 ? '…' : '';
    const suffix = start + length < cleaned.length ? '…' : '';
    return `${prefix}${excerpt}${suffix}`;
  }

  private truncate(value: string, length: number) {
    if (value.length <= length) return value;
    return `${value.slice(0, length - 1)}…`;
  }

  private calculateMatchScore({
    query,
    note,
    matchingTags,
  }: {
    query: string;
    note: NoteContent;
    matchingTags: string[];
  }): number {
    if (!query) {
      return Math.min(1, 0.3 + matchingTags.length * 0.1);
    }
    const needle = query.toLowerCase();
    const titleHit = note.title.toLowerCase().includes(needle);
    const summaryHit = (note.summary ?? '').toLowerCase().includes(needle);
    const contentHit = note.content.toLowerCase().includes(needle);

    let score = 0;
    if (titleHit) score += 0.4;
    if (summaryHit) score += 0.2;
    if (contentHit) score += 0.3;
    if (matchingTags.length) score += Math.min(0.1, matchingTags.length * 0.05);
    return Math.min(1, Math.max(score, 0.15));
  }

  private resolveTitle(
    titleHint: string | undefined,
    topic: string | undefined,
    turns: ConversationContext['turns']
  ): string {
    const source = titleHint?.trim() || topic?.trim() || this.findFirstUserMessage(turns) || '新規ノート';
    return source.length > 180 ? `${source.slice(0, 179)}…` : source;
  }

  private resolveSummary(summaryHint: string | undefined, turns: ConversationContext['turns']): string {
    if (summaryHint?.trim()) {
      return this.truncate(summaryHint.trim(), 200);
    }
    const combined = turns
      .map((turn) => `${turn.role === 'assistant' ? 'AI' : 'ユーザー'}: ${turn.content}`)
      .join(' ');
    return this.truncate(combined, 180);
  }

  private formatConversation(turns: ConversationContext['turns']): string {
    if (!turns.length) {
      return '（このノートは空の会話から生成されました）';
    }
    return turns
      .map((turn) => {
        const label = turn.role === 'assistant' ? 'Assistant' : turn.role === 'user' ? 'User' : 'System';
        const body = turn.content.trim();
        return `### ${label}\n${body}`;
      })
      .join('\n\n');
  }

  private findFirstUserMessage(turns: ConversationContext['turns']): string | undefined {
    const userTurn = turns.find((turn) => turn.role === 'user');
    return userTurn?.content.split(/\.|!|？|!/)?.[0]?.trim();
  }
}
