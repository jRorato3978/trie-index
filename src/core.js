/**
 * Core trie implementation for fixed-vocabulary autocomplete.
 *
 * Design notes
 * -------------
 * - We hand-roll the trie because the vocabulary is fixed and small-to-medium;
 *   a prefix tree gives O(k) lookup where k is prefix length, with zero
 *   per-query allocation beyond the result array. That is the trade-off: more
 *   memory than a sorted array, but simpler and faster per query.
 * - Keys are case-sensitive by deliberate choice. Fixed vocabularies for code
 *   completion (identifiers, paths, symbols) are case-sensitive, and silently
 *   lowercasing would erase distinctions the caller cares about. Callers who
 *   want case-insensitive behavior must normalize before insert/lookup and
 *   keep a reverse map if they need original casing back. This is documented
 *   in the README so there is exactly one rule, not two.
 * - Prefix splitting is by UTF-16 code unit via String indexing. JS strings are
 *   UTF-16 and our code points are all in the BMP for the intended use; if a
 *   supplementary plane character appears, the two surrogate halves index
 *   independently. This is acceptable for an autocomplete over identifiers,
 *   which is the stated purpose. Handling grapheme clusters is out of scope.
 */

/**
 * A node in the trie. Children are keyed by single-character string keys in a
 * plain object. Using a Map would work too; an object is marginally lighter at
 * small fan-outs, which is the common case for natural-language prefixes.
 */
class TrieNode {
  constructor() {
    /** @type {Record<string, TrieNode>} */
    this.children = {};
    /** @type {boolean} Whether a complete word ends at this node. */
    this.isEnd = false;
  }
}

export class Trie {
  /**
   * Build an empty trie. Use `insert` to populate it, then `startsWith` or
   * `contains` to query.
   */
  constructor() {
    this._root = new TrieNode();
    this._size = 0;
  }

  /**
   * Number of distinct words currently stored.
   */
  get size() {
    return this._size;
  }

  /**
   * Add a word to the trie. Empty string is ignored: the empty prefix matches
   * everything by definition, so storing it adds nothing meaningful and would
   * only complicate `contains('')` semantics.
   *
   * @param {string} word
   */
  insert(word) {
    if (typeof word !== 'string') {
      throw new TypeError(`Trie.insert expected a string, got ${typeof word}`);
    }
    if (word === '') return;

    let node = this._root;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      let child = node.children[ch];
      if (child === undefined) {
        child = new TrieNode();
        node.children[ch] = child;
      }
      node = child;
    }
    if (!node.isEnd) {
      node.isEnd = true;
      this._size += 1;
    }
  }

  /**
   * Bulk-insert words. Duplicate words are deduplicated by the trie itself, so
   * callers don't have to pre-unique their array. Non-string entries are
   * skipped rather than throwing, because a mixed array is a plausible input
   * from JSON and failing the whole batch on one bad element would be
   * surprising.
   *
   * @param {Iterable<string>} words
   */
  insertAll(words) {
    for (const w of words) {
      if (typeof w === 'string') this.insert(w);
    }
  }

  /**
   * Exact membership test.
   *
   * @param {string} word
   * @returns {boolean}
   */
  contains(word) {
    if (typeof word !== 'string') return false;
    if (word === '') return false;
    const node = this._walk(word);
    return node !== null && node.isEnd;
  }

  /**
   * Return all stored words that begin with `prefix`. Results are returned in
   * lexicographic order of the stored strings — a natural, deterministic order
   * that makes tests and UI stable without requiring the caller to sort.
   *
   * The empty prefix returns every word, again in lexicographic order. This is
   * the one edge case that surprises people: `startsWith('')` is not an error,
   * it is "list everything". It is cheap when the vocabulary is small.
   *
   * `maxResults` caps the count. When the cap bites, results are still the
   * lexicographically smallest matches, because we traverse children in sorted
   * key order. A negative or non-finite limit is treated as unlimited.
   *
   * @param {string} prefix
   * @param {number} [maxResults=Infinity]
   * @returns {string[]}
   */
  startsWith(prefix, maxResults = Infinity) {
    if (typeof prefix !== 'string') {
      throw new TypeError(`startsWith expected a string prefix, got ${typeof prefix}`);
    }
    if (!Number.isFinite(maxResults) || maxResults < 0) {
      maxResults = Infinity;
    }
    const cap = Math.max(0, Math.floor(maxResults));
    if (cap === 0) return [];

    const start = prefix === '' ? this._root : this._walk(prefix);
    if (start === null) return [];

    /** @type {string[]} */
    const out = [];
    // Sorted child keys give deterministic, lexicographic output without an
    // extra sort pass at the end.
    const stack = /** @type {Array<{node: TrieNode, prefix: string}>} */ ([]);
    // Push children of the start node in reverse-sorted order so that popping
    // yields ascending order.
    const childKeys = Object.keys(start.children).sort();
    for (let i = childKeys.length - 1; i >= 0; i--) {
      stack.push({ node: start.children[childKeys[i]], prefix: prefix + childKeys[i] });
    }
    // If the start node is itself a word end, it sorts before any longer
    // strings sharing the prefix, so emit it first.
    if (start.isEnd) {
      out.push(prefix);
      if (out.length >= cap) return out;
    }
    while (stack.length > 0) {
      const { node, prefix: p } = /** @type {{node: TrieNode, prefix: string}} */ (stack.pop());
      if (node.isEnd) {
        out.push(p);
        if (out.length >= cap) return out;
      }
      const ks = Object.keys(node.children).sort();
      for (let i = ks.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[ks[i]], prefix: p + ks[i] });
      }
    }
    return out;
  }

  /**
   * Walk to the node for `s`, or null if the path does not exist. Used by both
   * `contains` and `startsWith` so the traversal logic lives in one place.
   *
   * @param {string} s
   * @returns {TrieNode|null}
   */
  _walk(s) {
    let node = this._root;
    for (let i = 0; i < s.length; i++) {
      const child = node.children[s[i]];
      if (child === undefined) return null;
      node = child;
    }
    return node;
  }
}
