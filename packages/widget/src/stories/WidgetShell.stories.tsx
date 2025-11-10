import type { Meta, StoryObj } from '@storybook/react';
import { WidgetShell } from '../components/WidgetShell/WidgetShell';
import {
  noteDetailFixture,
  noteEditorDraftFixture,
  noteEditorEditFixture,
  notePreviewFixture,
} from '@chappy/shared';
import type { ToolOutputEnvelope } from '../types/openai';
import { createDraftSignature, createNoteEditorFormValues, type WidgetState } from '../types/widgetState';

const meta: Meta<typeof WidgetShell> = {
  title: 'Widget/WidgetShell',
  component: WidgetShell,
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <WidgetShell />,
};

export default meta;

type Story = StoryObj<typeof meta>;

const withToolOutput = (
  toolOutput: ToolOutputEnvelope,
  options?: { themeMode?: 'light' | 'dark'; widgetState?: WidgetState }
) => ({
  parameters: {
    openaiMock: {
      toolOutput,
      themeMode: options?.themeMode,
      widgetState: options?.widgetState,
    },
  },
});

export const Loading: Story = {
  name: 'Loading',
  ...withToolOutput({ status: 'in_progress', toolName: 'notes.search' }),
};

export const ErrorState: Story = {
  name: 'Error',
  ...withToolOutput({
    status: 'error',
    error: { message: 'データの取得に失敗しました。' },
  }),
};

export const NoteList: Story = {
  name: 'Note list',
  ...withToolOutput({ status: 'completed', structuredContent: notePreviewFixture }),
};

export const NoteDetail: Story = {
  name: 'Note detail',
  ...withToolOutput({ status: 'completed', structuredContent: noteDetailFixture }),
};

export const NoteEditorCreate: Story = {
  name: 'Note editor (create)',
  ...withToolOutput({ status: 'completed', structuredContent: noteEditorDraftFixture }),
};

export const NoteEditorEdit: Story = {
  name: 'Note editor (edit)',
  ...withToolOutput({ status: 'completed', structuredContent: noteEditorEditFixture }),
};

const validationWidgetState: WidgetState = {
  noteEditor: {
    draftSignature: createDraftSignature(noteEditorDraftFixture),
    values: {
      ...createNoteEditorFormValues(noteEditorDraftFixture),
      title: '',
      content: '',
    },
    showValidationErrors: true,
  },
};

export const NoteEditorValidationErrors: Story = {
  name: 'Note editor (validation errors)',
  ...withToolOutput(
    { status: 'completed', structuredContent: noteEditorDraftFixture },
    { widgetState: validationWidgetState }
  ),
};

export const DarkMode: Story = {
  name: 'Dark mode preview',
  ...withToolOutput({ status: 'completed', structuredContent: notePreviewFixture }, { themeMode: 'dark' }),
};
