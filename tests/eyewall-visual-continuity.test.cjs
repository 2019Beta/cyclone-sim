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
    floor:Math.floor,
    lerp:(a,b,t)=>a+(b-a)*t,
    StormData:{
        eyeTypeProfile(){ return {visualScale:1}; }
    }
};
vm.runInNewContext(
    source.slice(start,end)+
        '\nglobalThis.getCoverage = simulatedReplacementEyeCoverage;'+
        '\nglobalThis.getExpansion = simulatedReplacementEyeExpansion;'+
        '\nglobalThis.getReplacementRadius = simulatedReplacementRadius;'+
        '\nglobalThis.getOuterWallWidth = simulatedReplacementOuterWallWidth;'+
        '\nglobalThis.getScale = simulatedCloudEyeScale;'+
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

const middle = {...base,
    eyewallCycle:0.58,
    eyewallInnerWeight:0.40,
    eyewallOuterWeight:1,
    eyewallOuterRadius:1.82,
    cloudEyeExpansion:0.40
};
const nearCompletion = {...base,
    eyewallCycle:0.99,
    eyewallInnerWeight:0.002,
    eyewallOuterWeight:0.998,
    eyewallOuterRadius:1.22,
    cloudEyeExpansion:0.46,
    eyewallReplacementMemory:0.24
};
const completed = {...base,
    eyewallCycle:0,
    eyewallInnerWeight:0,
    eyewallOuterWeight:1,
    eyewallOuterRadius:1.216,
    cloudEyeExpansion:0.46,
    eyewallReplacementMemory:0.24
};

assert.ok(Math.abs(context.getReplacementRadius(nearCompletion)-
    context.getReplacementRadius(completed))<0.03,
    'the contracting outer wall must hand off continuously at completion');
assert.equal(context.getExpansion(nearCompletion),context.getExpansion(completed),
    'post-replacement eye memory must survive the cycle reset');
assert.ok(Math.abs(context.getScale(nearCompletion)/context.getScale(completed)-1)<1e-12,
    'cloud eye scale must not snap when the cycle flag resets');
assert.ok(context.getExpansion(middle)<0.47,
    'active replacement must keep clear-eye expansion below the bounded target');
assert.ok(context.getExpansion(completed)>=0.24 &&
    context.getExpansion(completed)<0.50,
    'a completed replacement must retain a moderate residual eye expansion');
assert.ok(context.getReplacementRadius(completed)>1.10,
    'the successful replacement must retain a post-cycle wall outside the old RMW');
assert.ok(context.getOuterWallWidth(middle,0.34,1,1.82)>0.34,
    'the forming outer eyewall must develop a substantial radial width');

for(const radius of [0,0.35,0.55,0.75,0.95,1.15,1.45]){
    const before = context.getCoverage(nearCompletion,radius,
        (0.58-0.06*nearCompletion.intensity),
        (0.61-0.05*nearCompletion.intensity)*nearCompletion.eyewallOuterRadius);
    const after = context.getCoverage(completed,radius,
        (0.58-0.06*completed.intensity),
        (0.61-0.05*completed.intensity)*completed.eyewallOuterRadius);
    assert.ok(Math.abs(before-after)<0.12,
        'clear-eye coverage must not jump at the replacement boundary');
}

const utility = {
    simulatedSystems:[middle],
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

const moat = averageEcho(middle,1.40);
const outerWall = averageEcho(middle,1.82);
assert.ok(outerWall>moat+0.12,
    'the forming outer eyewall must remain visibly stronger than its moat');
assert.ok(completed.eyewallInnerWeight<0.01 &&
    completed.eyewallOuterWeight>0.99,
    'a completed replacement must render one dominant new outer eyewall');
assert.ok(averageEcho(completed,completed.eyewallOuterRadius)>0.75,
    'the completed replacement must retain a strong primary wall at its new radius');

console.log('Eyewall replacement eye size is bounded, continuous, and settles on the new outer wall.');
