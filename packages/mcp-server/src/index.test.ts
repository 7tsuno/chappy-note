import { describe, expect, it } from 'vitest';

import { NoteMetadataSchema } from '@chappy/shared';

describe('placeholder', () => {
  it('imports shared schema', () => {
    expect(NoteMetadataSchema.safeParse).toBeDefined();
  });
});
