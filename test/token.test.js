import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  getToken,
  setToken,
  clearToken,
  setLoggingOut,
  getIsLoggingOut,
} from '../src/api/token.js';

describe('client/src/api/token.js', () => {
  beforeEach(() => {
    clearToken();
    setLoggingOut(false);
  });

  test('stores and retrieves access token in memory', () => {
    assert.strictEqual(getToken(), null);
    setToken('jwt-access-token-12345');
    assert.strictEqual(getToken(), 'jwt-access-token-12345');
  });

  test('clears access token on logout', () => {
    setToken('jwt-access-token-12345');
    clearToken();
    assert.strictEqual(getToken(), null);
  });

  test('tracks logging out state transition', () => {
    assert.strictEqual(getIsLoggingOut(), false);
    setLoggingOut(true);
    assert.strictEqual(getIsLoggingOut(), true);
    setLoggingOut(false);
    assert.strictEqual(getIsLoggingOut(), false);
  });
});

