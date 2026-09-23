const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const end = source.indexOf('function simulatedIrBdTemperature');
assert.ok(start>=0 && end>start,'replacement imagery helpers are present');

const context = {
    Math,
    Number,
    TAU:Math.PI*2,
    SIMULATED_BASE_SCAN_BACKGROUND_BASE:0.07,
    SIMULATED_BASE_SCAN_BACKGROUND_VARIATION:0.11,
    SIMULATED_BASE_SCAN_CELL_SCALE:1.2,
    SIMULATED_BASE_SCAN_CELL_WEIGHT:0.10,
    SIMULATED_BASE_SCAN_DENOISE_LOW:0.075,
    SIMULATED_BASE_SCAN_DENOISE_HIGH:0.86,
    SIMULATED_BASE_SCAN_BT_MIN:140,
    SIMULATED_BASE_SCAN_BT_MAX:300,
    ENV_DEFS:{defaults:{}},
    ENABLE_SIMULATED_BASE_SCAN_LAYER:false,
    ENABLE_SIMULATED_CLOUD_LAYER:false,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    max:Math.max,
    min:Math.min,
    map:(v,a,b,c,d)=>c+(d-c)*Math.max(0,Math.min(1,(v-a)/(b-a))),
    random:(a,b)=>b===undefined ? 0.5 : (a+b)/2,
    TROP:1,
    EYEWALL_REPLACEMENT_MIN_COOLDOWN:48,
    EYEWALL_REPLACEMENT_MAX_COOLDOWN:96,
    floor:Math.floor,
    lerp:(a,b,t)=>a+(b-a)*t,
    StormData:{eyeTypeProfile(){ return {visualScale:1}; }}
};
vm.runInNewContext(
    source.slice(start,end)+
        '\nglobalThis.getVisualFactor = simulatedEyewallReplacementVisualFactor;'+
        '\nglobalThis.getReflectivity = simulatedRadarReflectivity;',
    context
);

const base = {
    x:0,
    y:0,
    rmwX:24,
    rmwY:24,
    radiusOfMaxWind:30,
    outerRadius:4,
    shearOffset:0,
    shearAngle:0,
    phase:1.4,
    shearFactor:0.08,
    hemisphere:1,
    tropicalFactor:1,
    frontalFactor:0,
    frontAngle:0,
    strength:0.9,
    baseScanStrength:0.9,
    intensity:0.9,
    eyeFactor:0.9,
    eyeFillFactor:0,
    eyewallFactor:1,
    bandPower:1.7,
    landSuppression:0,
    landAbrasionProfile:new Array(32).fill(0),
    landAbrasionSectorCount:32,
    bands:[],
    eyeType:2,
    eyeDiameter:30,
    eyeRadiusFactor:1,
    convectiveActivity:0.9,
    rainbandActivity:0.9,
    eyewallFailure:0
};

const nearCompletion = {...base,
    eyewallCycle:0.99,
    eyewallInnerWeight:0.002,
    eyewallOuterWeight:0.998,
    eyewallOuterRadius:1.22,
    cloudEyeExpansion:0.46,
    eyewallReplacementMemory:0.24
};
const completedWithoutHandoff = {...base,
    eyewallCycle:0,
    eyewallInnerWeight:0,
    eyewallOuterWeight:1,
    eyewallOuterRadius:1.216,
    cloudEyeExpansion:0.46,
    eyewallReplacementMemory:0.24
};
const completed = {...completedWithoutHandoff,
    eyewallReplacementHandoff:1
};
const settling = {...completed,
    eyewallReplacementHandoff:0.25
};

assert.equal(context.getVisualFactor(nearCompletion),1,
    'an active replacement must keep its full visual factor');
assert.equal(context.getVisualFactor(completed),1,
    'completion must seed a full visual handoff');
assert.equal(context.getVisualFactor(settling),0.25,
    'the visual handoff must preserve its gradual decay');
assert.equal(context.getVisualFactor(completedWithoutHandoff),0,
    'descriptors without live handoff state must remain backward compatible');

vm.runInNewContext(
    source.slice(source.indexOf('function eyewallReplacementWeights'),
        source.indexOf('function circulationIntensificationRate')),
    context
);
const completedState = {
    eyewallCycle:0.98,
    eyewallCycleDuration:48,
    eyewallCycleCooldown:100,
    eyewallFailure:0,
    eyewallFailureMode:0,
    eyewallFailureChecked:true,
    type:1,
    windSpeed:120,
    organization:0.9
};
context.updateEyewallReplacementCycle(completedState,0,0);
assert.equal(completedState.eyewallCycle,0,
    'the physical replacement cycle should still complete normally');
assert.equal(completedState.eyewallReplacementHandoff,1,
    'physical completion must seed the visual handoff');

const utility = {
    simulatedSystems:[nearCompletion],
    simulatedSystemsTick:0,
    field(name){ return name==='moisture' ? 0.82 : 28; }
};
function averageEcho(system,radius){
    utility.simulatedSystems = [system];
    let total = 0;
    for(let i=0;i<72;i++){
        const angle = i/72*Math.PI*2;
        total += context.getReflectivity(
            utility,Math.cos(angle)*radius*base.rmwX,
            Math.sin(angle)*radius*base.rmwY,0,true
        );
    }
    return total/72;
}

let handoffDelta = 0;
let settledDelta = 0;
let abruptDelta = 0;
for(const radius of [0.70,0.90,1.00,1.20,1.30,1.50,1.80]){
    const before = averageEcho(nearCompletion,radius);
    const after = averageEcho(completed,radius);
    const settledAfter = averageEcho(settling,radius);
    const abruptAfter = averageEcho(completedWithoutHandoff,radius);
    handoffDelta = Math.max(handoffDelta,Math.abs(before-after));
    settledDelta = Math.max(settledDelta,Math.abs(after-settledAfter));
    abruptDelta = Math.max(abruptDelta,Math.abs(before-abruptAfter));
}

assert.ok(handoffDelta<0.08,
    'the seeded handoff must remove the visible completion discontinuity');
assert.ok(settledDelta<abruptDelta,
    'the decaying handoff must make settling gradual instead of immediate');

console.log('Eyewall completion keeps a strength-aware, gradual base-scan handoff.');
