import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import Fastify from 'fastify';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ConversationContextSchema } from '@chappy/shared';

import { FileNoteStore } from './store/fileNoteStore.js';
import { NotesService, MAX_LIST_LIMIT } from './services/notesService.js';
import { loadWidgetTemplate } from './utils/widgetTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetDistDir = path.resolve(__dirname, '../../widget/dist');
const widgetHtml = await loadWidgetTemplate(widgetDistDir);

const widgetResourceUri = 'resource://chappy-note/widget';
const baseWidgetMeta = {
  'openai/outputTemplate': {
    id: 'chappy-note-widget',
    resource: widgetResourceUri,
    version: '0.1.0',
    layout: 'main',
  },
  'openai/widgetCSP': {
    resource_domains: [],
    connect_domains: [],
  },
  'openai/widgetPrefersBorder': true,
};

const fastify = Fastify({ logger: true });
const server = new McpServer({ name: 'chappy-note-mcp', version: '0.0.0' });
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
});

const notesRoot = process.env.NOTES_ROOT ?? path.resolve(__dirname, '../data/notes');
const store = new FileNoteStore(notesRoot);
await store.init();
const notesService = new NotesService(store);

server.registerResource(
  'chappy-note-widget',
  widgetResourceUri,
  {
    title: 'Chappy Note Widget',
    description: 'Reactで構築されたノートUIテンプレート',
    mimeType: 'text/html+skybridge',
    _meta: structuredClone(baseWidgetMeta),
  },
  async () => ({
    contents: [
      {
        uri: widgetResourceUri,
        mimeType: 'text/html+skybridge',
        text: widgetHtml,
      },
    ],
    _meta: structuredClone(baseWidgetMeta),
  })
);

const tagsInputSchema = z.array(z.string().min(1)).max(32).optional();

const listArgsShape = {
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  offset: z.number().int().min(0).optional(),
  tags: tagsInputSchema,
};
const listArgsSchema = z.object(listArgsShape);

const searchArgsShape = {
  ...listArgsShape,
  query: z.string().min(1).optional(),
};
const searchArgsSchema = z.object(searchArgsShape);

const createArgsShape = {
  title: z.string().min(1).max(180),
  content: z.string().min(1),
  tags: tagsInputSchema,
  summary: z.string().optional(),
  sourceConversationId: z.string().optional(),
};
const createArgsSchema = z.object(createArgsShape);

const updateArgsShape = {
  id: z.string().uuid(),
  title: z.string().min(1).max(180).optional(),
  content: z.string().min(1).optional(),
  tags: tagsInputSchema,
  summary: z.string().optional(),
  sourceConversationId: z.string().optional(),
};
const updateArgsSchema = z
  .object(updateArgsShape)
  .refine(
    (val) =>
      val.title ?? val.content ?? val.tags ?? val.summary ?? val.sourceConversationId,
    'title/content/tags/summary/sourceConversationIdのいずれかを指定してください'
  );

const draftArgsShape = {
  conversationContext: ConversationContextSchema,
  tagHints: tagsInputSchema,
  titleHint: z.string().max(180).optional(),
  summaryHint: z.string().max(280).optional(),
  sourceConversationId: z.string().optional(),
};
const draftArgsSchema = z.object(draftArgsShape);

server.registerTool(
  'notes.list',
  {
    description: '最新のノート一覧を取得します',
    inputSchema: listArgsShape,
    annotations: {
      title: 'ノート一覧',
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async (rawArgs: unknown) =>
    withTool('notes.list', async () => {
      const args = listArgsSchema.parse(rawArgs ?? {});
      const result = await notesService.listNotes(args);
      const message = buildListMessage(result.total, result.payload.notes.length, result.appliedTags);
      return createToolResponse(result.payload, message, {
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
        lastSyncedAt: new Date().toISOString(),
      });
    })
);

server.registerTool(
  'notes.search',
  {
    description: 'タグ・キーワードでノートを検索します',
    inputSchema: searchArgsShape,
    annotations: {
      title: 'ノート検索',
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async (rawArgs: unknown) =>
    withTool('notes.search', async () => {
      const args = searchArgsSchema.parse(rawArgs ?? {});
      const result = await notesService.searchNotes(args);
      const labels: string[] = [];
      if (args.query) labels.push(`キーワード: "${args.query}"`);
      if (result.appliedTags.length) labels.push(`タグ: ${result.appliedTags.join(', ')}`);
      const labelText = labels.length ? `（${labels.join(' / ')}）` : '';
      const message = result.payload.notes.length
        ? `${result.payload.notes.length}件の検索結果${labelText}を返しました。`
        : `該当するノートは見つかりませんでした${labelText}。`;
      return createToolResponse(result.payload, message, {
        searchContext: {
          query: result.query,
          appliedTags: result.appliedTags,
          total: result.total,
        },
      });
    })
);

server.registerTool(
  'notes.create',
  {
    description: 'ノートを新規作成します',
    inputSchema: createArgsShape,
    annotations: {
      title: 'ノート作成',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (rawArgs: unknown) =>
    withTool('notes.create', async () => {
      const args = createArgsSchema.parse(rawArgs ?? {});
      const result = await notesService.createNote(args);
      const message = `ノート「${args.title}」を保存しました。`;
      return createToolResponse(result.payload, message, {
        listSnapshot: result.listSnapshot,
        noteId: result.payload.note.id,
      });
    })
);

server.registerTool(
  'notes.update',
  {
    description: '既存ノートを更新します',
    inputSchema: updateArgsShape,
    annotations: {
      title: 'ノート更新',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (rawArgs: unknown) =>
    withTool('notes.update', async () => {
      const args = updateArgsSchema.parse(rawArgs ?? {});
      const result = await notesService.updateNote(args);
      if (!result) {
        return {
          content: [{ type: 'text', text: '指定されたノートが見つかりませんでした。' }],
          _meta: structuredClone(baseWidgetMeta),
        };
      }
      const message = `ノート「${result.payload.note.title}」を更新しました。`;
      return createToolResponse(result.payload, message, {
        listSnapshot: result.listSnapshot,
        noteId: result.payload.note.id,
      });
    })
);

server.registerTool(
  'notes.generateDraft',
  {
    description: '会話文脈からノート下書きを生成します',
    inputSchema: draftArgsShape,
    annotations: {
      title: '下書き生成',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (rawArgs: unknown) =>
    withTool('notes.generateDraft', async () => {
      const args = draftArgsSchema.parse(rawArgs ?? {});
      const payload = await notesService.generateDraft(args);
      const message = `会話からノート下書きを用意しました（タイトル: ${payload.draft.title}）。`;
      return createToolResponse(payload, message, {
        draftContext: {
          sourceConversationId: payload.draft.sourceConversationId,
        },
      });
    })
);

await server.connect(transport);

fastify.all('/mcp', async (request, reply) => {
  reply.hijack();
  try {
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (error) {
    fastify.log.error(error);
    if (!reply.raw.headersSent) {
      reply.raw.statusCode = 500;
      reply.raw.end('Internal Server Error');
    }
  }
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';

fastify
  .listen({ port, host })
  .then(() => fastify.log.info(`MCP server running on http://${host}:${port}`))
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });

function buildListMessage(total: number, count: number, tags: string[]) {
  if (!count) {
    return tags.length ? `タグ(${tags.join(', ')})に一致するノートがありません。` : '保存済みのノートはまだありません。';
  }
  const tagText = tags.length ? `（タグ: ${tags.join(', ')}）` : '';
  return `最新${count}件のノート${tagText}を返しました（全${total}件）。`;
}

type ToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  _meta?: Record<string, unknown>;
};

function createToolResponse(
  structuredContent: unknown,
  message: string,
  extraMeta?: Record<string, unknown>
): ToolResponse {
  return {
    content: [{ type: 'text', text: message }],
    structuredContent,
    _meta: mergeMeta(extraMeta),
  };
}

function mergeMeta(extra?: Record<string, unknown>) {
  return Object.assign(structuredClone(baseWidgetMeta), extra ?? {});
}

async function withTool(toolName: string, handler: () => Promise<ToolResponse>): Promise<ToolResponse> {
  const requestId = randomUUID();
  fastify.log.info({ toolName, requestId }, 'tool start');
  try {
    const result = await handler();
    fastify.log.info({ toolName, requestId }, 'tool success');
    return result;
  } catch (error) {
    fastify.log.error({ toolName, requestId, err: error }, 'tool failure');
    return {
      content: [
        {
          type: 'text',
          text: `処理中にエラーが発生しました。requestId=${requestId}`,
        },
      ],
      _meta: mergeMeta({ error: { requestId } }),
    };
  }
}
