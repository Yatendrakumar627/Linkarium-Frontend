import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  removeOperator,
  toggleOperator,
  hasOperator,
  replaceLastWord,
} from '../src/utils/searchQuery.js';

describe('client/src/utils/searchQuery.js', () => {
  describe('hasOperator', () => {
    test('returns true when query has exact operator', () => {
      assert.strictEqual(hasOperator('tag:react dev', 'tag:react'), true);
      assert.strictEqual(hasOperator('dev tag:react', 'tag:react'), true);
      assert.strictEqual(hasOperator('tag:react', 'tag:react'), true);
    });

    test('is case-insensitive', () => {
      assert.strictEqual(hasOperator('TAG:REACT', 'tag:react'), true);
      assert.strictEqual(hasOperator('tag:ai', 'TAG:AI'), true);
    });

    test('does not match substrings of another token', () => {
      assert.strictEqual(hasOperator('tag:reactive', 'tag:react'), false);
      assert.strictEqual(hasOperator('metatag:react', 'tag:react'), false);
    });

    test('returns false for empty query or operator', () => {
      assert.strictEqual(hasOperator('', 'tag:react'), false);
      assert.strictEqual(hasOperator('tag:react', ''), false);
      assert.strictEqual(hasOperator(null, null), false);
    });
  });

  describe('removeOperator', () => {
    test('removes operator cleanly without leaving redundant spaces', () => {
      assert.strictEqual(removeOperator('react tag:ai tutorials', 'tag:ai'), 'react tutorials');
      assert.strictEqual(removeOperator('tag:ai tutorials', 'tag:ai'), 'tutorials');
      assert.strictEqual(removeOperator('tutorials tag:ai', 'tag:ai'), 'tutorials');
      assert.strictEqual(removeOperator('tag:ai', 'tag:ai'), '');
    });

    test('removes operator case-insensitively when casing differs', () => {
      assert.strictEqual(removeOperator('tutorials TAG:AI', 'tag:ai'), 'tutorials');
    });

    test('returns original string if operator is not found', () => {
      assert.strictEqual(removeOperator('tutorials react', 'tag:ai'), 'tutorials react');
    });
  });

  describe('toggleOperator', () => {
    test('appends operator if not present', () => {
      assert.strictEqual(toggleOperator('javascript', 'tag:frontend'), 'javascript tag:frontend');
      assert.strictEqual(toggleOperator('', 'tag:dev'), 'tag:dev');
    });

    test('removes operator if already present', () => {
      assert.strictEqual(toggleOperator('javascript tag:frontend', 'tag:frontend'), 'javascript');
      assert.strictEqual(toggleOperator('tag:dev', 'tag:dev'), '');
    });
  });

  describe('replaceLastWord', () => {
    test('replaces the word currently being typed with suggestion', () => {
      assert.strictEqual(replaceLastWord('search tag:r', 'tag:react'), 'search tag:react');
      assert.strictEqual(replaceLastWord('tag:r', 'tag:rust'), 'tag:rust');
      assert.strictEqual(replaceLastWord('javascript', 'typescript'), 'typescript');
    });

    test('handles empty input gracefully', () => {
      assert.strictEqual(replaceLastWord('', 'tag:new'), 'tag:new');
    });
  });
});

