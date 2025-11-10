import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NoteEditor } from './NoteEditor';
import { OpenAiBridgeProvider } from '../../providers/OpenAiBridgeProvider';
import { createMockOpenAiRuntime } from '../../lib/openAiRuntime';
import { noteEditorDraftFixture, noteEditorEditFixture } from '@chappy/shared';
import type { NoteEditorDraftPayload } from '@chappy/shared';
import { buildToolInvocation } from './noteEditorHelpers';
import { createNoteEditorFormValues } from '../../types/widgetState';

type NoteEditorEditPayload = Extract<NoteEditorDraftPayload, { mode: 'edit' }>;

const renderWithMockRuntime = (payload: NoteEditorDraftPayload = noteEditorDraftFixture) => {
  const runtime = createMockOpenAiRuntime();
  const view = render(
    <OpenAiBridgeProvider runtime={runtime}>
      <NoteEditor payload={payload} />
    </OpenAiBridgeProvider>
  );

  const rerenderWithPayload = (nextPayload: NoteEditorDraftPayload) =>
    view.rerender(
      <OpenAiBridgeProvider runtime={runtime}>
        <NoteEditor payload={nextPayload} />
      </OpenAiBridgeProvider>
    );

  return { rerender: rerenderWithPayload };
};

describe('NoteEditor', () => {
  const submitForm = () => {
    const titleInput = screen.getByLabelText('タイトル');
    const form = titleInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
  };

  it('renders draft fields and applies tag suggestions', () => {
    renderWithMockRuntime();

    expect(screen.getByLabelText('タイトル')).toHaveValue('New Note');
    const suggestionButton = screen.getByRole('button', { name: '#notes' });
    fireEvent.click(suggestionButton);
    expect(screen.getByText('#notes')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty title and content', async () => {
    renderWithMockRuntime();

    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('本文 (Markdown)'), { target: { value: '' } });
    submitForm();

    expect(await screen.findByText('タイトルを入力してください。')).toBeInTheDocument();
    expect(screen.getByText('本文を入力してください。')).toBeInTheDocument();
  });

  it('does not apply tags while IME composition is active', () => {
    renderWithMockRuntime();
    const [tagInput] = screen.getAllByPlaceholderText('タグを入力してEnter');

    fireEvent.change(tagInput, { target: { value: '日本語' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', isComposing: true });
    expect(screen.queryByText('#日本語')).not.toBeInTheDocument();

    fireEvent.keyDown(tagInput, { key: 'Enter', isComposing: false });
    expect(screen.getByText('#日本語')).toBeInTheDocument();
  });
});

describe('buildToolInvocation', () => {
  it('creates trimmed payloads for new notes', () => {
    const values = createNoteEditorFormValues(noteEditorDraftFixture);
    const invocation = buildToolInvocation(noteEditorDraftFixture, {
      ...values,
      title: '  Async Tips  ',
      content: '  # Heading\nBody  ',
      summary: '  quick summary  ',
    });

    expect(invocation.tool).toBe('notes.create');
    expect(invocation.args).toMatchObject({
      title: 'Async Tips',
      content: '  # Heading\nBody  ',
      summary: 'quick summary',
      tags: values.tags,
    });
  });

  it('uses note id for updates when local value is missing', () => {
    const editPayload = noteEditorEditFixture as NoteEditorEditPayload;
    const values = createNoteEditorFormValues(editPayload);
    const invocation = buildToolInvocation(editPayload, {
      ...values,
      noteId: undefined,
    });

    expect(invocation.tool).toBe('notes.update');
    expect(invocation.args).toMatchObject({
      id: editPayload.draft.id,
      title: values.title,
    });
  });
});
