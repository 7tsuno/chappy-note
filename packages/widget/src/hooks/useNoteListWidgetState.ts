import { useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import { useOpenAiBridge } from '../providers/OpenAiBridgeProvider';
import {
  DEFAULT_NOTE_LIST_STATE,
  type NoteListWidgetState,
  type WidgetStateSnapshot,
} from '../types/widgetState';

const isRecord = (value: unknown): value is WidgetStateSnapshot =>
  typeof value === 'object' && value !== null;

const uniqueTags = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const sanitized = input.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  return Array.from(new Set(sanitized.map((tag) => tag.trim())));
};

const ensureNoteListState = (value: unknown): NoteListWidgetState => {
  if (!isRecord(value)) {
    return DEFAULT_NOTE_LIST_STATE;
  }
  const candidate = value as Partial<NoteListWidgetState>;
  const filters = candidate.filters ?? DEFAULT_NOTE_LIST_STATE.filters;
  const tags = uniqueTags(filters.tags);
  const query = typeof filters.query === 'string' ? filters.query : '';
  const lastRequestedTool =
    candidate.lastRequestedTool === 'notes.search' || candidate.lastRequestedTool === 'notes.list'
      ? candidate.lastRequestedTool
      : DEFAULT_NOTE_LIST_STATE.lastRequestedTool;
  const applied = candidate.lastAppliedFilters ?? DEFAULT_NOTE_LIST_STATE.lastAppliedFilters;
  const appliedTags = uniqueTags(applied.tags);
  const appliedQuery = typeof applied.query === 'string' ? applied.query : '';

  return {
    ...DEFAULT_NOTE_LIST_STATE,
    ...candidate,
    filters: {
      ...DEFAULT_NOTE_LIST_STATE.filters,
      ...filters,
      tags,
      query,
    },
    lastRequestedTool,
    lastAppliedFilters: {
      ...DEFAULT_NOTE_LIST_STATE.lastAppliedFilters,
      ...applied,
      tags: appliedTags,
      query: appliedQuery,
    },
  };
};

const ensureSnapshot = (snapshot: unknown): WidgetStateSnapshot =>
  isRecord(snapshot) ? snapshot : {};

export const useNoteListWidgetState = () => {
  const { getWidgetStateSnapshot, subscribeToWidgetState, setWidgetState } = useOpenAiBridge();

  const getSnapshot = useCallback(() => {
    const snapshot = ensureSnapshot(getWidgetStateSnapshot());
    return ensureNoteListState(snapshot.noteList);
  }, [getWidgetStateSnapshot]);

  const state = useSyncExternalStore(subscribeToWidgetState, getSnapshot, getSnapshot);

  const update = useCallback(
    (updater: (prev: NoteListWidgetState) => NoteListWidgetState) => {
      setWidgetState((previous: unknown) => {
        const snapshot = ensureSnapshot(previous);
        const next = updater(ensureNoteListState(snapshot.noteList));
        return { ...snapshot, noteList: next };
      });
    },
    [setWidgetState]
  );

  return [state, update] as const;
};
