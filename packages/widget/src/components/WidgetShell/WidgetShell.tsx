import './WidgetShell.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { NoteDetailPayload, NotePreview, NotePreviewPayload } from '@chappy/shared';
import { useStructuredContentState } from '../../hooks/useStructuredContentState';
import { useOpenAiBridge } from '../../providers/OpenAiBridgeProvider';
import { useNoteListWidgetState } from '../../hooks/useNoteListWidgetState';
import type { NoteListFilters } from '../../types/widgetState';
import { NoteEditor } from '../NoteEditor/NoteEditor';

type DetailActionType = 'edit' | 'ask' | 'tags';
type TagStat = { name: string; count: number };

const LoadingState = ({ label }: { label: string }) => (
  <div className="widget-shell__status" role="status" aria-live="polite">
    <div className="widget-shell__skeleton widget-shell__skeleton--title" />
    <div className="widget-shell__skeleton widget-shell__skeleton--line" />
    <div className="widget-shell__skeleton widget-shell__skeleton--line" />
    <p className="widget-shell__status-text">{label}</p>
  </div>
);

const ErrorState = ({ message, details }: { message: string; details?: unknown }) => (
  <div className="widget-shell__status" role="alert">
    <p className="widget-shell__status-text widget-shell__status-text--error">{message}</p>
    {details ? (
      <pre className="widget-shell__status-debug" aria-live="polite">
        {JSON.stringify(details, null, 2)}
      </pre>
    ) : null}
  </div>
);

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightQuery = (text: string, query: string): ReactNode => {
  if (!query.trim()) return text;
  try {
    const regex = new RegExp(escapeRegExp(query.trim()), 'gi');
    const matches = text.match(regex);
    if (!matches) return text;
    const parts = text.split(regex);
    const nodes: ReactNode[] = [];
    parts.forEach((part, index) => {
      nodes.push(part);
      const match = matches[index];
      if (match) {
        nodes.push(
          <mark key={`${match}-${index}`} className="widget-shell__highlight">
            {match}
          </mark>
        );
      }
    });
    return nodes;
  } catch {
    return text;
  }
};

const buildTagStats = (notes: NotePreview[], selected: string[]): TagStat[] => {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  selected.forEach((tag) => {
    if (!counts.has(tag)) {
      counts.set(tag, 0);
    }
  });
  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0].localeCompare(b[0]);
      }
      return b[1] - a[1];
    })
    .map(([name, count]) => ({ name, count }));
};

const sanitizeFilters = (filters: NoteListFilters): NoteListFilters => {
  const tags = Array.from(new Set(filters.tags.map((tag) => tag.trim()).filter(Boolean)));
  return {
    tags,
    query: filters.query.trim(),
  };
};

const sameTagSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const buildQuote = (text: string, maxLength = 480) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
};

type MarkdownBlock =
  | { type: 'heading'; level: number; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'blockquote'; content: string }
  | { type: 'code'; content: string }
  | { type: 'list'; items: string[] };

const MarkdownRenderer = ({ content }: { content: string }) => {
  const blocks = useMemo<MarkdownBlock[]>(() => {
    const lines = content.split(/\r?\n/);
    const items: MarkdownBlock[] = [];
    let paragraph: string[] = [];
    let list: string[] | null = null;
    let code: string[] | null = null;

    const flushParagraph = () => {
      if (paragraph.length) {
        items.push({ type: 'paragraph', content: paragraph.join(' ') });
        paragraph = [];
      }
    };

    const flushList = () => {
      if (list && list.length) {
        items.push({ type: 'list', items: list });
      }
      list = null;
    };

    const flushCode = () => {
      if (code !== null) {
        items.push({ type: 'code', content: code.join('\n') });
        code = null;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.replace(/\t/g, '  ');
      const trimmed = line.trimEnd();

      if (code !== null) {
        if (trimmed.startsWith('```')) {
          flushCode();
          continue;
        }
        code.push(rawLine);
        continue;
      }

      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushList();
        code = [];
        continue;
      }

      if (!trimmed.length) {
        flushParagraph();
        flushList();
        continue;
      }

      const headingMatch = /^#{1,4}\s+/.exec(trimmed);
      if (headingMatch) {
        flushParagraph();
        flushList();
        items.push({
          type: 'heading',
          level: Math.min(headingMatch[0].trim().length, 4),
          content: trimmed.replace(/^#{1,4}\s+/, ''),
        });
        continue;
      }

      if (trimmed.startsWith('>')) {
        flushParagraph();
        flushList();
        items.push({ type: 'blockquote', content: trimmed.replace(/^>\s?/, '') });
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        flushParagraph();
        list = list ?? [];
        list.push(trimmed.replace(/^[-*]\s+/, ''));
        continue;
      }

      paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();
    flushCode();
    return items;
  }, [content]);

  return (
    <div className="widget-shell__detail-markdown">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const HeadingTag = (`h${block.level}` as keyof JSX.IntrinsicElements);
            return <HeadingTag key={`heading-${index}`}>{block.content}</HeadingTag>;
          }
          case 'blockquote':
            return (
              <blockquote key={`quote-${index}`}>{block.content}</blockquote>
            );
          case 'code':
            return (
              <pre key={`code-${index}`}>
                <code>{block.content}</code>
              </pre>
            );
          case 'list':
            return (
              <ul key={`list-${index}`}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={`paragraph-${index}`}>{block.content}</p>
            );
        }
      })}
    </div>
  );
};

const TagChip = ({
  tag,
  count,
  selected,
  onToggle,
}: {
  tag: string;
  count: number;
  selected: boolean;
  onToggle: (tag: string) => void;
}) => (
  <button
    type="button"
    className={`widget-shell__tag-chip${selected ? ' widget-shell__tag-chip--active' : ''}`}
    aria-pressed={selected}
    onClick={() => onToggle(tag)}
  >
    <span>#{tag}</span>
    <span className="widget-shell__tag-chip-count">{count}</span>
  </button>
);

const NoteSearchForm = ({
  query,
  onQueryChange,
  onSubmit,
  onReset,
  onRefresh,
  isSubmitting,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onRefresh: () => void;
  isSubmitting: boolean;
}) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="widget-shell__search-form" onSubmit={handleSubmit}>
      <input
        type="search"
        className="widget-shell__search-input"
        placeholder="タグやキーワードで検索"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label="ノート検索キーワード"
      />
      <div className="widget-shell__search-buttons">
        <button type="submit" className="widget-shell__button" disabled={isSubmitting}>
          {isSubmitting ? '検索中…' : '検索'}
        </button>
        <button
          type="button"
          className="widget-shell__button widget-shell__button--ghost"
          onClick={onReset}
          disabled={isSubmitting && query.length === 0}
        >
          クリア
        </button>
        <button
          type="button"
          className="widget-shell__button widget-shell__button--quiet"
          onClick={onRefresh}
          disabled={isSubmitting}
        >
          最新を再取得
        </button>
      </div>
    </form>
  );
};

const TagFilter = ({
  tags,
  selected,
  onToggle,
}: {
  tags: TagStat[];
  selected: string[];
  onToggle: (tag: string) => void;
}) => (
  <section className="widget-shell__tag-panel" aria-label="タグフィルタ">
    <div className="widget-shell__tag-panel-header">
      <h3>タグで絞り込む</h3>
      <span className="widget-shell__tag-count">{selected.length ? `${selected.length}件選択中` : '未選択'}</span>
    </div>
    {tags.length === 0 ? (
      <p className="widget-shell__tag-empty">タグはまだありません。</p>
    ) : (
      <div className="widget-shell__tag-grid">
        {tags.map((tag) => (
          <TagChip key={tag.name} tag={tag.name} count={tag.count} selected={selected.includes(tag.name)} onToggle={onToggle} />
        ))}
      </div>
    )}
  </section>
);

const NoteListEmpty = ({
  filters,
  onReset,
}: {
  filters: { tags: string[]; query?: string };
  onReset: () => void;
}) => (
  <div className="widget-shell__empty-state">
    <p className="widget-shell__empty-title">該当するノートは見つかりませんでした。</p>
    <p className="widget-shell__empty-body">
      {filters.query ? (
        <span>
          キーワード「<strong>{filters.query}</strong>」
        </span>
      ) : null}
      {filters.tags.length > 0 ? (
        <span>
          {filters.query ? ' と ' : ''}
          タグ {filters.tags.map((tag) => `#${tag}`).join(', ')} が選択されています。
        </span>
      ) : null}
      条件を調整して再検索してください。
    </p>
    <button type="button" className="widget-shell__button" onClick={onReset}>
      フィルタをリセット
    </button>
  </div>
);

const NoteCard = ({
  note,
  query,
  onToggleTag,
  onOpen,
  isOpening,
}: {
  note: NotePreview;
  query: string;
  onToggleTag: (tag: string) => void;
  onOpen: (note: NotePreview) => void;
  isOpening: boolean;
}) => (
  <article className="widget-shell__card">
    <header className="widget-shell__card-header">
      <div>
        <h3 className="widget-shell__card-title">{note.title}</h3>
        <p className="widget-shell__card-meta">
          更新: {formatDate(note.updatedAt)} ・ 作成: {formatDate(note.createdAt)}
        </p>
      </div>
      {note.matchScore !== undefined ? (
        <span className="widget-shell__card-score">関連度 {(note.matchScore * 100).toFixed(0)}%</span>
      ) : null}
    </header>
    {note.tags.length > 0 && (
      <div className="widget-shell__card-tags">
        {note.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`widget-shell__tag-chip widget-shell__tag-chip--inline${
              note.matchingTags?.includes(tag) ? ' widget-shell__tag-chip--match' : ''
            }`}
            onClick={() => onToggleTag(tag)}
          >
            #{tag}
          </button>
        ))}
      </div>
    )}
    {note.excerpt && (
      <p className="widget-shell__card-excerpt">
        {highlightQuery(note.excerpt, query)}
      </p>
    )}
    <footer className="widget-shell__card-actions">
      <button
        type="button"
        className="widget-shell__button"
        onClick={() => onOpen(note)}
        disabled={isOpening}
      >
        {isOpening ? '開いています…' : '詳細を開く'}
      </button>
      {note.matchingTags?.length ? (
        <span className="widget-shell__matching-tags">
          一致タグ: {note.matchingTags.map((tag) => `#${tag}`).join(', ')}
        </span>
      ) : null}
    </footer>
  </article>
);

const NoteListSection = ({
  payload,
  filters,
  searchError,
  isSubmitting,
  pendingNoteId,
  onQueryChange,
  onSubmit,
  onReset,
  onTagToggle,
  onRefresh,
  onOpenNote,
}: {
  payload: NotePreviewPayload;
  filters: NoteListFilters;
  searchError: string | null;
  isSubmitting: boolean;
  pendingNoteId: string | null;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onTagToggle: (tag: string) => void;
  onRefresh: () => void;
  onOpenNote: (note: NotePreview) => void;
}) => {
  const tagStats = useMemo(() => buildTagStats(payload.notes, filters.tags), [payload.notes, filters.tags]);
  const appliedTags = payload.meta?.appliedTags ?? [];
  const appliedQuery = payload.meta?.query ?? '';
  const modeLabel = appliedQuery || appliedTags.length ? '検索モード' : '最新順';

  return (
    <section>
      <div className="widget-shell__section-heading">
        <div>
          <h2 className="widget-shell__section-title">ノートを探す</h2>
          <p className="widget-shell__section-subtitle">
            全{payload.total}件中 {payload.notes.length}件を表示
          </p>
        </div>
        <span className="widget-shell__mode-badge">{modeLabel}</span>
      </div>
      <NoteSearchForm
        query={filters.query}
        onQueryChange={onQueryChange}
        onSubmit={onSubmit}
        onReset={onReset}
        onRefresh={onRefresh}
        isSubmitting={isSubmitting}
      />
      {(appliedQuery || appliedTags.length) && (
        <div className="widget-shell__applied-summary">
          {appliedQuery ? <span>検索キーワード: 「{appliedQuery}」</span> : null}
          {appliedTags.length ? (
            <span>適用タグ: {appliedTags.map((tag) => `#${tag}`).join(', ')}</span>
          ) : null}
        </div>
      )}
      {searchError && (
        <p className="widget-shell__status-text widget-shell__status-text--error">{searchError}</p>
      )}
      <TagFilter tags={tagStats} selected={filters.tags} onToggle={onTagToggle} />
      {payload.notes.length === 0 ? (
        <NoteListEmpty filters={{ tags: appliedTags, query: appliedQuery }} onReset={onReset} />
      ) : (
        <div className="widget-shell__card-grid" aria-live="polite">
          {payload.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              query={filters.query}
              onToggleTag={onTagToggle}
              onOpen={onOpenNote}
              isOpening={pendingNoteId === note.id}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const NoteDetailView = ({
  note,
  onEdit,
  onTagEdit,
  onAsk,
  pendingAction,
  actionMessage,
  actionError,
  onOpenMarkdown,
}: {
  note: NoteDetailPayload['note'];
  onEdit: () => void;
  onTagEdit: () => void;
  onAsk: () => void;
  pendingAction: DetailActionType | null;
  actionMessage: string | null;
  actionError: string | null;
  onOpenMarkdown: () => void;
}) => (
  <article className="widget-shell__detail">
    <header className="widget-shell__detail-header">
      <div>
        <h2 className="widget-shell__detail-title">{note.title}</h2>
        <div className="widget-shell__detail-meta">
          <span>作成: {formatDate(note.createdAt)}</span>
          <span>更新: {formatDate(note.updatedAt)}</span>
          {note.sourceConversationId ? <span>会話ID: {note.sourceConversationId}</span> : null}
        </div>
      </div>
      <button type="button" className="widget-shell__button widget-shell__button--ghost" onClick={onOpenMarkdown}>
        Markdownを開く
      </button>
    </header>
    {note.tags.length ? (
      <div className="widget-shell__detail-tags-wrap">
        {note.tags.map((tag) => (
          <span key={tag} className="widget-shell__detail-tag">
            #{tag}
          </span>
        ))}
      </div>
    ) : null}
    {note.summary ? <p className="widget-shell__detail-summary">{note.summary}</p> : null}
    <div className="widget-shell__detail-actions">
      <button
        type="button"
        className="widget-shell__button"
        onClick={onEdit}
        disabled={pendingAction === 'edit'}
      >
        {pendingAction === 'edit' ? 'エディタを呼び出し中…' : '編集する'}
      </button>
      <button
        type="button"
        className="widget-shell__button widget-shell__button--ghost"
        onClick={onTagEdit}
        disabled={pendingAction === 'tags'}
      >
        {pendingAction === 'tags' ? 'タグ編集を準備中…' : 'タグを編集'}
      </button>
      <button
        type="button"
        className="widget-shell__button widget-shell__button--quiet"
        onClick={onAsk}
        disabled={pendingAction === 'ask'}
      >
        {pendingAction === 'ask' ? 'チャットに送信中…' : 'チャットで質問'}
      </button>
    </div>
    {actionMessage ? (
      <p className="widget-shell__action-feedback" role="status">
        {actionMessage}
      </p>
    ) : null}
    {actionError ? (
      <p className="widget-shell__action-feedback widget-shell__action-feedback--error" role="alert">
        {actionError}
      </p>
    ) : null}
    <MarkdownRenderer content={note.markdown ?? note.content} />
  </article>
);

export const WidgetShell = (): JSX.Element => {
  const state = useStructuredContentState();
  const { callTool, sendFollowUpMessage, openExternal } = useOpenAiBridge();
  const [noteListState, updateNoteListState] = useNoteListWidgetState();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSubmitting, setSearchSubmitting] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [detailAction, setDetailAction] = useState<{
    pending: DetailActionType | null;
    message: string | null;
    error: string | null;
  }>({ pending: null, message: null, error: null });

  useEffect(() => {
    if (state.status === 'ready' && state.view === 'list') {
      const appliedTags = state.payload.meta?.appliedTags ?? [];
      const query = state.payload.meta?.query ?? '';
      const toolName =
        (state.toolName === 'notes.search' || state.toolName === 'notes.list'
          ? state.toolName
          : noteListState.lastRequestedTool) ?? noteListState.lastRequestedTool;
      updateNoteListState((prev) => {
        const nextApplied = { tags: appliedTags, query };
        const appliedUnchanged =
          sameTagSet(prev.lastAppliedFilters.tags, nextApplied.tags) &&
          prev.lastAppliedFilters.query === nextApplied.query &&
          prev.lastRequestedTool === toolName;
        const userEditing =
          !sameTagSet(prev.filters.tags, prev.lastAppliedFilters.tags) ||
          prev.filters.query !== prev.lastAppliedFilters.query;
        if (appliedUnchanged) {
          return prev;
        }
        return {
          ...prev,
          filters: userEditing ? prev.filters : nextApplied,
          lastRequestedTool: toolName,
          lastAppliedFilters: nextApplied,
        };
      });
    }
  }, [state, noteListState.lastRequestedTool, updateNoteListState]);

  const runSearch = useCallback(
    async (rawFilters: NoteListFilters, options?: { forceMode?: 'notes.list' | 'notes.search' }) => {
      const filters = sanitizeFilters(rawFilters);
      const targetTool =
        options?.forceMode ?? (filters.query || filters.tags.length ? 'notes.search' : 'notes.list');
      setSearchError(null);
      setSearchSubmitting(true);
      updateNoteListState((prev) => ({
        ...prev,
        filters,
        lastRequestedTool: targetTool,
      }));
      try {
        if (targetTool === 'notes.list') {
          await callTool('notes.list', {});
        } else {
          await callTool('notes.search', {
            query: filters.query || undefined,
            tags: filters.tags.length ? filters.tags : undefined,
          });
        }
      } catch (error) {
        console.error(error);
        setSearchError('検索リクエストに失敗しました。もう一度お試しください。');
      } finally {
        setSearchSubmitting(false);
      }
    },
    [callTool, updateNoteListState]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      updateNoteListState((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          query: value,
        },
      }));
    },
    [updateNoteListState]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      const exists = noteListState.filters.tags.includes(tag);
      const nextTags = exists
        ? noteListState.filters.tags.filter((candidate) => candidate !== tag)
        : [...noteListState.filters.tags, tag];
      void runSearch({ ...noteListState.filters, tags: nextTags });
    },
    [noteListState.filters, runSearch]
  );

  const handleResetFilters = useCallback(() => {
    const hasInputFilters = Boolean(noteListState.filters.query) || noteListState.filters.tags.length > 0;
    const hasAppliedFilters =
      Boolean(noteListState.lastAppliedFilters.query) || noteListState.lastAppliedFilters.tags.length > 0;
    const isListMode = noteListState.lastRequestedTool === 'notes.list';
    if (!hasInputFilters && !hasAppliedFilters && isListMode) {
      return;
    }
    void runSearch({ tags: [], query: '' }, { forceMode: 'notes.list' });
  }, [noteListState.filters, noteListState.lastAppliedFilters, noteListState.lastRequestedTool, runSearch]);

  const handleRefresh = useCallback(() => {
    const forceMode = noteListState.lastRequestedTool;
    const baseFilters = noteListState.lastAppliedFilters;
    void runSearch(baseFilters, { forceMode });
  }, [noteListState.lastAppliedFilters, noteListState.lastRequestedTool, runSearch]);

  const handleOpenNote = useCallback(
    async (note: NotePreview) => {
      setPendingNoteId(note.id);
      setSearchError(null);
      try {
        await sendFollowUpMessage({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `ノートを詳細表示に切り替えてください。\nID: ${note.id}\nタイトル: ${note.title}`,
            },
          ],
        });
      } catch (error) {
        console.error(error);
        setSearchError('ノート詳細のリクエストに失敗しました。');
      } finally {
        setPendingNoteId(null);
      }
    },
    [sendFollowUpMessage]
  );

  const handleDetailAction = useCallback(
    async (type: DetailActionType, note: NoteDetailPayload['note']) => {
      setDetailAction({ pending: type, message: null, error: null });
      const text =
        type === 'edit'
          ? `ノートID: ${note.id}（${note.title}）を編集モードで開き、noteEditorDraftを返してください。`
          : type === 'tags'
          ? `ノートID: ${note.id} のタグを更新したいです。タグ編集可能なエディタを表示してください。`
          : `以下のノートを踏まえて質問します。\nタイトル: ${note.title}\nタグ: ${
              note.tags.join(', ') || 'なし'
            }\n要約: ${note.summary ?? '要約は未登録です。'}\n引用:\n"""${buildQuote(note.content)}"""\nこのノートについて補足を教えてください。`;
      try {
        await sendFollowUpMessage({
          role: 'user',
          content: [{ type: 'text', text }],
        });
        setDetailAction({ pending: null, message: 'チャットにリクエストを送信しました。', error: null });
      } catch (error) {
        console.error(error);
        setDetailAction({ pending: null, message: null, error: 'チャットへの送信に失敗しました。' });
      }
    },
    [sendFollowUpMessage]
  );

  const handleOpenMarkdown = useCallback(
    (contentPath: string) => {
      if (!contentPath) return;
      const isWebUrl = /^https?:\/\//.test(contentPath);
      const isFileUrl = contentPath.startsWith('file://');
      const url = isWebUrl || isFileUrl ? contentPath : `file://${contentPath}`;
      void openExternal(url);
    },
    [openExternal]
  );

  return (
    <div className="widget-shell" role="application">
      <header className="widget-shell__header">
        <h1 className="widget-shell__title">Chappy Note</h1>
        <p className="widget-shell__subtitle">ChatGPT内で動作するナレッジノート</p>
      </header>
      <main className="widget-shell__main">
        {state.status === 'loading' && (
          <LoadingState
            label={
              state.reason === 'in-progress'
                ? 'ノートを更新しています…'
                : 'ノートを読み込み中です…'
            }
          />
        )}
        {state.status === 'error' && (
          <ErrorState
            message={state.message ?? 'ウィジェットの読み込みに失敗しました。'}
            details={state.details}
          />
        )}
        {state.status === 'ready' && state.view === 'list' && (
          <NoteListSection
            payload={state.payload}
            filters={noteListState.filters}
            searchError={searchError}
            isSubmitting={searchSubmitting}
            pendingNoteId={pendingNoteId}
            onQueryChange={handleQueryChange}
            onSubmit={() => {
              void runSearch(noteListState.filters);
            }}
            onReset={handleResetFilters}
            onTagToggle={handleTagToggle}
            onRefresh={handleRefresh}
            onOpenNote={handleOpenNote}
          />
        )}
        {state.status === 'ready' && state.view === 'detail' && (
          <NoteDetailView
            note={state.payload.note}
            onEdit={() => handleDetailAction('edit', state.payload.note)}
            onTagEdit={() => handleDetailAction('tags', state.payload.note)}
            onAsk={() => handleDetailAction('ask', state.payload.note)}
            pendingAction={detailAction.pending}
            actionMessage={detailAction.message}
            actionError={detailAction.error}
            onOpenMarkdown={() => handleOpenMarkdown(state.payload.note.contentPath)}
          />
        )}
        {state.status === 'ready' && state.view === 'editor' && <NoteEditor payload={state.payload} />}
      </main>
      <footer className="widget-shell__footer">
        <span>Chappy Note • Developer Preview</span>
      </footer>
    </div>
  );
};
