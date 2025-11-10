export type NoteListFilters = {
  tags: string[];
  query: string;
};

export type NoteListWidgetState = {
  filters: NoteListFilters;
  lastRequestedTool: 'notes.list' | 'notes.search';
  lastAppliedFilters: NoteListFilters;
};

export type WidgetStateSnapshot = Record<string, unknown> & {
  noteList?: NoteListWidgetState;
};

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
