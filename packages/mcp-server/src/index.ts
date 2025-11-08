import Fastify from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const fastify = Fastify({
  logger: true
});

const server = new McpServer({ name: 'chappy-note-mcp', version: '0.0.0' });

// TODO: register tools once storage layer is ready.
server.tool('notes.ping', {
  description: 'ヘルスチェック用仮ツール',
  inputSchema: { type: 'object', properties: {} }
}, async () => ({
  content: [
    {
      type: 'text',
      text: 'pong'
    }
  ]
}));

fastify.all('/mcp', async (request, reply) => {
  const transport = server.createHttpHandler();
  await transport(request.raw, reply.raw);
  return reply;
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
