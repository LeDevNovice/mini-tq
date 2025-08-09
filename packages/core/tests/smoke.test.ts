import { expect, test } from 'vitest';

import { __BRAND__ } from '../src/index';

test('brand is imported from ESM entry', () => {
  expect(__BRAND__).toBe('@mini-tq/core');
});
