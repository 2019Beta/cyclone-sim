const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js','utf8');
assert.match(ui,/const STORM_IMAGERY_RASTER_SIZE = 160/);
assert.match(ui,/const STORM_IMAGERY_BASE_SCAN_RASTER_SIZE = 160/);
assert.match(ui,/const STORM_IMAGERY_SAR_RASTER_SIZE = 128/);

const start = ui.indexOf('const STORM_IMAGERY_PANEL_WIDTH');
const end = ui.indexOf('function stormImageryTabEnabled');
assert.ok(start>=0 && end>start,'adaptive imagery framing helpers are present');

const context = {
    Math,
    Number,
    TROP:2,
    SUBTROP:1,
    MONSOON:4
};
vm.runInNewContext(ui.slice(start,end)+
    '\nglobalThis.getMinimumExtent = stormImageryMinimumExtent;',context);

const compact = {type:context.TROP,rmwX:2.5,rmwY:2.5};
const medium = {type:context.TROP,rmwX:5,rmwY:5};
const broad = {type:context.TROP,rmwX:8,rmwY:8};
const extratropical = {type:0,rmwX:2.5,rmwY:2.5};

assert.equal(context.getMinimumExtent(compact,{},false),30,
    'compact tropical systems should receive the tighter cloud/IR crop');
assert.ok(context.getMinimumExtent(medium,{},false)>30 &&
    context.getMinimumExtent(medium,{},false)<42,
    'tropical framing should transition continuously with storm size');
assert.equal(context.getMinimumExtent(broad,{},false),42,
    'broad tropical systems should keep the legacy cloud/IR crop');
assert.equal(context.getMinimumExtent(extratropical,{},false),42,
    'non-tropical systems should keep the legacy cloud/IR crop');
assert.equal(context.getMinimumExtent(compact,{},true),38,
    'compact tropical SAR framing should also use the tighter crop');
assert.equal(context.getMinimumExtent(broad,{},true),52,
    'broad tropical SAR framing should keep its wider context');

console.log('Adaptive tropical-cyclone framing preserves raster sizes and improves compact-storm sampling.');
