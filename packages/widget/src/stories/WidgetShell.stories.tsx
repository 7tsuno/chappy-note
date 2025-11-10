import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { WidgetShell } from '../components/WidgetShell/WidgetShell';
import {
  noteDetailFixture,
  noteEditorDraftFixture,
  notePreviewFixture,
} from '@chappy/shared';
import type { ToolOutputEnvelope } from '../types/openai';
import { ensureOpenAiRuntime } from '../lib/openAiRuntime';

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

const setToolOutput = (output: ToolOutputEnvelope | undefined) => {
  const runtime = ensureOpenAiRuntime();
  runtime.__mock?.setToolOutput(output);
};

const setTheme = (mode: 'light' | 'dark') => {
  const runtime = ensureOpenAiRuntime();
  runtime.__mock?.setGlobals({
    theme: {
      mode,
    },
  });
};

const createDecorator = (setup: () => void): Decorator => {
  return (Story) => {
    setup();
    return <Story />;
  };
};

export const Loading: Story = {
  name: 'Loading',
  decorators: [
    createDecorator(() => {
      setTheme('light');
      setToolOutput({ status: 'in_progress', toolName: 'notes.search' });
    }),
  ],
};

export const ErrorState: Story = {
  name: 'Error',
  decorators: [
    createDecorator(() => {
      setTheme('light');
      setToolOutput({
        status: 'error',
        error: { message: 'データの取得に失敗しました。' },
      });
    }),
  ],
};

export const NoteList: Story = {
  name: 'Note list',
  decorators: [
    createDecorator(() => {
      setTheme('light');
      setToolOutput({ status: 'completed', structuredContent: notePreviewFixture });
    }),
  ],
};

export const NoteDetail: Story = {
  name: 'Note detail',
  decorators: [
    createDecorator(() => {
      setTheme('light');
      setToolOutput({ status: 'completed', structuredContent: noteDetailFixture });
    }),
  ],
};

export const NoteEditor: Story = {
  name: 'Note editor',
  decorators: [
    createDecorator(() => {
      setTheme('light');
      setToolOutput({ status: 'completed', structuredContent: noteEditorDraftFixture });
    }),
  ],
};

export const DarkMode: Story = {
  name: 'Dark mode preview',
  decorators: [
    createDecorator(() => {
      setTheme('dark');
      setToolOutput({ status: 'completed', structuredContent: notePreviewFixture });
    }),
  ],
};
