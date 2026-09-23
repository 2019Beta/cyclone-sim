const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js','utf8');
const start = ui.indexOf('function updateStormImageryPanel');
const end = ui.indexOf('function ensureStormImageryRaster',start);
assert.ok(start>=0 && end>start,'storm imagery panel updater is present');

let hideCalls = 0;
let polarUpdateCalls = 0;
const context = {
    stormImageryPanel:{
        hide(){ hideCalls++; },
        show(){ assert.fail('disabled imagery interface must not be shown'); }
    },
    stormImageryPanelEnabled(){ return true; },
    stormImageryTabEnabled(tab){
        return tab==='clouds' ? false : true;
    },
    updatePolarSatellitePanel(){ polarUpdateCalls++; },
    normalizeStormImageryTab(){
        assert.fail('disabled imagery interface should return before tab setup');
    }
};

vm.runInNewContext(
    ui.slice(start,end)+'\nglobalThis.updatePanel = updateStormImageryPanel;',
    context
);
context.updatePanel();

assert.equal(hideCalls,1,
    'disabling Clouds / IR-BD must hide the complete storm imagery panel');
assert.equal(polarUpdateCalls,1,
    'related panel visibility should still be refreshed');

console.log('Clouds / IR-BD setting hides the complete storm imagery panel.');
