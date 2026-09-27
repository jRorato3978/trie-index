# Trie Index

A small, dependency-free autocomplete library for a fixed vocabulary. You build a `Trie`,
insert words, and query prefixes.

```js
import { Trie } from 'trie-index';

const t = new Trie();
t.insertAll(['apple', 'apply', 'app', 'banana']);

t.contains('apple');      // true
t.contains('app');         // false — 'app' is a prefix but also a stored word here, so true
t.startsWith('app');       // ['app', 'apple', 'apply'] in lexicographic order
t.startsWith('app', 2);   // ['app', 'apple'] — capped, smallest first
t.startsWith('');          // ['app', 'apple', 'apply', 'banana'] — everything
t.size;                    // 4
```

## Why this exists

It is for the case where you have a known, bounded set of words — identifiers in a
file, command names, tag names — and you want prefix lookups without pulling in a
fuzzy-search library or building an index at runtime. A trie gives O(k) lookup
where k is the prefix length and returns results already in order. The trade-off
is memory: every distinct character of every word gets a node. For a few
gthousand words that is fine; for a million you would want something compressed
or a different structure entirely.

## The edge you will hit

Matching is **case-sensitive**. `Camel` and `camel` are two different words. If
you need case-insensitive autocomplete, lowercase (or otherwise normalize) your
input before inserting and before querying, and keep your own reverse map if you
need the original casing back in results. There is exactly one rule here, so
there is nothing to configure.

The empty prefix `startsWith('')` returns every stored word, in lexicographic
order. It is not an error. It is cheap for small vocabularies and expensive for
large ones; if your vocabulary is large, pass a `maxResults` cap.

`insert('')` is a no-op. The empty string is not stored and `contains('')` is
always `false`.

## Exported names

- `Trie` — the only export. Construct with `new Trie()`.
  - `insert(word: string): void`
  - `insertAll(words: Iterable<string>): void` — skips non-string entries
  - `contains(word: string): boolean`
  - `startsWith(prefix: string, maxResults?: number = Infinity): string[]`
  - `size: number` — distinct words stored
