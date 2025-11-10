import { NoteMetadata } from '@chappy/shared';

export function filterByTags(notes: NoteMetadata[], tags: string[]): NoteMetadata[] {
  if (!tags.length) return notes;
  return notes.filter((note) => tags.every((tag) => note.tags.includes(tag)));
}

export async function fullTextSearch(
  notes: NoteMetadata[],
  query: string,
  readContent: (note: NoteMetadata) => Promise<string>
): Promise<NoteMetadata[]> {
  const needle = query.toLowerCase();
  const results: NoteMetadata[] = [];

  for (const note of notes) {
    const titleHit = note.title.toLowerCase().includes(needle);
    const summaryHit = (note.summary ?? '').toLowerCase().includes(needle);
    if (titleHit || summaryHit) {
      results.push(note);
      continue;
    }

    const content = await readContent(note);
    if (content.toLowerCase().includes(needle)) {
      results.push(note);
    }
  }

  return results;
}
