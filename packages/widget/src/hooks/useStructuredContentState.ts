import { useMemo } from 'react';
import {
  NoteDetailPayloadSchema,
  NoteEditorDraftPayloadSchema,
  NotePreviewPayloadSchema,
  type NoteDetailPayload,
  type NoteEditorDraftPayload,
  type NotePreviewPayload,
} from '@chappy/shared';
import type { ToolOutputEnvelope } from '../types/openai';
import { useToolOutput } from './useToolOutput';

type StructuredContent = NotePreviewPayload | NoteDetailPayload | NoteEditorDraftPayload;

type LoadingReason = 'waiting-for-tool-output' | 'in-progress';

type ReadyState<View extends 'list' | 'detail' | 'editor', Payload> = {
  status: 'ready';
  view: View;
  payload: Payload;
  toolName?: string;
};

export type StructuredContentState =
  | { status: 'loading'; reason: LoadingReason; toolName?: string }
  | { status: 'error'; message: string; details?: unknown; toolName?: string }
  | ReadyState<'list', NotePreviewPayload>
  | ReadyState<'detail', NoteDetailPayload>
  | ReadyState<'editor', NoteEditorDraftPayload>;

const mapStructuredContentToState = (
  content: StructuredContent,
  toolName?: string
): StructuredContentState => {
  switch (content.type) {
    case 'notePreview':
      return { status: 'ready', view: 'list', payload: content, toolName };
    case 'noteDetail':
      return { status: 'ready', view: 'detail', payload: content, toolName };
    case 'noteEditorDraft':
      return { status: 'ready', view: 'editor', payload: content, toolName };
    default: {
      const exhaustiveCheck: never = content;
      void exhaustiveCheck;
      throw new Error('Unsupported structuredContent type received.');
    }
  }
};

export const useStructuredContentState = (): StructuredContentState => {
  const toolOutput = useToolOutput<ToolOutputEnvelope | undefined>();

  return useMemo<StructuredContentState>(() => {
    if (!toolOutput) {
      return { status: 'loading', reason: 'waiting-for-tool-output' };
    }

    if (toolOutput.status === 'idle') {
      return { status: 'loading', reason: 'waiting-for-tool-output' };
    }

    if (toolOutput.status === 'in_progress') {
      return { status: 'loading', reason: 'in-progress', toolName: toolOutput.toolName };
    }

    if (toolOutput.error) {
      return {
        status: 'error',
        message: toolOutput.error.message,
        details: toolOutput.error,
        toolName: toolOutput.toolName,
      };
    }

    const structuredContent = toolOutput.structuredContent;
    if (!structuredContent) {
      return {
        status: 'error',
        message: 'No structuredContent payload received from tool output.',
        toolName: toolOutput.toolName,
      };
    }

    const previewResult = NotePreviewPayloadSchema.safeParse(structuredContent);
    if (previewResult.success) {
      return mapStructuredContentToState(previewResult.data, toolOutput.toolName);
    }

    const detailResult = NoteDetailPayloadSchema.safeParse(structuredContent);
    if (detailResult.success) {
      return mapStructuredContentToState(detailResult.data, toolOutput.toolName);
    }

    const editorResult = NoteEditorDraftPayloadSchema.safeParse(structuredContent);
    if (editorResult.success) {
      return mapStructuredContentToState(editorResult.data, toolOutput.toolName);
    }

    return {
      status: 'error',
      message: 'Received structuredContent did not match expected schema.',
      details: {
        notePreview: previewResult.error?.flatten(),
        noteDetail: detailResult.error?.flatten(),
        noteEditorDraft: editorResult.error?.flatten(),
      },
      toolName: toolOutput.toolName,
    };
  }, [toolOutput]);
};
