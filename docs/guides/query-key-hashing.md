# Query Key Hashing

## Scope

_This guide explains what query keys how matching works, how hashing works and how it is used internally._

TanStack Query uses query keys to uniquely identify pieces of server data and to drive all key based operations like caching, deduplication, and invalidation. Internally, the library converts each key into a stable string hash (often called the queryHash) so the cache can store and find entries efficiently.

A query key is an array whose elements are JSON serializable (strings, numbers, booleans, null, nested objects/arrays, etc...). Arrays are used deliberately because they preserve order and enable hierarchical, prefix-based matching (for example, ['todos'] matches ['todos', 1] and ['todos', {page:1}]). In other words, array shape encodes the "namespace" and "arguments" of your data request.

When we call useQuery for example, TanStack Query first hashes the query key provided inside the hook into a string. The hashing actually uses a JSON stringify approach so that object key order doesn’t matter (`{a:1,b:2}` equals `{b:2,a:1}`) but array order does (`[1,2]` is different from `[2,1]`). The end product is a _deterministic_ string stored and used as the map key inside caches.

Why stable ? If two keys are logically the same, their hash must be identical, regardless of incidental object key ordering.

The queryHash is then used as the internal identity in QueryCache / MutationCache (think of a data structure like `Map<string, Query>`). All cache actions operate via this hashed ID.

Most key based APIs of Tanstack Query accept a key filter and optional flags. By default, they perform prefix matching on the key array. That’s why the top-level array is required : `['todos']` will match every todo-related query but an option `exact: true` constrains it to an exact key only.

In Tanstack Query's query-core package, the function is named hashKey. It is doing a JSON.stringify with a replacer to sort object keys before serialize them. If the value is a "plain" object, the function build a new object with the keys sorted and then serialize. If not, it returned the value and let JSON.stringify compute the result.

This is litteraly what we can see inside the Tantstack Query codebase : 

```typescript
export function hashKey(queryKey: QueryKey | MutationKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )
}
```
