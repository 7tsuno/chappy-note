import Fastify from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { NotePreviewPayloadSchema } from '@chappy/shared';

const fastify = Fastify({
  logger: true,
});

const server = new McpServer({ name: 'chappy-note-mcp', version: '0.0.0' });

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
});

// TODO: register tools once storage layer is ready.
server.tool(
  'notes.ping',
  {
    description: 'ヘルスチェック用仮ツール',
    inputSchema: { type: 'object', properties: {} },
  },
  async () => {
    const structuredContent = NotePreviewPayloadSchema.parse({
      type: 'notePreview',
      notes: [
        {
          id: '00000000-0000-4000-8000-000000000000',
          title: 'Sample Note',
          tags: ['sample'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          excerpt: 'Preview data is not yet connected to storage.',
        },
      ],
      total: 1,
    });

    return {
      content: [
        {
          type: 'text',
          text: 'pong',
        },
      ],
      structuredContent,
    };
  }
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
  .then(() => {
    fastify.log.info(`MCP server running on http://localhost:${port}`);
  })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });
