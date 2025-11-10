import { describe, expect, it } from 'vitest';
import type { ConversationContext } from '@chappy/shared';
import { TagEngine } from './tagEngine.js';

const engine = new TagEngine();

describe('TagEngine', () => {
  it('extracts tags from conversation context when hints are missing', () => {
    const conversation: ConversationContext = {
      topic: 'React Suspense overview',
      turns: [
        { role: 'user', content: 'Please summarize React Suspense patterns and streaming rendering.' },
        { role: 'assistant', content: 'Sure, I will cover Suspense, streaming, and fallback UI tips.' },
      ],
    };

    const tags = engine.suggestFromConversation(conversation);
    expect(tags).toContain('react');
    expect(tags).toContain('suspense');
  });

  it('respects provided hints with higher priority', () => {
    const conversation: ConversationContext = {
      turns: [{ role: 'user', content: 'Talk about caching please.' }],
    };

    const tags = engine.suggestFromConversation(conversation, ['HTTP', 'Caching']);
    expect(tags[0]).toBe('http');
    expect(tags[1]).toBe('caching');
  });

  it('generates tags from note content when saving', () => {
    const tags = engine.suggestFromContent({
      title: 'Understanding GraphQL Clients',
      content: 'Compare Apollo Client with URQL and caching patterns.',
    });

    expect(tags).toContain('graphql');
    expect(tags).toContain('apollo');
  });

  it('extracts tags from japanese text and full-width hashtags', () => {
    const conversation: ConversationContext = {
      topic: '週次ふりかえり',
      turns: [
        { role: 'user', content: '＃振り返り 今週の成果と課題をまとめてください。' },
        { role: 'assistant', content: '了解です。改善点と成功例を記録します。' },
      ],
    };

    const tags = engine.suggestFromConversation(conversation);
    expect(tags).toContain('週次ふりかえり');
    expect(tags).toContain('振り返り');
  });
});
