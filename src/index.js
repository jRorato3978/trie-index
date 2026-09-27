/**
 * Public surface of the Trie Index library.
 *
 * Re-exports the core Trie implementation so consumers can `import { Trie }
 * from '@your-org/trie-index'` without reaching into internal modules. Keeping
 * the entry point explicit makes the public API a single, auditable file.
 */
export { Trie } from './core.js';
