const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=p=>readFileSync(join(__dirname,'../public',p),'utf8');
const theme=read('zonenta-theme.css');
const sw=read('sw.js');
test('Desktop floating map actions sit above the bottom attribution strip',()=>{
  assert.match(theme,/@media \(min-width:761px\)\{\s*body\.map-view-active #mobileRateCTA,body\.map-view-active #mobileSheetChip\{/);
  assert.match(theme,/position:fixed;bottom:calc\(94px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(theme,/bottom:calc\(78px \+ env\(safe-area-inset-bottom\)\);min-height:40px/);
  assert.doesNotMatch(theme,/position:fixed;bottom:28px;z-index:22/);
  assert.match(sw,/v44-fullwidth-attribution/);
  // The baseline is absolute with left/right 0: don't constrain its width.
  assert.match(theme,/body\.map-view-active #viewExplorar \.map-baseline\{max-width:none\}/);
  assert.doesNotMatch(theme,/\.map-baseline\{max-width:calc\(100% - 22px\)\}/);
  // Both CTAs move left by the same amount, keeping their spacing and height.
  assert.match(theme,/body\.map-view-active #mobileRateCTA\{right:171px;/);
  assert.match(theme,/body\.map-view-active #mobileSheetChip\{right:34px;/);
});
