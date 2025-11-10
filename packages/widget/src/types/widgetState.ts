import type { NoteEditorDraftPayload } from '@chappy/shared';

export type NoteListFilters = {
  tags: string[];
  query: string;
};

export type NoteListWidgetState = {
  filters: NoteListFilters;
  lastRequestedTool: 'notes.list' | 'notes.search';
  lastAppliedFilters: NoteListFilters;
};

export type NoteEditorFormValues = {
  title: string;
  tags: string[];
  content: string;
  summary?: string;
  sourceConversationId?: string;
  noteId?: string;
};

export type NoteEditorWidgetState = {
  draftSignature: string;
  values: NoteEditorFormValues;
  showValidationErrors?: boolean;
};

export type WidgetStateSnapshot = Record<string, unknown> & {
  noteList?: NoteListWidgetState;
  noteEditor?: NoteEditorWidgetState;
};

export type WidgetState = WidgetStateSnapshot;

export const DEFAULT_NOTE_LIST_STATE: NoteListWidgetState = {
  filters: {
    tags: [],
    query: '',
  },
  lastRequestedTool: 'notes.list',
  lastAppliedFilters: {
    tags: [],
    query: '',
  },
};

export const createNoteEditorFormValues = (
  payload: NoteEditorDraftPayload
): NoteEditorFormValues => ({
  title: payload.draft.title ?? '',
  tags: [...(payload.draft.tags ?? [])],
  content: payload.draft.content ?? '',
  summary: payload.draft.summary,
  sourceConversationId: payload.draft.sourceConversationId,
  noteId: payload.mode === 'edit' ? payload.draft.id : undefined,
});

export const createDraftSignature = (payload: NoteEditorDraftPayload): string =>
  JSON.stringify({
    mode: payload.mode,
    id: payload.mode === 'edit' ? payload.draft.id : undefined,
    title: payload.draft.title,
    content: payload.draft.content,
    tags: payload.draft.tags ?? [],
    summary: payload.draft.summary,
    updatedAt: payload.mode === 'edit' ? payload.draft.updatedAt : undefined,
    sourceConversationId: payload.draft.sourceConversationId,
  });
