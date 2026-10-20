const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const root = join(__dirname, '..', 'public');
const get = name => readFileSync(join(root,name), 'utf8');
const html = get('index.html');
const css = get('mobile-sheet-fix.css');
const js = get('mobile-sheet-fix.js');
const sw = get('sw.js');

test('mobile fix loads after existing Radar Pulse CSS and JS', () => {
  assert.ok(html.indexOf('/radar-dark.css') < html.indexOf('/mobile-sheet-fix.css'));
  assert.ok(html.indexOf('/radar-ui.js') < html.indexOf('/mobile-sheet-fix.js'));
});
test('sheet is lifted out of pointer-restricted map layout on mobile', () => {
  assert.match(js, /document\.body\.appendChild\(sheet\)/);
  assert.match(js, /home\.insertBefore\(sheet, anchor\.nextSibling\)/);
  assert.match(css, /body > #detailsCard\.mobile-sheet-root/);
});
test('the entire panel is the touch-scroll container with a sticky header', () => {
  assert.match(css, /overflow-y: auto !important;/);
  assert.match(css, /-webkit-overflow-scrolling: touch;/);
  assert.match(css, /touch-action: pan-y;/);
  assert.match(css, /position: sticky !important;/);
  assert.match(css, /height: auto !important;/);
  assert.match(css, /overflow: visible !important;/);
});
test('expand, shrink and close keep independent controls', () => {
  assert.match(js, /expand\.addEventListener\('click', toggle\)/);
  assert.match(js, /event\.stopImmediatePropagation\(\)/);
  assert.match(js, /classList\.toggle\('sheet-expanded'/);
  assert.match(css, /sheet-open\.sheet-expanded/);
  assert.match(html, /id="sheetClose"/);
});
test('the service worker preloads new files and invalidates prior cache', () => {
  assert.match(sw, /barrioradar-pulse-mapas-v19-sheet-fix/);
  assert.match(sw, /'\/mobile-sheet-fix.css'/);
  assert.match(sw, /'\/mobile-sheet-fix.js'/);
});