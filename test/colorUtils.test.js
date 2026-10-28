import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  hexToHsl,
  calibrateHueBracket,
  normalizeHsl,
  setCustomTagColors,
  setCustomTagColor,
  getCustomTagColor,
  tagToHue,
  tagToColor,
  blendHues,
  domainToColor,
  resolveTagColor,
  resolveCardColor,
  BRAND_COLORS,
} from '../src/utils/colorUtils.js';

describe('client/src/utils/colorUtils.js', () => {
  beforeEach(() => {
    // Reset custom tag colors
    setCustomTagColors({});
  });

  describe('hexToHsl', () => {
    test('converts 6-digit hex to HSL object', () => {
      const red = hexToHsl('#ff0000');
      assert.deepStrictEqual(red, { h: 0, s: 100, l: 50 });

      const green = hexToHsl('#00ff00');
      assert.deepStrictEqual(green, { h: 120, s: 100, l: 50 });

      const blue = hexToHsl('#0000ff');
      assert.deepStrictEqual(blue, { h: 240, s: 100, l: 50 });
    });

    test('converts 3-digit shorthand hex', () => {
      const white = hexToHsl('#fff');
      assert.deepStrictEqual(white, { h: 0, s: 0, l: 100 });

      const black = hexToHsl('#000');
      assert.deepStrictEqual(black, { h: 0, s: 0, l: 0 });
    });

    test('returns null for invalid inputs', () => {
      assert.strictEqual(hexToHsl('not-a-hex'), null);
      assert.strictEqual(hexToHsl(null), null);
      assert.strictEqual(hexToHsl(''), null);
    });
  });

  describe('calibrateHueBracket', () => {
    test('calibrates yellow/amber bracket (35 - 85) to avoid washout', () => {
      const cal = calibrateHueBracket(60);
      assert.deepStrictEqual(cal, { s: 82, l: 46 });
    });

    test('calibrates green/mint bracket (85 - 150)', () => {
      const cal = calibrateHueBracket(120);
      assert.deepStrictEqual(cal, { s: 84, l: 48 });
    });

    test('calibrates blue/violet bracket (210 - 280) with raised lightness', () => {
      const cal = calibrateHueBracket(240);
      assert.deepStrictEqual(cal, { s: 88, l: 54 });
    });

    test('uses baseline calibration for other hues', () => {
      const cal = calibrateHueBracket(0); // Red
      assert.deepStrictEqual(cal, { s: 86, l: 50 });
    });
  });

  describe('normalizeHsl', () => {
    test('normalizes hex colors to calibrated HSL strings', () => {
      const res = normalizeHsl('#ff0000');
      assert.strictEqual(res, 'hsl(0, 86%, 50%)');
    });

    test('passes through non-hex and invalid strings unchanged', () => {
      assert.strictEqual(normalizeHsl('rgb(255, 0, 0)'), 'rgb(255, 0, 0)');
      assert.strictEqual(normalizeHsl(null), null);
    });
  });

  describe('Custom Tag Color Registry', () => {
    test('registers and retrieves custom tag colors', () => {
      setCustomTagColor('react', '#61dafb');
      assert.strictEqual(getCustomTagColor('react'), '#61dafb');
      assert.strictEqual(getCustomTagColor('REACT'), '#61dafb'); // case insensitive
    });

    test('bulk sets custom tag colors', () => {
      setCustomTagColors({ vue: '#42b883', svelte: '#ff3e00' });
      assert.strictEqual(getCustomTagColor('vue'), '#42b883');
      assert.strictEqual(getCustomTagColor('svelte'), '#ff3e00');
      assert.strictEqual(getCustomTagColor('react'), null);
    });

    test('removes a custom tag color when set with null', () => {
      setCustomTagColor('typescript', '#3178c6');
      assert.strictEqual(getCustomTagColor('typescript'), '#3178c6');
      setCustomTagColor('typescript', null);
      assert.strictEqual(getCustomTagColor('typescript'), null);
    });
  });

  describe('tagToHue and tagToColor', () => {
    test('produces stable deterministic hue for identical strings', () => {
      const hue1 = tagToHue('javascript');
      const hue2 = tagToHue('javascript');
      assert.strictEqual(hue1, hue2);
      assert.ok(hue1 >= 0 && hue1 < 360);
    });

    test('tagToColor respects custom registered colors', () => {
      setCustomTagColor('custom-tag', '#ff0000');
      const col = tagToColor('custom-tag');
      assert.strictEqual(col, 'hsl(0, 86%, 50%)');
    });

    test('falls back to default stable hue on empty or missing tag name', () => {
      assert.strictEqual(tagToHue(''), 210);
      assert.strictEqual(tagToHue(null), 210);
    });
  });

  describe('blendHues - Shortest Arc Blending', () => {
    test('blends linearly when difference is less than 180°', () => {
      assert.strictEqual(blendHues(0, 100, 0.5), 50);
      assert.strictEqual(blendHues(60, 120, 0.5), 90);
    });

    test('blends across the 360/0 degree seam (circular wrap-around)', () => {
      // Blending 10° and 350° should produce 0° (red), NOT 180° (cyan)!
      const blended = blendHues(10, 350, 0.5);
      assert.strictEqual(blended === 0 || blended === 360, true);
    });
  });

  describe('domainToColor', () => {
    test('matches recognized brand domains', () => {
      assert.strictEqual(domainToColor('https://github.com/repo'), BRAND_COLORS['github.com']);
      assert.strictEqual(domainToColor('https://gitlab.com/repo'), BRAND_COLORS['gitlab.com']);
      assert.strictEqual(domainToColor('https://www.youtube.com/watch?v=123'), BRAND_COLORS['youtube.com']);
      assert.strictEqual(domainToColor('https://my-app.netlify.app'), BRAND_COLORS['netlify.app']);
      assert.strictEqual(domainToColor('https://my-site.vercel.app'), BRAND_COLORS['vercel.app']);
    });

    test('recognizes keyword overrides in title', () => {
      assert.strictEqual(domainToColor('https://unknown.com', 'YouTube Video'), '#f43f7d');
      assert.strictEqual(domainToColor('https://unknown.com', 'Kie Ai Platform'), '#00d68f');
    });

    test('deterministically hashes unknown domains', () => {
      const col1 = domainToColor('https://my-custom-blog.org');
      const col2 = domainToColor('https://my-custom-blog.org');
      assert.strictEqual(col1, col2);
      assert.match(col1, /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });
  });

  describe('resolveCardColor - 5 Classification Modes', () => {
    const sampleLink = {
      _id: 'link1',
      title: 'GitHub Docs',
      url: 'https://github.com/docs',
      tags: ['coding'],
      color: '#a855f7',
    };
    const sampleCollection = {
      _id: 'col1',
      name: 'Work',
      color: '#38bdf8',
    };

    test('Mode "tag": unifies cards by primary tag or active tag view', () => {
      // In tag mode without active view: uses link's primary tag
      const colTag = resolveCardColor(sampleLink, sampleCollection, 'tag');
      assert.strictEqual(colTag, tagToColor('coding'));

      // In tag mode with active view: overrides with active view tag color!
      const colActive = resolveCardColor(sampleLink, sampleCollection, 'tag', { type: 'tag', id: 'active-tag' });
      assert.strictEqual(colActive, tagToColor('active-tag'));
    });

    test('Mode "collection": unifies cards by collection color', () => {
      const col = resolveCardColor(sampleLink, sampleCollection, 'collection');
      assert.strictEqual(col, normalizeHsl('#38bdf8'));
    });

    test('Mode "brand": resolves authentic website brand color', () => {
      const col = resolveCardColor(sampleLink, sampleCollection, 'brand');
      assert.strictEqual(col, BRAND_COLORS['github.com']);
    });

    test('Mode "own": displays card custom link color', () => {
      const col = resolveCardColor(sampleLink, sampleCollection, 'own');
      assert.strictEqual(col, normalizeHsl('#a855f7'));
    });

    test('Mode "blend": produces a harmonic blend between collection, tag and link', () => {
      const col = resolveCardColor(sampleLink, sampleCollection, 'blend');
      assert.match(col, /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });
  });

  describe('resolveTagColor', () => {
    const collection = { color: '#ff0000' };

    test('in collection mode, biases tag hue towards collection hue', () => {
      const tagCol = resolveTagColor('test-tag', collection, 'collection');
      assert.match(tagCol, /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    test('in tag or brand mode, returns pure independent tag color', () => {
      const tagCol = resolveTagColor('test-tag', collection, 'tag');
      assert.strictEqual(tagCol, tagToColor('test-tag'));
    });
  });
});

