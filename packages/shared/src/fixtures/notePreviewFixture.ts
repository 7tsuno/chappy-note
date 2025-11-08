export const notePreviewFixture = {
  type: 'notePreview' as const,
  notes: [
    {
      id: '11111111-2222-4333-8444-555555555555',
      title: 'Async Patterns in JS',
      tags: ['javascript', 'async'],
      createdAt: '2025-11-01T10:00:00.000Z',
      updatedAt: '2025-11-08T12:00:00.000Z',
      excerpt: 'Async JavaScript can be managed with promises and async/await.',
      matchScore: 0.92,
      matchingTags: ['async']
    }
  ],
  total: 1,
  meta: {
    appliedTags: ['async'],
    query: 'async'
  }
};
