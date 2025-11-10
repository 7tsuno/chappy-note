import type { Meta, StoryObj } from '@storybook/react';
import { WidgetShell } from '../components/WidgetShell/WidgetShell';
import {
  noteDetailFixture,
  noteEditorDraftFixture,
  notePreviewFixture,
} from '@chappy/shared';
import type { ToolOutputEnvelope } from '../types/openai';

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

const withToolOutput = (toolOutput: ToolOutputEnvelope, themeMode: 'light' | 'dark' = 'light') => ({
  parameters: {
    openaiMock: {
      toolOutput,
      themeMode,
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

export const NoteEditor: Story = {
  name: 'Note editor',
  ...withToolOutput({ status: 'completed', structuredContent: noteEditorDraftFixture }),
};

export const DarkMode: Story = {
  name: 'Dark mode preview',
  ...withToolOutput(
    { status: 'completed', structuredContent: notePreviewFixture },
    'dark'
  ),
};
