import './app.css';
import type { NotePreviewPayload } from '@chappy/shared';

const placeholderPreview: NotePreviewPayload = {
  type: 'notePreview',
  notes: [
    {
      id: '11111111-2222-4333-8444-555555555555',
      title: 'プレースホルダーノート',
      tags: ['placeholder'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      excerpt: '実データ接続前のモックデータです。',
      matchingTags: ['placeholder']
    }
  ],
  total: 1,
  meta: {
    appliedTags: ['placeholder']
  }
};

const App = () => {
  return (
    <main>
      <h1>Chappy Note Widget</h1>
      <p>Apps SDK UIプレースホルダです。今後一覧/詳細/エディタをここに実装します。</p>
      <section>
        <h2>プレビュー</h2>
        <ul>
          {placeholderPreview.notes.map((note) => (
            <li key={note.id}>
              <strong>{note.title}</strong>
              <p>{note.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default App;
