const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js','utf8');
const start = ui.indexOf('function sampleStormPolarSatelliteRow');
const end = ui.indexOf('function colorStormPolarSatelliteRow');
assert.ok(start>=0 && end>start,
    'Polar imagery row sampler is present');

let sampled;
const context = {
    WIDTH:960,
    HEIGHT:540,
    constrain:(value,minimum,maximum)=>
        Math.max(minimum,Math.min(maximum,value)),
    stormPolarSatelliteEyeClearance:(_utility,_x,_y,_z,value)=>value
};
vm.runInNewContext(
    ui.slice(start,end)+
        '\nglobalThis.sampleRow = sampleStormPolarSatelliteRow;',
    context
);

const southernBasin = {
    SHem:true,
    hemY:y=>context.HEIGHT-y
};
const utility = {};
const centerY = southernBasin.hemY(120);
const job = {
    width:1,
    height:1,
    centerX:300,
    centerY,
    extent:40,
    tick:12,
    basin:southernBasin,
    utility,
    product:{
        isSar:false,
        isBaseScan:false,
        valueFunc:(_utility,x,y,z)=>{
            sampled = {x,y,z};
            return -65;
        }
    },
    values:new Float32Array(1)
};

context.sampleRow(job,0);
assert.equal(sampled.y,centerY,
    'Southern Hemisphere products must sample the normalized storm center');
assert.notEqual(sampled.y,southernBasin.hemY(centerY),
    'Southern Hemisphere products must not flip the normalized Y coordinate twice');
assert.equal(job.values[0],-65);

// The ordinary-resolution raster follows the same coordinate contract.
const regularStart = ui.indexOf('for(let row=0;row<raster.height;row++){');
const regularEnd = ui.indexOf('raster.updatePixels();',regularStart);
assert.ok(regularStart>=0 && regularEnd>regularStart,
    'Ordinary imagery raster sampler is present');
const regularSampler = ui.slice(regularStart,regularEnd);
assert.match(regularSampler,/let sampleY = screenY;/,
    'Ordinary imagery must use the normalized panel Y coordinate');
assert.doesNotMatch(regularSampler,/hemY\(screenY\)/,
    'Ordinary imagery must not repeat the hemisphere transform');

console.log('Southern Hemisphere storm imagery samples the cyclone instead of an empty mirrored area.');
