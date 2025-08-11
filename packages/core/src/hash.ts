/**
 * Key hashing for query identification.
 *
 * In TanStack Query, the cache is keyed by a "query key" that is hashed in a
 * stable way (object key order must not matter, arrays must matter, etc...).
 *
 * Mapping to TanStack Query v5 :
 *  - TanStack Query has a stable hashing routine for query keys so that the cache/invalidation logic is predictable.
 *  - My implementation is intentionally smaller but mirrors the same intent : same inputs → same hash.
 */

import type { QueryKey } from './index';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function isTypedArray(value: unknown): value is ArrayBufferView & { length: number } {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function ownKeysSorted(obj: Record<string | symbol, unknown>): (string | symbol)[] {
  // Include symbol keys for completeness; order: string keys (sorted) then symbol keys (sorted by description)
  const stringKeys = Object.keys(obj).sort();
  const symbolKeys = Object.getOwnPropertySymbols(obj).sort((a, b) => {
    const da = a.description ?? '';
    const db = b.description ?? '';
    return da < db ? -1 : da > db ? 1 : 0;
  });
  return [...stringKeys, ...symbolKeys];
}

// ————————————————————————————————————————————————————————————————————————————
// stableStringify
// ————————————————————————————————————————————————————————————————————————————

/**
 * Produce a canonical string for a value.
 *
 * Rules:
 *  - Arrays: order matters (`[a,b] !== [b,a]`), elements stringified in order.
 *  - Objects: key order does **not** matter; keys are sorted; includes `undefined` explicitly.
 *  - Primitive tags to avoid collisions (`str:`, `num:`, etc.).
 *  - Date, RegExp, BigInt, Symbol, Function, Map, Set, TypedArray: tagged forms.
 *  - Circular references: throws a TypeError (query keys should not be circular).
 */
export function stableStringify(value: unknown, seen = new Set<unknown>()): string {
  // null
  if (value === null) return 'null';

  // primitives
  const t = typeof value;
  if (t === 'string') return `str:${JSON.stringify(value)}`;
  if (t === 'number') return Number.isNaN(value) ? 'num:NaN' : `num:${value}`;
  if (t === 'boolean') return `bool:${value ? 1 : 0}`;
  if (t === 'bigint') return `bigint:${(value as bigint).toString()}`;
  if (t === 'undefined') return 'undef';
  if (t === 'symbol') return `sym:${(value as symbol).description ?? ''}`;
  if (t === 'function') {
    // Functions are not recommended in query keys; we serialize the name to reduce collisions.
    const name = (value as Function).name || 'anonymous';
    return `fn:${name}`;
  }

  // Dates
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 'date:invalid' : `date:${value.toISOString()}`;
  }

  // RegExp
  if (value instanceof RegExp) {
    return `regexp:${value.toString()}`;
  }

  // Typed arrays (e.g., Uint8Array)
  if (isTypedArray(value)) {
    const ctor = (value as { constructor?: { name?: string } })?.constructor?.name ?? 'TypedArray';
    const arr = Array.from(value as unknown as ArrayLike<number>);
    return `typed:${ctor}:${arr.join(',')}`;
  }

  // Array
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('stableStringify: circular array reference');
    seen.add(value);
    const inner = value.map((v) => stableStringify(v, seen)).join(',');
    seen.delete(value);
    return `[${inner}]`;
  }

  // Map
  if (value instanceof Map) {
    if (seen.has(value)) throw new TypeError('stableStringify: circular Map reference');
    seen.add(value);
    // sort by key stringification to remain stable
    const entries = Array.from(value.entries())
      .map(([k, v]) => [stableStringify(k, seen), stableStringify(v, seen)] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    seen.delete(value);
    return `map:{${entries}}`;
  }

  // Set
  if (value instanceof Set) {
    if (seen.has(value)) throw new TypeError('stableStringify: circular Set reference');
    seen.add(value);
    const items = Array.from(value.values())
      .map((v) => stableStringify(v, seen))
      .sort()
      .join(',');
    seen.delete(value);
    return `set:[${items}]`;
  }

  // Plain object
  if (isPlainObject(value)) {
    if (seen.has(value)) throw new TypeError('stableStringify: circular object reference');
    seen.add(value);
    const pairs: string[] = [];
    for (const k of ownKeysSorted(value as Record<string | symbol, unknown>)) {
      const keyLabel =
        typeof k === 'string' ? `key:${JSON.stringify(k)}` : `keysym:${k.description ?? ''}`;
      // We intentionally include undefined to distinguish {a:undefined} from {}
      const v = (value as Record<string | symbol, unknown>)[k];
      const entry = `${keyLabel}=>${stableStringify(v, seen)}`;
      pairs.push(entry);
    }
    seen.delete(value);
    return `{${pairs.join(',')}}`;
  }

  // Fallback for exotic objects
  const tag = Object.prototype.toString.call(value); // e.g. [object WeakMap]
  return `obj:${tag}`;
}

// ————————————————————————————————————————————————————————————————————————————
// hashQueryKey
// ————————————————————————————————————————————————————————————————————————————

/**
 * Compute the canonical hash for a QueryKey.
 *
 * We serialize the key with stableStringify and prefix with "qk:" to avoid
 * accidental collisions with raw strings.
 *
 * Examples:
 *  - ['todos', 1] → qk:["str:\"todos\"",num:1]
 *  - {a:1, b:2} vs {b:2, a:1} → same hash
 *  - ['todos'] vs 'todos' → different hashes
 */
export function hashQueryKey(key: QueryKey): string {
  return `qk:${stableStringify(key)}`;
}
