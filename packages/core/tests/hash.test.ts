import { describe, expect, test } from 'vitest';

import { hashQueryKey, stableStringify } from '../src/hash';

describe('stableStringify', () => {
  test('object key order does not matter', () => {
    const a = { a: 1, b: 2 };
    const b = { b: 2, a: 1 };

    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  test('array order matters', () => {
    const a = [1, 2, 3];
    const b = [3, 2, 1];

    expect(stableStringify(a)).not.toBe(stableStringify(b));
  });

  test('nested arrays and objects are stable', () => {
    const k1 = ['todos', { userId: 1, filter: 'all' }];
    const k2 = ['todos', { filter: 'all', userId: 1 }];

    expect(stableStringify(k1)).toBe(stableStringify(k2));
  });

  test('if undefined is included, distinguishing { a:undefined } from {}', () => {
    const a = { a: undefined as unknown };
    const b = {};

    expect(stableStringify(a)).not.toBe(stableStringify(b));
  });

  test('dates, regexps and special primitives are tagged', () => {
    const d = new Date(0);
    const r = /x/i;
    const s = Symbol('x');

    expect(stableStringify(d)).toContain('date:1970-01-01T00:00:00.000Z');
    expect(stableStringify(r)).toContain('regexp:/x/i');
    expect(stableStringify(s)).toBe('sym:x');
  });

  test('typed arrays, maps and sets are supported deterministically', () => {
    const u8 = new Uint8Array([1, 2, 3]);
    const m1 = new Map<any, any>([
      ['b', 2],
      ['a', 1],
    ]);
    const m2 = new Map<any, any>([
      ['a', 1],
      ['b', 2],
    ]);
    const s1 = new Set([3, 1, 2]);
    const s2 = new Set([2, 1, 3]);

    expect(stableStringify(u8)).toContain('typed:Uint8Array:1,2,3');
    expect(stableStringify(m1)).toBe(stableStringify(m2));
    expect(stableStringify(s1)).toBe(stableStringify(s2));
  });

  test('circular structures throw a clear error', () => {
    const a: any = { x: 1 };
    a.self = a;

    expect(() => stableStringify(a)).toThrow(/circular object reference/);

    const arr: any[] = [];
    arr.push(arr);

    expect(() => stableStringify(arr)).toThrow(/circular array reference/);
  });
});

describe('hashQueryKey', () => {
  test('array keys with equivalent objects produce equal hashes', () => {
    const a = ['todos', { userId: 1, filter: 'all' }] as const;
    const b = ['todos', { filter: 'all', userId: 1 }] as const;

    expect(hashQueryKey(a)).toBe(hashQueryKey(b));
  });

  test('["todos"] and "todos" do not collide', () => {
    const arr = ['todos'] as const;
    const str = 'todos';

    expect(hashQueryKey(arr)).not.toBe(hashQueryKey(str));
  });

  test('numbers and strings are distinguished via tags', () => {
    expect(stableStringify(1)).toBe('num:1');
    expect(stableStringify('1')).toBe('str:"1"');
  });

  test('deep object key reordering is stable (objects only)', () => {
    const k1 = ['a', [{ x: { b: 1, c: [2, 3] } }]] as const;
    const k2 = ['a', [{ x: { c: [2, 3], b: 1 } }]] as const;

    expect(hashQueryKey(k1)).toBe(hashQueryKey(k2));
  });

  test('reordering items in nested arrays is NOT stable (by design)', () => {
    const k1 = ['a', [{ b: 1 }, { c: [2, 3] }]] as const;
    const k2 = ['a', [{ c: [2, 3] }, { b: 1 }]] as const;

    expect(hashQueryKey(k1)).not.toBe(hashQueryKey(k2));
  });
});
