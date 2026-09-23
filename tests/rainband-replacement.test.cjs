const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const coreStart = source.indexOf('function coreCirculationIntensityProxy');
const coreEnd = source.indexOf('function updateWindFieldStructure');
assert.ok(coreStart >= 0 && coreEnd > coreStart,
    'rainband state helpers are present in the core algorithm');

const core = {
    Math,
    Number,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    lerp:(a,b,t)=>a+(b-a)*t
};
vm.runInNewContext(
    source.slice(coreStart,coreEnd)+
        '\nglobalThis.rainbandTarget = rainbandEnvironmentTarget;'+
        '\nglobalThis.updateRainbands = updateRainbandActivity;',
    core
);

const base = {
    windSpeed:35,
    pressure:1005,
    organization:0.42
};
const dryTarget = core.rainbandTarget(base,0.28,26,2,0,0.9);
const wetTarget = core.rainbandTarget(base,0.82,26,2,0,0.9);
assert.ok(wetTarget>dryTarget+0.25,
    'humid air should make rainband formation materially easier');

const dry = {...base,convectiveActivity:0.24};
const wet = {...base,convectiveActivity:0.82};
for(let hour=0;hour<12;hour++){
    core.updateRainbands(dry,0.28,26,2,0,0.9);
    core.updateRainbands(wet,0.82,26,2,0,0.9);
}
assert.ok(wet.rainbandActivity>dry.rainbandActivity+0.25,
    'the live rainband state should respond to humidity without imagery');
assert.ok(wet.rainbandFormation>dry.rainbandFormation+0.25,
    'humid convection should produce a stronger rainband-formation pulse');

const cycleStart = source.indexOf('function radarClamp');
const cycleEnd = source.indexOf('function circulationIntensificationRate');
const cycle = {
    Math,
    Number,
    TROP:1,
    max:Math.max,
    min:Math.min,
    map:(v,a,b,c,d,clamp)=>{
        let t=(v-a)/(b-a);
        if(clamp) t=Math.max(0,Math.min(1,t));
        return c+t*(d-c);
    },
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    random:()=>0.0015,
    EYEWALL_REPLACEMENT_MIN_COOLDOWN:48,
    EYEWALL_REPLACEMENT_MAX_COOLDOWN:96,
    EYEWALL_REPLACEMENT_MIN_DURATION:36,
    EYEWALL_REPLACEMENT_MAX_DURATION:60,
    EYEWALL_REPLACEMENT_MIN_WIND:105,
    EYEWALL_REPLACEMENT_MIN_ORGANIZATION:0.68,
    EYEWALL_REPLACEMENT_MIN_WARM_CORE:0.7,
    EYEWALL_REPLACEMENT_TRIGGER_RATE:0.0035,
    RAINBAND_REPLACEMENT_THRESHOLD:0.56,
    RAINBAND_REPLACEMENT_TRIGGER_RATE:0.010
};
vm.runInNewContext(
    source.slice(cycleStart,source.indexOf('// Every simulated imagery'))+
        source.slice(source.indexOf('function eyewallReplacementWeights'),cycleEnd),
    cycle
);

const mature = {
    eyewallCycle:0,
    eyewallCycleCooldown:0,
    eyewallFailure:0,
    type:1,
    windSpeed:120,
    organization:0.8,
    lowerWarmCore:0.85,
    upperWarmCore:0.85
};
const dryStorm = {...mature,rainbandActivity:0.2,rainbandFormation:0.1};
const wetStorm = {...mature,rainbandActivity:0.9,rainbandFormation:0.9};
cycle.updateEyewallReplacementCycle(dryStorm,0,2);
cycle.updateEyewallReplacementCycle(wetStorm,0,2);
assert.equal(dryStorm.eyewallCycle,0,
    'weak rainband activity should not seed a replacement in this draw');
assert.ok(wetStorm.eyewallCycle>0,
    'rainband formation should seed the double-eyewall cycle without selection');

console.log('Moisture-driven rainband activity and unselected replacement judgment verified.');
