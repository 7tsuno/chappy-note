export const noteEditorDraftFixture = {
  type: 'noteEditorDraft' as const,
  mode: 'create' as const,
  draft: {
    title: 'New Note',
    tags: ['learning'],
    content: 'Draft body',
    summary: 'Short summary'
  },
  suggestions: {
    tags: ['learning', 'notes'],
    title: 'New Note'
  }
};
