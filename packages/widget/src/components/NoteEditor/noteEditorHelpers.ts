import type { NoteEditorDraftPayload } from '@chappy/shared';
import type { NoteEditorFormValues } from '../../types/widgetState';

export type NoteEditorToolInvocation = {
  tool: 'notes.create' | 'notes.update';
  args: {
    title: string;
    content: string;
    tags: string[];
    summary?: string;
    sourceConversationId?: string;
    id?: string;
  };
};

const trimOrUndefined = (value?: string) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const buildToolInvocation = (
  payload: NoteEditorDraftPayload,
  values: NoteEditorFormValues
): NoteEditorToolInvocation => {
  const baseArgs = {
    title: values.title.trim(),
    content: values.content,
    tags: values.tags,
    summary: trimOrUndefined(values.summary),
    sourceConversationId: values.sourceConversationId,
  };

  if (payload.mode === 'create') {
    return {
      tool: 'notes.create',
      args: baseArgs,
    };
  }

  return {
    tool: 'notes.update',
    args: {
      id: values.noteId ?? payload.draft.id,
      ...baseArgs,
    },
  };
};
