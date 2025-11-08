import { describe, expect, it } from 'vitest';

import { NoteSchema } from '@chappy/shared';

describe('placeholder', () => {
  it('imports shared schema', () => {
    expect(NoteSchema.safeParse).toBeDefined();
  });
});
