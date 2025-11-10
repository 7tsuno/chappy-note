import './WidgetShell.css';
import { Fragment } from 'react';
import { useStructuredContentState } from '../../hooks/useStructuredContentState';
import type { NotePreview } from '@chappy/shared';
import { NoteEditor } from '../NoteEditor/NoteEditor';

const LoadingState = ({ label }: { label: string }) => (
  <div className="widget-shell__status" role="status" aria-live="polite">
    <div className="widget-shell__skeleton widget-shell__skeleton--title" />
    <div className="widget-shell__skeleton widget-shell__skeleton--line" />
    <div className="widget-shell__skeleton widget-shell__skeleton--line" />
    <p className="widget-shell__status-text">{label}</p>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="widget-shell__status" role="alert">
    <p className="widget-shell__status-text widget-shell__status-text--error">{message}</p>
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

const NoteListView = ({ notes }: { notes: NotePreview[] }) => (
  <ul className="widget-shell__list" aria-label="ノート一覧">
    {notes.map((note) => (
      <li key={note.id} className="widget-shell__list-item">
        <div className="widget-shell__list-title">{note.title}</div>
        <div className="widget-shell__list-meta">
          <span>{formatDate(note.updatedAt)}</span>
          {note.tags.length > 0 && (
            <span className="widget-shell__list-tags">#{note.tags.join(' #')}</span>
          )}
        </div>
        {note.excerpt && <p className="widget-shell__list-excerpt">{note.excerpt}</p>}
      </li>
    ))}
  </ul>
);

const SafeMarkdown = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  return (
    <div className="widget-shell__detail-markdown">
      {lines.map((line, index) => (
        <p key={index} className="widget-shell__detail-line">
          {line}
        </p>
      ))}
    </div>
  );
};

export const WidgetShell = (): JSX.Element => {
  const state = useStructuredContentState();

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
          <ErrorState message={state.message ?? 'ウィジェットの読み込みに失敗しました。'} />
        )}
        {state.status === 'ready' && state.view === 'list' && (
          <Fragment>
            <h2 className="widget-shell__section-title">最新のノート</h2>
            <NoteListView notes={state.payload.notes} />
          </Fragment>
        )}
        {state.status === 'ready' && state.view === 'detail' && (
          <article className="widget-shell__detail">
            <h2 className="widget-shell__detail-title">{state.payload.note.title}</h2>
            <div className="widget-shell__detail-meta">
              <span>更新: {formatDate(state.payload.note.updatedAt)}</span>
              {state.payload.note.tags.length > 0 && (
                <span className="widget-shell__detail-tags">#{state.payload.note.tags.join(' #')}</span>
              )}
            </div>
            {state.payload.note.markdown ? (
              <SafeMarkdown content={state.payload.note.markdown} />
            ) : (
              <p className="widget-shell__detail-line">ノート本文を読み込んでいます…</p>
            )}
          </article>
        )}
        {state.status === 'ready' && state.view === 'editor' && <NoteEditor payload={state.payload} />}
      </main>
      <footer className="widget-shell__footer">
        <span>Chappy Note • Developer Preview</span>
      </footer>
    </div>
  );
};
