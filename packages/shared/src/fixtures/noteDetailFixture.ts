export const noteDetailFixture = {
  type: 'noteDetail' as const,
  note: {
    id: '11111111-2222-4333-8444-555555555555',
    title: 'Async Patterns in JS',
    tags: ['javascript', 'async'],
    sourceConversationId: 'conv-async-01',
    contentPath: 'data/notes/async-patterns.md',
    createdAt: '2025-11-01T10:00:00.000Z',
    updatedAt: '2025-11-08T12:00:00.000Z',
    content: 'Main body',
    markdown: '# Async Patterns in JS\nMain body'
  }
};
