import {
  ConversationContext,
  normalizeTag,
  TAG_MAX_COUNT,
} from '@chappy/shared';

const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'from',
  'that',
  'this',
  'have',
  'has',
  'into',
  'your',
  'about',
  'http',
  'https',
  'www',
  'note',
  'notes',
  'memo',
  'chatgpt',
  'please',
  'make',
  'prepare',
]);

const HASHTAG_REGEX = /[#＃]([\p{Letter}\p{Number}ー]{1,32})/gu;
const WORD_REGEX = /[\p{Letter}\p{Number}ー]{2,}/gu;

export interface ContentTagSource {
  title?: string;
  content?: string;
  summary?: string;
  hints?: string[];
}

export class TagEngine {
  suggestFromConversation(
    conversation: ConversationContext,
    tagHints?: string[]
  ): string[] {
    const textBlocks = [conversation.topic ?? '', ...conversation.turns.map((turn) => turn.content)];
    return this.generate(textBlocks, tagHints);
  }

  suggestFromContent(source: ContentTagSource): string[] {
    const textBlocks = [source.title ?? '', source.summary ?? '', source.content ?? ''];
    return this.generate(textBlocks, source.hints);
  }

  private generate(textBlocks: string[], tagHints?: string[]): string[] {
    const scores = new Map<string, number>();
    const hintList = this.collectHints(tagHints);

    const pushCandidate = (raw: string | undefined, weight: number) => {
      if (!raw) return;
      const tag = normalizeTag(raw);
      if (!tag) return;
      const trimmed = tag.slice(0, 32);
      const current = scores.get(trimmed) ?? 0;
      scores.set(trimmed, current + weight);
    };

    textBlocks.forEach((block, index) => {
      if (!block) return;
      let match: RegExpExecArray | null;
      HASHTAG_REGEX.lastIndex = 0;
      while ((match = HASHTAG_REGEX.exec(block)) !== null) {
        pushCandidate(match[1], 4);
      }

      const normalizedBlock = block.toLowerCase();
      WORD_REGEX.lastIndex = 0;
      while ((match = WORD_REGEX.exec(normalizedBlock)) !== null) {
        const [word] = match;
        if (STOP_WORDS.has(word)) continue;
        pushCandidate(word, Math.max(1, 3 - index));
      }
    });

    const sorted = Array.from(scores.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([tag]) => tag);

    const combined: string[] = [];
    for (const tag of hintList) {
      combined.push(tag);
      if (combined.length >= TAG_MAX_COUNT) {
        return combined;
      }
    }

    for (const tag of sorted) {
      if (combined.length >= TAG_MAX_COUNT) break;
      if (combined.includes(tag)) continue;
      combined.push(tag);
    }

    return combined;
  }

  private collectHints(tagHints?: string[]) {
    const seen = new Set<string>();
    const list: string[] = [];
    tagHints?.forEach((hint) => {
      const tag = normalizeTag(hint);
      if (!tag || seen.has(tag)) return;
      seen.add(tag);
      list.push(tag);
    });
    return list;
  }
}
