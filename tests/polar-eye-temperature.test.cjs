const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const simSource = fs.readFileSync('sim-mode-defs.js','utf8');
const simStart = simSource.indexOf('function radarClamp');
const simEnd = simSource.indexOf('function simulatedIrBdTemperature');
assert.ok(simStart >= 0 && simEnd > simStart,
    'infrared temperature model is present');

const modelContext = {
    Math,
    Number,
    TAU: Math.PI*2,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    map:(v,a,b,c,d,within)=>{
        let t = (v-a)/(b-a);
        if(within) t = Math.max(0,Math.min(1,t));
        return c+(d-c)*t;
    },
    floor:Math.floor,
    round:Math.round,
    ENV_DEFS:{defaults:{}},
    ENABLE_SIMULATED_BASE_SCAN_LAYER:false,
    SIMULATED_BASE_SCAN_BT_MIN:140,
    SIMULATED_BASE_SCAN_BT_MAX:300,
    StormData:{eyeTypeProfile:()=>({visualScale:1})}
};
vm.runInNewContext(
    simSource.slice(simStart,simEnd)+
        '\nglobalThis.getCloudTemperature = simulatedCloudTemperature;'+
        '\nglobalThis.getDvorakScene = simulatedDvorakScene;'+
        '\nglobalThis.getEyeTarget = simulatedEyeTemperatureTarget;',
    modelContext
);

const uiSource = fs.readFileSync('ui.js','utf8');
const uiStart = uiSource.indexOf('function stormPolarSatelliteEyeCenter');
const uiEnd = uiSource.indexOf('function stormPolarSatelliteDenoiseProfile');
assert.ok(uiStart >= 0 && uiEnd > uiStart,
    'Polar eye helpers are present');
vm.runInNewContext(
    uiSource.slice(uiStart,uiEnd)+
        '\nglobalThis.getEyeCenter = stormPolarSatelliteEyeCenter;'+
        '\nglobalThis.getEyeClearance = stormPolarSatelliteEyeClearance;',
    modelContext
);

const system = {
    x:0,
    y:0,
    rmwX:18,
    rmwY:18,
    outerRadius:4,
    shearOffset:4,
    shearAngle:0,
    phase:1.4,
    shearFactor:0.2,
    hemisphere:1,
    tropicalFactor:1,
    frontalFactor:0,
    frontAngle:0,
    strength:0.9,
    intensity:1,
    eyeFactor:0.85,
    eyeFillFactor:0,
    eyewallInnerWeight:1,
    eyewallOuterWeight:0,
    eyewallOuterRadius:1.55,
    eyewallFactor:0.9,
    bandPower:1.7,
    bands:[]
};
const utility = {
    sampleX:0,
    sampleY:0,
    sampleZ:0,
    field(name){ return name==='moisture' ? 0.8 : 28; },
    simulatedSystems:[system],
    simulatedSystemsTick:0
};

const eyeCenter = modelContext.getEyeCenter(system);
assert.equal(eyeCenter.x,7.2,
    'the Polar eye follows the same 1.8x shear displacement as the cloud field');
assert.equal(eyeCenter.y,0);

const stormCenterTemperature = modelContext.getCloudTemperature(
    utility,system.x,system.y,0
);
const detectedEyeTemperature = modelContext.getCloudTemperature(
    utility,eyeCenter.x,eyeCenter.y,0
);
assert.ok(stormCenterTemperature < -40,
    'the old storm-center sample can land on a cold cloud wall');
assert.ok(detectedEyeTemperature > 0,
    'the displaced Polar eye sample must be warm');
assert.ok(detectedEyeTemperature > stormCenterTemperature+40,
    'eye detection must not report the cold cloud wall as the eye');

// The absolute eye target follows the local clear-sky SST window and is not
// limited to the old +20 C Dvorak-scene constant. A continuous eye-readiness
// factor approaches the observed 28 C satellite-eye calibration ceiling; it
// does not contain a special 180 kt branch.
const dryUtility = {
    ...utility,
    field(name){ return name==='moisture' ? 0.3 : 24.8; }
};
const dryEyeTemperature = modelContext.getCloudTemperature(
    dryUtility,eyeCenter.x,eyeCenter.y,0
);
const eyeTarget = modelContext.getEyeTarget(system,23.8);
assert.ok(dryEyeTemperature<=eyeTarget+1e-9,
    'resolved eye temperature must not exceed its modeled target');

const warmEyeTarget = modelContext.getEyeTarget(system,28);
assert.ok(warmEyeTarget>20,
    'mature warm-water eyes must be able to exceed +20 C');
assert.ok(warmEyeTarget<=28+1e-9,
    'satellite eye brightness temperature should honor the observed 28 C ceiling');
assert.ok(warmEyeTarget-eyeTarget>2,
    'eye temperature should follow local SST instead of a fixed absolute cap');
const veryWarmEyeTarget = modelContext.getEyeTarget(system,34);
assert.ok(veryWarmEyeTarget<=28+1e-9,
    'warmer synthetic SST must not push the eye above the observed ceiling');
assert.ok(veryWarmEyeTarget>=warmEyeTarget-1e-9,
    'eye target should remain monotonic as local SST increases');

// The Polar HD clearance pass must obey the same ceiling. Otherwise a
// partially visible eye can be warmed toward the clear-sky value again after
// the cloud field has already applied the target cap.
const partialSystem = {...system,eyeFactor:0.8,eyewallFactor:0.8};
const partialCenter = modelContext.getEyeCenter(partialSystem);
const partialUtility = {
    ...dryUtility,
    simulatedSystems:[partialSystem]
};
const partialRawTemperature = modelContext.getCloudTemperature(
    partialUtility,partialCenter.x,partialCenter.y,0
);
const partialHdTemperature = modelContext.getEyeClearance(
    partialUtility,partialCenter.x,partialCenter.y,0,partialRawTemperature
);
const partialEyeTarget = modelContext.getEyeTarget(partialSystem,23.8);
assert.ok(partialHdTemperature<=partialEyeTarget+1e-9,
    'Polar HD eye clearance must not exceed the modeled eye target');

assert.match(uiSource,
    /let eyeCenter = descriptor \?\s*\n\s*stormPolarSatelliteEyeCenter\(descriptor\)/,
    'ordinary IR-BD should sample the displaced eye center too');

console.log('Polar eye-temperature sampling follows the sheared warm eye.');
