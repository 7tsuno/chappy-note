import './NoteEditor.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import type { NoteEditorDraftPayload } from '@chappy/shared';
import { TAG_MAX_COUNT, normalizeTag, TagSchema } from '@chappy/shared';
import { useOpenAiBridge } from '../../providers/OpenAiBridgeProvider';
import { useWidgetState } from '../../hooks/useWidgetState';
import {
  createDraftSignature,
  createNoteEditorFormValues,
  type NoteEditorFormValues,
  type NoteEditorWidgetState,
  type WidgetState,
} from '../../types/widgetState';
import { buildToolInvocation } from './noteEditorHelpers';

type NoteEditorProps = {
  payload: NoteEditorDraftPayload;
};

type ValidationErrors = Partial<Record<'title' | 'content' | 'tags', string>>;

type EditorState = {
  signature: string;
  values: NoteEditorFormValues;
  showValidationErrors: boolean;
};

type StatusState = {
  type: 'idle' | 'saving' | 'success' | 'error';
  message?: string;
};

const STATUS_RESET_DELAY = 4000;

const validateForm = (values: NoteEditorFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!values.title.trim()) {
    errors.title = 'タイトルを入力してください。';
  } else if (values.title.trim().length > 180) {
    errors.title = 'タイトルは180文字以内で入力してください。';
  }

  if (values.tags.length > TAG_MAX_COUNT) {
    errors.tags = `タグは最大${TAG_MAX_COUNT}件までです。`;
  } else {
    const hasInvalidTag = values.tags.some((tag) => !TagSchema.safeParse(tag).success);
    if (hasInvalidTag) {
      errors.tags = 'タグには英数字とハイフンのみを使用してください。';
    }
  }

  if (!values.content.trim()) {
    errors.content = '本文を入力してください。';
  }

  return errors;
};

const areValuesEqual = (a: NoteEditorFormValues, b: NoteEditorFormValues): boolean => {
  if (a.title !== b.title) return false;
  if (a.content !== b.content) return false;
  if ((a.summary ?? '') !== (b.summary ?? '')) return false;
  if ((a.sourceConversationId ?? '') !== (b.sourceConversationId ?? '')) return false;
  if (a.tags.length !== b.tags.length) return false;
  return a.tags.every((tag, index) => tag === b.tags[index]);
};

const formatDateTime = (isoString?: string): string | undefined => {
  if (!isoString) return undefined;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const NoteEditor = ({ payload }: NoteEditorProps): JSX.Element => {
  const { callTool, setWidgetState } = useOpenAiBridge();
  const widgetState = useWidgetState<WidgetState | undefined>();
  const persisted = widgetState?.noteEditor;

  const signature = useMemo(() => createDraftSignature(payload), [payload]);
  const serverValues = useMemo(() => createNoteEditorFormValues(payload), [payload]);

  const [editorState, setEditorState] = useState<EditorState>(() => ({
    signature,
    values: persisted?.draftSignature === signature ? persisted.values : serverValues,
    showValidationErrors: persisted?.draftSignature === signature ? Boolean(persisted.showValidationErrors) : false,
  }));

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [tagInput, setTagInput] = useState('');
  const [tagInputError, setTagInputError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>({ type: 'idle' });
  const displayErrors = editorState.showValidationErrors ? validationErrors : {};

  useLayoutEffect(() => {
    if (signature === editorState.signature) {
      return;
    }
    const isPersistedDraft = persisted?.draftSignature === signature;
    const nextValues = isPersistedDraft ? persisted.values : serverValues;
    const nextShowValidation = isPersistedDraft ? Boolean(persisted.showValidationErrors) : false;
    setEditorState({
      signature,
      values: nextValues,
      showValidationErrors: nextShowValidation,
    });
    setValidationErrors(nextShowValidation ? validateForm(nextValues) : {});
    setTagInput('');
    setTagInputError(null);
  }, [editorState.signature, persisted, serverValues, signature]);

  useEffect(() => {
    if (!editorState.showValidationErrors) {
      return;
    }
    setValidationErrors(validateForm(editorState.values));
  }, [editorState]);

  const persistState = useCallback(
    (next: NoteEditorWidgetState | undefined) => {
      setWidgetState((previous: WidgetState | undefined) => {
        const current = previous ?? ({} as WidgetState);
        if (!next) {
          const { noteEditor: _removed, ...rest } = current as Record<string, unknown>;
          void _removed;
          return Object.keys(rest).length > 0 ? (rest as WidgetState) : undefined;
        }
        return { ...current, noteEditor: next } as WidgetState;
      });
    },
    [setWidgetState]
  );

  useEffect(() => {
    persistState({
      draftSignature: editorState.signature,
      values: editorState.values,
      showValidationErrors: editorState.showValidationErrors || undefined,
    });
  }, [editorState.signature, editorState.showValidationErrors, editorState.values, persistState]);

  useEffect(() => {
    if (status.type === 'idle' || status.type === 'saving') {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const timer = window.setTimeout(() => setStatus({ type: 'idle' }), STATUS_RESET_DELAY);
    return () => window.clearTimeout(timer);
  }, [status]);

  const updateValues = useCallback(
    (updater: (prev: NoteEditorFormValues) => NoteEditorFormValues) => {
      setEditorState((prev) => ({
        ...prev,
        values: updater(prev.values),
      }));
    },
    []
  );

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.currentTarget.value;
    updateValues((prev) => ({ ...prev, title: nextTitle }));
  };

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.currentTarget.value;
    updateValues((prev) => ({ ...prev, content: nextContent }));
  };

  const handleSummaryChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextSummary = event.currentTarget.value;
    updateValues((prev) => ({ ...prev, summary: nextSummary }));
  };

  const handleTagRemove = (tag: string) => {
    updateValues((prev) => ({
      ...prev,
      tags: prev.tags.filter((existing) => existing !== tag),
    }));
  };

  const applyTag = (raw: string) => {
    const normalized = normalizeTag(raw);
    if (!normalized) {
      setTagInputError('タグを入力してください。');
      return;
    }
    if (editorState.values.tags.includes(normalized)) {
      setTagInputError('同じタグが既に追加されています。');
      return;
    }
    if (editorState.values.tags.length >= TAG_MAX_COUNT) {
      setTagInputError(`タグは最大${TAG_MAX_COUNT}件までです。`);
      return;
    }
    if (!TagSchema.safeParse(normalized).success) {
      setTagInputError('タグには英数字とハイフンのみを使用してください。');
      return;
    }

    updateValues((prev) => ({
      ...prev,
      tags: [...prev.tags, normalized],
    }));
    setTagInput('');
    setTagInputError(null);
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      applyTag(tagInput);
    } else if (event.key === 'Backspace' && !tagInput) {
      updateValues((prev) => ({
        ...prev,
        tags: prev.tags.slice(0, -1),
      }));
    }
  };

  const handleTagInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.currentTarget.value);
    if (tagInputError) {
      setTagInputError(null);
    }
  };

  const handleSuggestionApply = (tag: string) => {
    applyTag(tag);
  };

  const handleTitleSuggestionApply = () => {
    if (!payload.suggestions?.title) return;
    updateValues((prev) => ({ ...prev, title: payload.suggestions.title ?? prev.title }));
  };

  const handleReset = () => {
    setEditorState((prev) => ({
      ...prev,
      values: serverValues,
      showValidationErrors: false,
    }));
    setValidationErrors({});
    setTagInput('');
    setTagInputError(null);
    setStatus({ type: 'idle' });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(editorState.values);
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      setEditorState((prev) => ({ ...prev, showValidationErrors: true }));
      setStatus({ type: 'error', message: '入力内容を確認してください。' });
      return;
    }
    setValidationErrors({});
    setStatus({ type: 'saving', message: '保存処理を実行中です…' });

    try {
      const invocation = buildToolInvocation(payload, editorState.values);
      await callTool(invocation.tool, invocation.args);
      setStatus({ type: 'success', message: 'ノートを保存しました。' });
      persistState(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました。';
      setStatus({ type: 'error', message });
    }
  };

  const availableSuggestions = (payload.suggestions?.tags ?? []).filter(
    (tag) => !editorState.values.tags.includes(tag)
  );

  const canApplyTitleSuggestion = Boolean(payload.suggestions?.title) && payload.suggestions.title !== editorState.values.title;
  const isSaving = status.type === 'saving';
  const isPristine = areValuesEqual(editorState.values, serverValues);

  return (
    <section className="note-editor">
      <header className="note-editor__header">
        <div>
          <p className="note-editor__eyebrow">{payload.mode === 'create' ? '新規ノート' : 'ノート編集'}</p>
          <h2 className="note-editor__title">
            {payload.mode === 'create' ? '新しいノートを作成' : 'ノートを更新'}
          </h2>
        </div>
        {payload.mode === 'edit' && (
          <dl className="note-editor__metadata">
            <div>
              <dt>作成</dt>
              <dd>{formatDateTime(payload.draft.createdAt) ?? '不明'}</dd>
            </div>
            <div>
              <dt>最終更新</dt>
              <dd>{formatDateTime(payload.draft.updatedAt) ?? '不明'}</dd>
            </div>
          </dl>
        )}
      </header>

      <form className="note-editor__form" onSubmit={handleSubmit} noValidate>
        <div className="note-editor__field">
          <label htmlFor="note-editor-title">タイトル</label>
          <div className="note-editor__field-row">
            <input
              id="note-editor-title"
              name="title"
              className={displayErrors.title ? 'note-editor__input note-editor__input--error' : 'note-editor__input'}
              value={editorState.values.title}
              onChange={handleTitleChange}
              placeholder="例: Async Patterns in JS"
              maxLength={180}
              required
            />
            {canApplyTitleSuggestion && (
              <button
                type="button"
                className="note-editor__ghost-button"
                onClick={handleTitleSuggestionApply}
              >
                提案を反映
              </button>
            )}
          </div>
          {displayErrors.title && <p className="note-editor__error-text">{displayErrors.title}</p>}
        </div>

        <div className="note-editor__field">
          <label htmlFor="note-editor-tags">タグ</label>
          <div className={displayErrors.tags ? 'note-editor__tag-input note-editor__tag-input--error' : 'note-editor__tag-input'}>
            {editorState.values.tags.map((tag) => (
              <span key={tag} className="note-editor__tag-chip">
                #{tag}
                <button
                  type="button"
                  aria-label={`${tag} を削除`}
                  onClick={() => handleTagRemove(tag)}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="note-editor-tags"
              name="tags"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              placeholder="タグを入力してEnter"
            />
          </div>
          <div className="note-editor__helper-row">
            <span>{editorState.values.tags.length}/{TAG_MAX_COUNT}件</span>
            {tagInputError && <span className="note-editor__error-text">{tagInputError}</span>}
          </div>
          {displayErrors.tags && <p className="note-editor__error-text">{displayErrors.tags}</p>}
          {availableSuggestions.length > 0 && (
            <div className="note-editor__suggestions" aria-label="タグの候補">
              <p>おすすめ:</p>
              <div>
                {availableSuggestions.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className="note-editor__suggestion-chip"
                    onClick={() => handleSuggestionApply(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="note-editor__field">
          <label htmlFor="note-editor-content">本文 (Markdown)</label>
          <textarea
            id="note-editor-content"
            name="content"
            className={displayErrors.content ? 'note-editor__textarea note-editor__textarea--error' : 'note-editor__textarea'}
            value={editorState.values.content}
            onChange={handleContentChange}
            minLength={1}
            rows={10}
            placeholder="# 見出しから書き始めてもOK"
            required
          />
          {displayErrors.content && <p className="note-editor__error-text">{displayErrors.content}</p>}
        </div>

        <div className="note-editor__field">
          <label htmlFor="note-editor-summary">要約 (任意)</label>
          <textarea
            id="note-editor-summary"
            name="summary"
            className="note-editor__textarea note-editor__textarea--muted"
            value={editorState.values.summary ?? ''}
            onChange={handleSummaryChange}
            rows={3}
            placeholder="要点を1〜2行で記載すると検索性が向上します"
          />
        </div>

        <div className="note-editor__actions">
          <button type="button" className="note-editor__ghost-button" onClick={handleReset} disabled={isPristine || isSaving}>
            下書きをリセット
          </button>
          <span className="note-editor__spacer" aria-hidden="true" />
          <button type="submit" className="note-editor__primary-button" disabled={isSaving}>
            {isSaving ? '保存中…' : payload.mode === 'create' ? 'ノートを保存' : '変更を保存'}
          </button>
        </div>
      </form>

      {status.type !== 'idle' && status.message && (
        <div
          className={`note-editor__toast note-editor__toast--${status.type}`}
          role={status.type === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </div>
      )}
    </section>
  );
};
