const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'../public');
const theme=readFileSync(join(root,'zonenta-theme.css'),'utf8');
const app=readFileSync(join(root,'app.js'),'utf8');
test('Save and Compare use two equally sized full width columns in mobile zone details',()=>{
  assert.match(app,/class="detail-secondary-actions"/);
  assert.match(theme,/@media \(max-width:760px\)\{\s*body\.map-view-active #detailsContent \.detail-actions\{/);
  assert.match(theme,/body\.map-view-active #detailsContent \.detail-actions\{[^}]*flex-direction:column/);
  assert.match(theme,/body\.map-view-active #detailsContent \.detail-secondary-actions\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(theme,/body\.map-view-active #detailsContent \.detail-secondary-actions > \.secondary-button\{[^}]*min-width:0/);
  assert.match(theme,/body\.map-view-active #detailsContent \.detail-actions > \.primary-button\{[^}]*width:100%/);
});
