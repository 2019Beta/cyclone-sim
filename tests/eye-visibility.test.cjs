const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const end = source.indexOf('function simulatedIrBdTemperature');
assert.ok(start >= 0 && end > start,
    'shared BD/cloud imagery model is present');

const context = {
    Math,
    Number,
    TAU: Math.PI*2,
    SIMULATED_BASE_SCAN_BACKGROUND_BASE: 0.07,
    SIMULATED_BASE_SCAN_BACKGROUND_VARIATION: 0.11,
    SIMULATED_BASE_SCAN_CELL_SCALE: 1.2,
    SIMULATED_BASE_SCAN_CELL_WEIGHT: 0.10,
    SIMULATED_BASE_SCAN_DENOISE_LOW: 0.075,
    SIMULATED_BASE_SCAN_DENOISE_HIGH: 0.86,
    SIMULATED_BASE_SCAN_BT_MIN: 140,
    SIMULATED_BASE_SCAN_BT_MAX: 300,
    ENV_DEFS: {defaults: {}},
    ENABLE_SIMULATED_BASE_SCAN_LAYER: false,
    ENABLE_SIMULATED_CLOUD_LAYER: false,
    constrain: (v,a,b)=>Math.max(a,Math.min(b,v)),
    floor: Math.floor,
    lerp: (a,b,t)=>a+(b-a)*t
};
vm.runInNewContext(
    source.slice(start,end)+
        '\nglobalThis.getCloud = simulatedCloudTemperature;'+
        '\nglobalThis.getBaseScan = simulatedBaseScanBrightnessTemperature;'+
        '\nglobalThis.getEyeScale = simulatedCloudEyeScale;'+
        '\nglobalThis.getRadii = simulatedEyewallRadii;',
    context
);

const system = {
    x: 0,
    y: 0,
    rmwX: 2.5,
    rmwY: 2.5,
    radiusOfMaxWind: 30,
    outerRadius: 4,
    shearOffset: 0,
    shearAngle: 0,
    phase: 1.4,
    shearFactor: 0.08,
    hemisphere: 1,
    tropicalFactor: 1,
    frontalFactor: 0,
    frontAngle: 0,
    strength: 0.9,
    baseScanStrength: 0.9,
    intensity: 0.9,
    windSpeed: 145,
    eyeType: 2,
    eyeDiameter: 30,
    imageryEyeScale: 1.6,
    eyeFactor: 0.9,
    eyeFillFactor: 0,
    eyewallInnerWeight: 0.85,
    eyewallOuterWeight: 1,
    eyewallOuterRadius: 2,
    eyewallFactor: 1,
    eyewallCycle: 0.45,
    eyewallFailure: 0,
    eyewallReplacementMemory: 0.3,
    cloudEyeExpansion: 0.3,
    bandPower: 1.7,
    landSuppression: 0,
    landAbrasionProfile: new Array(32).fill(0),
    landAbrasionSectorCount: 32,
    bands: [],
    convectiveActivity: 0.9,
    rainbandActivity: 0.9
};
const utility = {
    field(name) { return name === 'moisture' ? 0.82 : 28; },
    simulatedSystems: [system],
    simulatedSystemsTick: 0
};

function average(fn,radius,descriptor=system){
    let total = 0;
    for(let i=0;i<128;i++){
        let angle = i/128*Math.PI*2;
        total += fn(
            utility,
            Math.cos(angle)*radius*descriptor.rmwX,
            Math.sin(angle)*radius*descriptor.rmwY,
            0
        );
    }
    return total/128;
}

const physicalScale = context.getEyeScale({...system,
    imageryEyeScale: undefined
});
const imageryScale = context.getEyeScale(system);
assert.ok(imageryScale > physicalScale*1.5,
    'compact imagery should enlarge a sub-pixel physical eye');

const eyeTemperature = average(context.getCloud,0);
const innerCloud = average(context.getCloud,1.0);
const moatCloud = average(context.getCloud,1.35);
const outerCloud = average(context.getCloud,1.75);
assert.ok(eyeTemperature > innerCloud+35,
    'the cloud product must keep a warm, readable eye center');
assert.ok(innerCloud < moatCloud-2 && outerCloud < moatCloud-2,
    'the cloud product must retain two cold walls around a warmer moat');

const eyeBrightnessTemperature = average(context.getBaseScan,0);
const innerBaseScan = average(context.getBaseScan,1.0);
const moatBaseScan = average(context.getBaseScan,1.35);
const outerBaseScan = average(context.getBaseScan,1.75);
assert.ok(eyeBrightnessTemperature > innerBaseScan+70,
    'BD/base-scan must preserve a low-return eye center');
assert.ok(innerBaseScan < moatBaseScan-8 && outerBaseScan < moatBaseScan-8,
    'BD/base-scan must retain two separated wall returns');

const pinholeRadii = context.getRadii({...system,
    eyeType: 0,
    eyeDiameter: 6,
    imageryEyeScale: undefined
},0.6,false,0);
assert.ok(pinholeRadii.outer-pinholeRadii.inner>0.25,
    'compact eye types must retain a visible moat between two walls');

console.log('Compact cyclone eyes and double eyewalls remain visible in BD/cloud imagery.');
