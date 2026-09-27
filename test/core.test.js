import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Trie } from '../src/index.js';

// Single-word insert and exact match.
test('contains returns true for an inserted word', () => {
  const t = new Trie();
  t.insert('apple');
  assert.equal(t.contains('apple'), true);
});

// A word that shares a prefix but was never inserted must not match.
test('contains returns false for a prefix that is not a stored word', () => {
  const t = new Trie();
  t.insert('apple');
  assert.equal(t.contains('app'), false);
});

test('contains returns false for a word not inserted', () => {
  const t = new Trie();
  t.insert('apple');
  assert.equal(t.contains('apricot'), false);
});

// Empty string is explicitly not stored and not matched.
test('inserting empty string is a no-op', () => {
  const t = new Trie();
  t.insert('');
  assert.equal(t.size, 0);
  assert.equal(t.contains(''), false);
});

// startsWith returns only whole stored words, not bare prefixes.
test('startsWith returns stored words with the given prefix', () => {
  const t = new Trie();
  t.insertAll(['app', 'apple', 'apply', 'banana']);
  assert.deepEqual(t.startsWith('app').sort(), ['app', 'apple', 'apply']);
});

// The empty prefix lists the whole vocabulary.
test('startsWith with empty prefix returns all words', () => {
  const t = new Trie();
  t.insertAll(['dog', 'cat', 'cow']);
  assert.deepEqual(t.startsWith(''), ['cat', 'cow', 'dog']);
});

// A prefix with no matches returns an empty array, not null.
test('startsWith returns empty array when no word matches', () => {
  const t = new Trie();
  t.insert('apple');
  assert.deepEqual(t.startsWith('xyz'), []);
});

// maxResults caps the count and returns the lexicographically smallest first.
test('startsWith respects maxResults', () => {
  const t = new Trie();
  t.insertAll(['a1', 'a2', 'a3', 'a4', 'a5']);
  assert.equal(t.startsWith('a', 3).length, 3);
  assert.deepEqual(t.startsWith('a', 3), ['a1', 'a2', 'a3']);
});

// maxResults of zero yields an empty array, never a partial or thrown error.
test('startsWith with maxResults 0 returns empty array', () => {
  const t = new Trie();
  t.insertAll(['a1', 'a2']);
  assert.deepEqual(t.startsWith('a', 0), []);
});

// Case sensitivity is a deliberate, documented choice.
test('matching is case-sensitive', () => {
  const t = new Trie();
  t.insertAll(['Camel', 'camel']);
  assert.equal(t.contains('Camel'), true);
  assert.equal(t.contains('camel'), true);
  assert.equal(t.contains('CAMEL'), false);
  assert.deepEqual(t.startsWith('C'), ['Camel']);
});

// Inserting the same word twice must not double-count.
test('duplicate insert does not increase size', () => {
  const t = new Trie();
  t.insert('hi');
  t.insert('hi');
  assert.equal(t.size, 1);
});

// insertAll deduplicates because insert is idempotent.
test('insertAll deduplicates', () => {
  const t = new Trie();
  t.insertAll(['go', 'go', 'gone', 'gone']);
  assert.equal(t.size, 2);
});

// A prefix equal to an exact match should include that word.
test('startsWith includes exact match when prefix equals a word', () => {
  const t = new Trie();
  t.insertAll(['car', 'cart', 'carp']);
  assert.deepEqual(t.startsWith('car'), ['car', 'carp', 'cart']);
});

// Non-string input to contains is a soft failure, returning false.
test('contains returns false for non-string input', () => {
  const t = new Trie();
  t.insert('x');
  assert.equal(t.contains(/** @type {unknown} */ (42)), false);
  assert.equal(t.contains(/** @type {unknown} */ (null)), false);
  assert.equal(t.contains(/** @type {unknown} */ (undefined)), false);
});

// insertAll quietly skips non-string entries so a stray null in a JSON array
// does not poison the whole batch.
test('insertAll skips non-string entries', () => {
  const t = new Trie();
  t.insertAll(['ok', /** @type {unknown} */ (42), null, 'also']);
  assert.equal(t.size, 2);
  assert.equal(t.contains('ok'), true);
  assert.equal(t.contains('also'), true);
});

// Inserting after querying still works: the trie is mutable.
test('trie is mutable across operations', () => {
  const t = new Trie();
  assert.deepEqual(t.startsWith('a'), []);
  t.insert('ant');
  assert.deepEqual(t.startsWith('a'), ['ant']);
  t.insert('antelope');
  assert.deepEqual(t.startsWith('a'), ['ant', 'antelope']);
});
