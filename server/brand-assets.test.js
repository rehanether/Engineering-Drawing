const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');

test('favicon and installed-app icons exist with their declared PNG dimensions', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const icons = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).icons;
  for (const match of html.matchAll(/<link\s+([^>]+)>/g)) {
    if (!/rel="(?:icon|apple-touch-icon)"/.test(match[1])) continue;
    icons.push({ src: match[1].match(/href="([^"]+)"/)[1], sizes: match[1].match(/sizes="([^"]+)"/)?.[1] });
  }
  assert.ok(icons.some(icon => icon.sizes === '512x512'), 'Provide a high-resolution brand icon');
  for (const icon of icons) {
    const file = path.join(root, icon.src.split('?')[0]);
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length > 0, icon.src);
    if (file.endsWith('.png')) {
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', icon.src);
      assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes, icon.src);
    }
  }
});

test('legacy logo and metadata use the approved brand artwork', () => {
  const source = fs.readFileSync(path.resolve(root, '../src/assets/logo.png'));
  const svg = fs.readFileSync(path.join(root, 'assets/edg_logo.svg'), 'utf8');
  assert.ok(svg.includes(source.toString('base64')), 'Legacy SVG must embed the approved logo');
  assert.deepEqual(fs.readFileSync(path.join(root, 'assets/logo-512.png')), fs.readFileSync(path.join(root, 'assets/edg-512.png')));
  const ico = fs.readFileSync(path.join(root, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (let i = 0; i < 3; i++) {
    const entry = 6 + i * 16;
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.equal(ico.subarray(offset, offset + 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(offset + length <= ico.length);
  }
});
