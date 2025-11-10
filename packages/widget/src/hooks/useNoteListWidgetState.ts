import { useCallback, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { useOpenAiBridge } from '../providers/OpenAiBridgeProvider';
import {
  DEFAULT_NOTE_LIST_STATE,
  type NoteListFilters,
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

const areArraysEqual = <T,>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

const areFiltersEqual = (a: NoteListFilters, b: NoteListFilters): boolean =>
  a.query === b.query && areArraysEqual(a.tags, b.tags);

const areNoteListStatesEqual = (a: NoteListWidgetState, b: NoteListWidgetState): boolean =>
  a.lastRequestedTool === b.lastRequestedTool &&
  areFiltersEqual(a.filters, b.filters) &&
  areFiltersEqual(a.lastAppliedFilters, b.lastAppliedFilters);

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

const createSnapshotGetter = (getSnapshot: () => unknown) => {
  let lastRaw: unknown;
  let lastState: NoteListWidgetState = DEFAULT_NOTE_LIST_STATE;

  return () => {
    const raw = getSnapshot();
    if (raw === lastRaw) {
      return lastState;
    }
    const snapshot = ensureSnapshot(raw);
    lastRaw = raw;
    lastState = ensureNoteListState(snapshot.noteList);
    return lastState;
  };
};

export const useNoteListWidgetState = () => {
  const { getWidgetStateSnapshot, subscribeToWidgetState, setWidgetState } = useOpenAiBridge();

  const getSnapshot = useMemo(() => createSnapshotGetter(getWidgetStateSnapshot), [getWidgetStateSnapshot]);

  const state = useSyncExternalStore(subscribeToWidgetState, getSnapshot, getSnapshot);

  const update = useCallback(
    (updater: (prev: NoteListWidgetState) => NoteListWidgetState) => {
      setWidgetState((previous: unknown) => {
        const snapshot = ensureSnapshot(previous);
        const current = ensureNoteListState(snapshot.noteList);
        const next = ensureNoteListState(updater(current));
        if (areNoteListStatesEqual(next, current)) {
          return snapshot;
        }
        return { ...snapshot, noteList: next };
      });
    },
    [setWidgetState]
  );

  return [state, update] as const;
};
