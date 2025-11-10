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

const withToolOutput = (
  toolOutput: ToolOutputEnvelope,
  options?: { themeMode?: 'light' | 'dark'; widgetState?: unknown }
) => ({
  parameters: {
    openaiMock: {
      toolOutput,
      themeMode: options?.themeMode ?? 'light',
      widgetState: options?.widgetState,
    },
  },
});

const multiNotePreview = {
  ...notePreviewFixture,
  notes: [
    ...notePreviewFixture.notes,
    {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1',
      title: 'React Hooks Deep Dive',
      tags: ['react', 'hooks'],
      createdAt: '2025-10-28T09:00:00.000Z',
      updatedAt: '2025-11-05T09:00:00.000Z',
      excerpt: 'Hooks let you compose stateful logic without classes.',
      matchingTags: [],
      matchScore: 0.61,
    },
    {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2',
      title: 'Rust Ownership Basics',
      tags: ['rust', 'systems'],
      createdAt: '2025-09-20T11:00:00.000Z',
      updatedAt: '2025-11-02T11:15:00.000Z',
      excerpt: 'Ownership ensures memory safety with zero-cost abstractions.',
      matchingTags: [],
      matchScore: 0.52,
    },
  ],
  total: 3,
  meta: { appliedTags: [], query: undefined },
} as const;

const emptySearchPreview = {
  type: 'notePreview' as const,
  notes: [],
  total: 0,
  meta: {
    appliedTags: ['backend'],
    query: 'rust',
  },
};

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

export const LatestList: Story = {
  name: 'Latest list',
  ...withToolOutput(
    { status: 'completed', structuredContent: multiNotePreview },
    {
      widgetState: {
        noteList: {
          filters: { tags: [], query: '' },
          lastRequestedTool: 'notes.list',
          lastAppliedFilters: { tags: [], query: '' },
        },
      },
    }
  ),
};

export const FilteredSearch: Story = {
  name: 'Filtered search',
  ...withToolOutput(
    { status: 'completed', structuredContent: notePreviewFixture },
    {
      widgetState: {
        noteList: {
          filters: {
            tags: notePreviewFixture.meta?.appliedTags ?? [],
            query: notePreviewFixture.meta?.query ?? '',
          },
          lastRequestedTool: 'notes.search',
          lastAppliedFilters: {
            tags: notePreviewFixture.meta?.appliedTags ?? [],
            query: notePreviewFixture.meta?.query ?? '',
          },
        },
      },
    }
  ),
};

export const EmptySearch: Story = {
  name: 'Empty search result',
  ...withToolOutput(
    { status: 'completed', structuredContent: emptySearchPreview },
    {
      widgetState: {
        noteList: {
          filters: { tags: ['backend'], query: 'rust' },
          lastRequestedTool: 'notes.search',
          lastAppliedFilters: { tags: ['backend'], query: 'rust' },
        },
      },
    }
  ),
};

export const DetailView: Story = {
  name: 'Note detail',
  ...withToolOutput({ status: 'completed', structuredContent: noteDetailFixture }),
};

export const EditorView: Story = {
  name: 'Note editor',
  ...withToolOutput({ status: 'completed', structuredContent: noteEditorDraftFixture }),
};

export const DarkModeList: Story = {
  name: 'Dark mode',
  ...withToolOutput(
    { status: 'completed', structuredContent: multiNotePreview },
    {
      themeMode: 'dark',
      widgetState: {
        noteList: {
          filters: { tags: [], query: '' },
          lastRequestedTool: 'notes.list',
          lastAppliedFilters: { tags: [], query: '' },
        },
      },
    }
  ),
};
