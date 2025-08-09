import { test, expect } from 'vitest';

import { __REACT_BRAND__ } from '../src/index';

test('react package placeholder brand is exported', () => {
  expect(__REACT_BRAND__).toBe('@mini-tq/react');
});
