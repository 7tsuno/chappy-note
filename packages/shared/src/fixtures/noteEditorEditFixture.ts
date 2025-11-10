export const noteEditorEditFixture = {
  type: 'noteEditorDraft' as const,
  mode: 'edit' as const,
  draft: {
    id: '22222222-3333-4444-8555-666666666666',
    title: 'Async Patterns in JS',
    tags: ['javascript', 'async'],
    contentPath: 'data/notes/async-patterns.md',
    createdAt: '2025-10-21T09:30:00.000Z',
    updatedAt: '2025-11-08T12:15:00.000Z',
    content: '# Async Patterns in JS\nPromise.all / Race / AllSettled...',
    summary: 'Promise.all / Race / AllSettledを比較しながら整理したメモ。',
    sourceConversationId: 'conv-async-01'
  },
  suggestions: {
    tags: ['javascript', 'async', 'patterns'],
    title: 'Async Patterns in JavaScript'
  }
};
