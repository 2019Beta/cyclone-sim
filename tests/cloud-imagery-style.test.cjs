const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname,'..');
const ui = fs.readFileSync(path.join(root,'ui.js'),'utf8');
const modeDefs = fs.readFileSync(path.join(root,'sim-mode-defs.js'),'utf8');

assert.match(ui,/const STORM_POLAR_SATELLITE_RASTER_SIZE = 512;/,
    'Polar satellite products should remain genuinely high resolution');
assert.match(ui,
    /drawingContext\.imageSmoothingEnabled = !isSar && !isIrBd;/,
    'Clouds should retain light interpolation while IR-BD and SAR stay discrete');
assert.match(modeDefs,
    /let backgroundTexture = 0\.70\*backgroundBroad\+0\.30\*backgroundCells;/,
    'Background cloud cells should remain subordinate to the broad cloud field');
assert.match(modeDefs,
    /let detail = 0\.50\*broad\+0\.42\*cells\+0\.08\*fine;/,
    'Fine noise should remain a small accent within coherent cloud cells');
assert.match(modeDefs,
    /let coreCells = coreEnvelope\*\(0\.38\+0\.62\*cellCoverage\);/,
    'The CDO should be populated by cells instead of a filled radial disk');

const cloudFunctionStart = modeDefs.indexOf('function simulatedCloudTemperature');
const cloudFunctionEnd = modeDefs.indexOf('function simulatedIrBdTemperature');
assert.ok(cloudFunctionStart>=0 && cloudFunctionEnd>cloudFunctionStart,
    'The shared cloud-temperature implementation should be present');
const cloudFunction = modeDefs.slice(cloudFunctionStart,cloudFunctionEnd);
assert.doesNotMatch(cloudFunction,/mapType|subBasin|mainSubBasin/,
    'Cloud texture must not branch by ocean basin');
assert.match(modeDefs,
    /for\(let mode of \[SIM_MODE_NORMAL,SIM_MODE_HYPER,SIM_MODE_WILD,\s*SIM_MODE_MEGABLOBS,SIM_MODE_EXPERIMENTAL,SIM_MODE_SPOOKY\]\)\{\s*ENV_DEFS\[mode\]\.clouds = \{\};/,
    'Every simulation mode should inherit the same cloud imagery definition');

console.log('All basins share a coherent low-speckle cloud style; Polar remains 512px.');
