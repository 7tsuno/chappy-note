import { z } from 'zod';

export const TAG_MAX_LENGTH = 32;
export const TAG_MAX_COUNT = 10;

const NON_TAG_CHAR_REGEX = /[^\p{L}\p{N}\s-]/gu;

export const normalizeTag = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(NON_TAG_CHAR_REGEX, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const TagSchema = z
  .string()
  .min(1)
  .max(TAG_MAX_LENGTH)
  .regex(new RegExp('^[\\p{L}\\p{N}]+(?:-[\\p{L}\\p{N}]+)*$', 'u'), {
    message: 'Tags must contain letters/numbers with optional single hyphens only'
  });

export const TagsSchema = z.array(TagSchema).max(TAG_MAX_COUNT).default([]);

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid ISO date' });

export const NoteMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(180),
  tags: TagsSchema,
  sourceConversationId: z.string().optional(),
  contentPath: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  summary: z.string().optional()
});

export const NoteContentSchema = NoteMetadataSchema.extend({
  content: z.string()
});

export const NoteSchema = NoteContentSchema;

export type NoteMetadata = z.infer<typeof NoteMetadataSchema>;
export type NoteContent = z.infer<typeof NoteContentSchema>;
export type Note = NoteContent;

export const DiagramSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  caption: z.string().optional()
});

export const StoredNoteSchema = NoteContentSchema.extend({
  diagrams: z.array(DiagramSchema).default([])
});

export type StoredNote = z.infer<typeof StoredNoteSchema>;

export const ConversationTurnSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1)
});

export const ConversationContextSchema = z.object({
  turns: z.array(ConversationTurnSchema),
  topic: z.string().optional()
});

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export const NotePreviewSchema = NoteMetadataSchema.pick({
  id: true,
  title: true,
  tags: true,
  createdAt: true,
  updatedAt: true
}).extend({
  excerpt: z.string(),
  matchScore: z.number().min(0).max(1).optional(),
  matchingTags: TagsSchema.default([])
});

export const NotePreviewPayloadSchema = z.object({
  type: z.literal('notePreview'),
  notes: z.array(NotePreviewSchema),
  total: z.number().nonnegative(),
  meta: z
    .object({
      appliedTags: TagsSchema,
      query: z.string().optional()
    })
    .default({ appliedTags: [] })
});

export const NoteDetailPayloadSchema = z.object({
  type: z.literal('noteDetail'),
  note: NoteContentSchema.extend({ markdown: z.string() })
});

const CreateDraftSchema = z.object({
  title: z.string().min(1).max(180),
  tags: TagsSchema.optional(),
  content: z.string(),
  summary: z.string().optional(),
  sourceConversationId: z.string().optional()
});

const EditDraftSchema = NoteContentSchema;

export const NoteEditorDraftPayloadSchema = z.discriminatedUnion('mode', [
  z.object({
    type: z.literal('noteEditorDraft'),
    mode: z.literal('create'),
    draft: CreateDraftSchema,
    suggestions: z
      .object({
        tags: TagsSchema,
        title: z.string().optional()
      })
      .default({ tags: [] })
  }),
  z.object({
    type: z.literal('noteEditorDraft'),
    mode: z.literal('edit'),
    draft: EditDraftSchema,
    suggestions: z
      .object({
        tags: TagsSchema,
        title: z.string().optional()
      })
      .default({ tags: [] })
  })
]);

export type NotePreview = z.infer<typeof NotePreviewSchema>;
export type NotePreviewPayload = z.infer<typeof NotePreviewPayloadSchema>;
export type NoteDetailPayload = z.infer<typeof NoteDetailPayloadSchema>;
export type NoteEditorDraftPayload = z.infer<typeof NoteEditorDraftPayloadSchema>;

export interface RenderNoteMarkdownParams {
  title: string;
  body: string;
  tags?: string[];
  summary?: string;
  sections?: Array<{ heading: string; content: string }>;
  diagrams?: Array<{ caption?: string; fileName: string }>;
  metadata?: Partial<Pick<NoteMetadata, 'createdAt' | 'updatedAt' | 'sourceConversationId'>> & {
    sourceUrl?: string;
  };
}

export const renderNoteMarkdown = ({
  title,
  body,
  tags = [],
  summary,
  sections = [],
  diagrams = [],
  metadata
}: RenderNoteMarkdownParams): string => {
  const normalizedTags = tags.map(normalizeTag).filter(Boolean);
  const headerLines = [`# ${title}`];

  if (metadata) {
    const metaEntries: string[] = [];
    if (metadata.createdAt) metaEntries.push(`Created: ${metadata.createdAt}`);
    if (metadata.updatedAt) metaEntries.push(`Updated: ${metadata.updatedAt}`);
    if (metadata.sourceConversationId)
      metaEntries.push(`Conversation: ${metadata.sourceConversationId}`);
    if (metadata.sourceUrl) metaEntries.push(`Source: ${metadata.sourceUrl}`);
    if (metaEntries.length) {
      headerLines.push('', metaEntries.join(' | '));
    }
  }

  if (normalizedTags.length) {
    headerLines.push('', `Tags: ${normalizedTags.map((t) => `#${t}`).join(' ')}`);
  }

  const sectionLines = sections.flatMap((section) => [`\n## ${section.heading}`, '', section.content]);
  const diagramLines = diagrams.flatMap((diagram) => [
    '',
    `![${diagram.caption ?? 'diagram'}](figures/${diagram.fileName})`
  ]);

  return [
    ...headerLines,
    '',
    summary ? `> ${summary}` : '',
    summary ? '' : '',
    body,
    ...sectionLines,
    ...diagramLines
  ]
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n');
};

export { notePreviewFixture } from './fixtures/notePreviewFixture';
export { noteDetailFixture } from './fixtures/noteDetailFixture';
export { noteEditorDraftFixture } from './fixtures/noteEditorDraftFixture';
export { noteEditorEditFixture } from './fixtures/noteEditorEditFixture';
