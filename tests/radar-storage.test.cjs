const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const environment = read('environment.js');
const basin = read('basin.js');
const simModes = read('sim-mode-defs.js');
const ui = read('ui.js');

assert.doesNotMatch(environment,/\b(recordRadar|getSavedRadar)\b/);
assert.doesNotMatch(basin,/\bradarData\b|recordRadar/);
assert.doesNotMatch(simModes,/getSavedRadar/);
assert.match(simModes,/simulatedRadarReflectivity/);
assert.match(simModes,/simulatedIrBdColor/);
assert.match(simModes,/simulatedIrBdShade/);
assert.match(ui,/stormImageryPanel/);
assert.match(ui,/stormImageryIrBdTab/);
assert.match(ui,/'irBd'/);
assert.match(ui,/UI\.viewBasin\.viewingPresent\(\)/);

console.log('Simulated cloud/radar imagery is live-only, panel-backed, and excluded from saves.');
