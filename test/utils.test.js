import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  hostOf,
  getYouTubeThumbnail,
  faviconUrl,
  timeAgo,
  timeAgoShort,
  initialsOf,
  normalizeHex,
  relativeLuminance,
  contrastRatio,
  readableTextOn,
  safeUrl,
  withQuery,
  cleanUrl,
  suggestTagsForUrl,
  getTagColor,
} from '../src/utils.js';

describe('client/src/utils.js', () => {
  describe('hostOf', () => {
    test('strips www and extracts hostname', () => {
      assert.strictEqual(hostOf('https://www.google.com/search?q=test'), 'google.com');
      assert.strictEqual(hostOf('http://github.com/facebook/react'), 'github.com');
      assert.strictEqual(hostOf('https://sub.domain.co.uk/path'), 'sub.domain.co.uk');
    });

    test('returns original string if URL parsing fails', () => {
      assert.strictEqual(hostOf('not a url'), 'not a url');
    });
  });

  describe('getYouTubeThumbnail', () => {
    test('extracts thumbnail for standard watch URLs', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      assert.strictEqual(
        getYouTubeThumbnail(url),
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      );
    });

    test('extracts thumbnail for youtu.be shortlinks', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      assert.strictEqual(
        getYouTubeThumbnail(url),
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      );
    });

    test('extracts thumbnail for YouTube shorts', () => {
      const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      assert.strictEqual(
        getYouTubeThumbnail(url),
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      );
    });

    test('extracts thumbnail for YouTube embeds', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      assert.strictEqual(
        getYouTubeThumbnail(url),
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      );
    });

    test('returns null for non-YouTube URLs or invalid video IDs', () => {
      assert.strictEqual(getYouTubeThumbnail('https://vimeo.com/12345'), null);
      assert.strictEqual(getYouTubeThumbnail('https://youtube.com/watch?v=short'), null);
      assert.strictEqual(getYouTubeThumbnail(null), null);
    });
  });

  describe('faviconUrl', () => {
    test('uses YouTube thumbnail poster for YouTube URLs', () => {
      const res = faviconUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      assert.strictEqual(res, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });

    test('uses declared ogFavicon if available and not YouTube', () => {
      const res = faviconUrl('https://github.com/repo', 'https://github.com/custom-icon.png');
      assert.strictEqual(res, 'https://github.com/custom-icon.png');
    });

    test('falls back to Google favicon service with sz=128', () => {
      const res = faviconUrl('https://news.ycombinator.com');
      assert.strictEqual(
        res,
        'https://www.google.com/s2/favicons?domain=news.ycombinator.com&sz=128'
      );
    });

    test('returns null on invalid URL', () => {
      assert.strictEqual(faviconUrl('invalid-url'), null);
    });
  });

  describe('timeAgo & timeAgoShort', () => {
    const now = Date.now();

    test('formats just now / now for recent timestamps', () => {
      assert.strictEqual(timeAgo(new Date(now - 5000)), 'just now');
      assert.strictEqual(timeAgoShort(new Date(now - 5000)), 'now');
    });

    test('formats minutes ago', () => {
      const twoMinsAgo = new Date(now - 2 * 60 * 1000);
      assert.strictEqual(timeAgo(twoMinsAgo), '2 mins ago');
      assert.strictEqual(timeAgoShort(twoMinsAgo), '2m');
    });

    test('formats hours ago', () => {
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);
      assert.strictEqual(timeAgo(oneHourAgo), '1 hr ago');
      assert.strictEqual(timeAgoShort(oneHourAgo), '1h');
    });

    test('formats days ago', () => {
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      assert.strictEqual(timeAgo(threeDaysAgo), '3 days ago');
      assert.strictEqual(timeAgoShort(threeDaysAgo), '3d');
    });

    test('handles empty dates gracefully', () => {
      assert.strictEqual(timeAgo(null), '');
      assert.strictEqual(timeAgoShort(null), '');
    });
  });

  describe('initialsOf', () => {
    test('extracts up to 2 uppercase initials from full names', () => {
      assert.strictEqual(initialsOf('Ada Lovelace'), 'AL');
      assert.strictEqual(initialsOf('Linus Benedict Torvalds'), 'LB');
      assert.strictEqual(initialsOf('Antigravity'), 'A');
      assert.strictEqual(initialsOf('  jane   doe  '), 'JD');
      assert.strictEqual(initialsOf(''), '');
    });
  });

  describe('normalizeHex', () => {
    test('normalizes 3-digit and 6-digit hex values', () => {
      assert.strictEqual(normalizeHex('#fff'), '#ffffff');
      assert.strictEqual(normalizeHex('000'), '#000000');
      assert.strictEqual(normalizeHex('#00D68F'), '#00d68f');
      assert.strictEqual(normalizeHex('ABCDEF'), '#abcdef');
    });

    test('returns null for invalid hex strings', () => {
      assert.strictEqual(normalizeHex('not-a-color'), null);
      assert.strictEqual(normalizeHex('#ffff'), null);
      assert.strictEqual(normalizeHex(null), null);
    });
  });

  describe('WCAG contrast utilities', () => {
    test('relativeLuminance computes correct values for black and white', () => {
      assert.strictEqual(relativeLuminance('#000000'), 0);
      assert.strictEqual(Math.round(relativeLuminance('#ffffff') * 100) / 100, 1);
    });

    test('contrastRatio returns 21 for black against white', () => {
      const ratio = contrastRatio('#000000', '#ffffff');
      assert.strictEqual(Math.round(ratio), 21);
    });

    test('readableTextOn selects readable ink for background colors', () => {
      // Light background needs dark ink
      assert.strictEqual(readableTextOn('#ffffff'), '#0b0b14');
      assert.strictEqual(readableTextOn('#ffff00'), '#0b0b14');
      // Dark background needs light ink
      assert.strictEqual(readableTextOn('#000000'), '#ffffff');
      assert.strictEqual(readableTextOn('#1a1a2e'), '#ffffff');
    });
  });

  describe('safeUrl', () => {
    test('accepts valid http and https urls', () => {
      assert.strictEqual(safeUrl('https://example.com'), 'https://example.com');
      assert.strictEqual(safeUrl('http://example.com/page'), 'http://example.com/page');
    });

    test('rejects non-http protocols and invalid values', () => {
      assert.strictEqual(safeUrl('javascript:alert(1)'), null);
      assert.strictEqual(safeUrl('file:///etc/hosts'), null);
      assert.strictEqual(safeUrl(null), null);
    });
  });

  describe('withQuery', () => {
    test('builds query string correctly and drops nullish/empty values', () => {
      const res = withQuery('https://api.example.com/items', {
        page: 2,
        search: 'react',
        empty: '',
        absent: null,
        missing: undefined,
      });
      assert.strictEqual(res, 'https://api.example.com/items?page=2&search=react');
    });

    test('returns base when no params are given', () => {
      assert.strictEqual(withQuery('https://api.example.com', {}), 'https://api.example.com');
    });
  });

  describe('cleanUrl', () => {
    test('strips tracking parameters', () => {
      const raw = 'https://example.com/article/?utm_source=twitter&utm_medium=social&fbclid=12345&keep=true';
      const { cleaned, wasCleaned } = cleanUrl(raw);
      assert.strictEqual(cleaned, 'https://example.com/article/?keep=true');
      assert.strictEqual(wasCleaned, true);
    });

    test('strips trailing slash when only tracking params are removed', () => {
      const raw = 'https://example.com/article/?utm_source=twitter';
      const { cleaned, wasCleaned } = cleanUrl(raw);
      assert.strictEqual(cleaned, 'https://example.com/article');
      assert.strictEqual(wasCleaned, true);
    });

    test('returns wasCleaned: false if no tracking params were found', () => {
      const raw = 'https://example.com/about';
      const { cleaned, wasCleaned } = cleanUrl(raw);
      assert.strictEqual(cleaned, 'https://example.com/about');
      assert.strictEqual(wasCleaned, false);
    });
  });

  describe('suggestTagsForUrl', () => {
    test('suggests dev for github URLs', () => {
      const tags = suggestTagsForUrl('https://github.com/facebook/react', 'React Documentation');
      assert.ok(tags.includes('dev'));
      assert.ok(tags.includes('react'));
    });

    test('suggests video for youtube URLs', () => {
      const tags = suggestTagsForUrl('https://www.youtube.com/watch?v=123');
      assert.ok(tags.includes('video'));
    });

    test('does not suggest already existing tags', () => {
      const tags = suggestTagsForUrl('https://github.com/owner/repo', '', ['dev']);
      assert.ok(!tags.includes('dev'));
    });
  });

  describe('getTagColor', () => {
    test('returns neutral slate for untagged', () => {
      assert.strictEqual(getTagColor('untagged'), '#64748b');
      assert.strictEqual(getTagColor(''), '#64748b');
    });

    test('returns an HSL color for named tags', () => {
      const col = getTagColor('javascript');
      assert.match(col, /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });
  });
});
