const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const imageryStart = source.indexOf('function radarClamp');
const imageryEnd = source.indexOf('function simulatedIrBdTemperature');
assert.ok(imageryStart>=0 && imageryEnd>imageryStart,
    'convection imagery helpers are present');

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
    lerp:(a,b,t)=>a+(b-a)*t
};
vm.runInNewContext(
    source.slice(imageryStart,imageryEnd)+
        '\nglobalThis.getConvectiveActivity = simulatedConvectiveActivity;'+
        '\nglobalThis.getConvectionStrength = simulatedConvectionStrength;'+
        '\nglobalThis.getEyeOpening = simulatedEyeOpeningFactor;'+
        '\nglobalThis.getReflectivity = simulatedRadarReflectivity;'+
        '\nglobalThis.getCloudTemperature = simulatedCloudTemperature;',
    context
);

const baseSystem = {
    x:0,
    y:0,
    rmwX:18,
    rmwY:18,
    outerRadius:4,
    shearOffset:0,
    shearAngle:0,
    phase:1.4,
    shearFactor:0.12,
    hemisphere:1,
    tropicalFactor:0.95,
    frontalFactor:0.05,
    frontAngle:0,
    strength:0.24,
    baseScanStrength:0.24,
    intensity:0.18,
    eyeFactor:0,
    eyeFillFactor:0,
    eyewallInnerWeight:1,
    eyewallOuterWeight:0,
    eyewallOuterRadius:1.55,
    eyewallFactor:0.18,
    bandPower:1.7,
    landSuppression:0,
    landAbrasionProfile:new Array(32).fill(0),
    landAbrasionSectorCount:32,
    bands:[{
        phase:0.2,
        strength:0.9,
        width:0.18,
        start:0.82,
        reach:3,
        curvature:0.75
    }]
};

const utility = systems=>({
    field(name){ return name==='moisture' ? 0.78 : 28; },
    simulatedSystems:systems,
    simulatedSystemsTick:0
});

const quiet = {...baseSystem,convectiveActivity:0.18};
const active = {...baseSystem,convectiveActivity:0.88};
assert.ok(context.getConvectiveActivity(active)>
    context.getConvectiveActivity(quiet)+0.5,
    'convection activity must be able to vary independently of weak intensity');
assert.equal(context.getEyeOpening({...baseSystem,eyewallCycle:0}),0,
    'a closed eyewall has no opening penalty');
assert.ok(context.getEyeOpening({...baseSystem,eyewallCycle:0.5})>0.9,
    'the middle of an eyewall replacement is the opening maximum');
const closedConvectionStrength = context.getConvectionStrength(
    {...active,eyewallCycle:0}
);
const openingConvectionStrength = context.getConvectionStrength(
    {...active,eyewallCycle:0.5}
);
assert.ok(openingConvectionStrength<closedConvectionStrength*0.90,
    'eye opening must remain visible in the convective signal');
assert.ok(openingConvectionStrength>closedConvectionStrength*0.70,
    'eye opening must not erase the deep-convective ring');

const sampleRadius = 1.0;
const sampleX = Math.cos(0.6)*sampleRadius*baseSystem.rmwX;
const sampleY = Math.sin(0.6)*sampleRadius*baseSystem.rmwY;
const quietEcho = context.getReflectivity(
    utility([quiet]),sampleX,sampleY,0,true
);
const activeEcho = context.getReflectivity(
    utility([active]),sampleX,sampleY,0,true
);
const openingEcho = context.getReflectivity(
    utility([{...active,eyewallCycle:0.5}]),sampleX,sampleY,0,true
);
assert.ok(activeEcho>quietEcho,
    'vigorous convection must brighten the weak storm precipitation signal');
assert.ok(openingEcho<activeEcho,
    'the opening phase must weaken the precipitation signal');

const closedTemperature = context.getCloudTemperature(
    utility([{...active,eyewallCycle:0}]),sampleX,sampleY,0
);
const openingTemperature = context.getCloudTemperature(
    utility([{...active,eyewallCycle:0.5}]),sampleX,sampleY,0
);
assert.ok(openingTemperature>closedTemperature,
    'eye opening must warm the corresponding cloud tops');

const coreStart = source.indexOf('function coreCirculationIntensityProxy');
const coreEnd = source.indexOf('function updateWindFieldStructure');
assert.ok(coreStart>=0 && coreEnd>coreStart,
    'dynamic convection update is present');
const coreContext = {
    Math,
    Number,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    lerp:(a,b,t)=>a+(b-a)*t
};
vm.runInNewContext(
    source.slice(coreStart,coreEnd)+
        '\nglobalThis.getIntensityProxy = coreCirculationIntensityProxy;'+
        '\nglobalThis.update = updateConvectiveActivity;',
    coreContext
);

const ordinaryC5Intensity = coreContext.getIntensityProxy({
    windSpeed:145,
    pressure:925
});
const extendedC6Intensity = coreContext.getIntensityProxy({
    windSpeed:170,
    pressure:890
});
const hyperIntensity = coreContext.getIntensityProxy({
    windSpeed:400,
    pressure:730
});
assert.ok(extendedC6Intensity>ordinaryC5Intensity,
    'the lower-level intensity proxy must continue above ordinary C5');
assert.ok(hyperIntensity>extendedC6Intensity,
    'the lower-level intensity proxy must preserve ordering for hyper-intense storms');

const closed = {
    windSpeed:25,
    pressure:1005,
    organization:0.5,
    convectiveActivity:0.45,
    eyewallCycle:0,
    eyewallFailure:0
};
const opening = {...closed,eyewallCycle:0.5};
for(let hour=0;hour<18;hour++){
    coreContext.update(closed,0.78,28,1,0,0.9);
    coreContext.update(opening,0.78,28,1,0,0.9);
}
assert.ok(closed.convectiveActivity>0.5,
    'a weak circulation in a moist, warm environment should sustain convection');
assert.ok(opening.convectiveActivity<closed.convectiveActivity,
    'opening-related suppression should persist in the evolving state');

console.log('Independent convection activity and eye-opening suppression verified.');
