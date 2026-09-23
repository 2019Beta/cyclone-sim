const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const end = source.indexOf('function simulatedIrBdTemperature');
assert.ok(start >= 0 && end > start,'shared imagery geometry is present');

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
        eyeTypeProfile(type){
            return {visualScale:[0.45,0.70,1,1.45,1.8][
                Math.max(0,Math.min(4,Math.round(type)))
            ]};
        }
    }
};
vm.runInNewContext(
    source.slice(start,end)+
        '\nglobalThis.getRadii = simulatedEyewallRadii;'+
        '\nglobalThis.getReflectivity = simulatedRadarReflectivity;'+
        '\nglobalThis.getCloudTemperature = simulatedCloudTemperature;',
    context
);

const system = {
    x:0,
    y:0,
    rmwX:24,
    rmwY:24,
    radiusOfMaxWind:30,
    outerRadius:4,
    shearOffset:0,
    shearAngle:0,
    phase:1.4,
    shearFactor:0,
    hemisphere:1,
    tropicalFactor:1,
    frontalFactor:0,
    frontAngle:0,
    strength:0.9,
    baseScanStrength:0.9,
    intensity:0.9,
    eyeFactor:0.9,
    eyeFillFactor:0,
    eyewallInnerWeight:0,
    eyewallOuterWeight:1,
    eyewallOuterRadius:1.75,
    eyewallFactor:1,
    eyewallCycle:0,
    eyewallFailure:0,
    bandPower:1.7,
    landSuppression:0,
    landAbrasionProfile:new Array(32).fill(0),
    landAbrasionSectorCount:32,
    bands:[],
    eyeType:0,
    eyeDiameter:6,
    convectiveActivity:0.9
};
const utility = {
    field(name){ return name==='moisture' ? 0.8 : 28; },
    simulatedSystems:[system],
    simulatedSystemsTick:0
};

const angle = 0.6;
const baseRadii = context.getRadii(system,angle,true,0);
const cloudRadii = context.getRadii(system,angle,false,0);
assert.ok(Math.abs(baseRadii.outer-cloudRadii.outer)<1e-12,
    'cloud and base products must share the outer eyewall radius');
assert.ok(baseRadii.outer<system.eyewallOuterRadius*0.5,
    'a compact eye type must contract the replacement eyewall in imagery');

const outerX = Math.cos(angle)*baseRadii.outer*system.rmwX;
const outerY = Math.sin(angle)*baseRadii.outer*system.rmwY;
const legacyX = Math.cos(angle)*system.eyewallOuterRadius*1.02*system.rmwX;
const legacyY = Math.sin(angle)*system.eyewallOuterRadius*1.02*system.rmwY;
assert.ok(context.getReflectivity(utility,outerX,outerY,0,true)>
    context.getReflectivity(utility,legacyX,legacyY,0,true)+0.20,
    'base scan outer-wall return should remain at the shared compact radius');
assert.ok(context.getCloudTemperature(utility,outerX,outerY,0)<
    context.getCloudTemperature(utility,legacyX,legacyY,0)-5,
    'cloud and IR-BD outer-wall cooling should not use the oversized legacy radius');

const compressed = {...system,eyeFillFactor:0.8};
assert.ok(context.getRadii(compressed,angle,true,0).outer<baseRadii.outer,
    'land/core compression must shrink the outer eyewall consistently');

console.log('Base, cloud, and IR-BD replacement-eyewall geometry stays aligned.');

// Compare azimuthal means: texture may break individual sectors, but both
// convective rings must remain stronger/colder than the intervening moat.
const active = {...system,eyeType:2,eyeRadiusFactor:1,eyewallCycle:0.45,
    eyewallInnerWeight:0.85,eyewallOuterWeight:1,eyewallOuterRadius:2};
const activeUtility = {...utility,simulatedSystems:[active]};
const profile = [1,1.5,2].map(radius=>{
    let echo=0,temperature=0;
    for(let i=0;i<64;i++){
        const angle=i/64*Math.PI*2;
        const x=Math.cos(angle)*radius*24,y=Math.sin(angle)*radius*24;
        echo+=context.getReflectivity(activeUtility,x,y,0,true)/64;
        temperature+=context.getCloudTemperature(activeUtility,x,y,0)/64;
    }
    return {echo,temperature};
});
for(const ring of [profile[0],profile[2]]){
    assert.ok(ring.echo>profile[1].echo+0.12,'base scan resolves both walls');
    assert.ok(ring.temperature<profile[1].temperature-5,
        'cloud/IR temperature resolves a warmer moat between cold walls');
}
console.log('Azimuthal base and infrared profiles resolve two walls and a moat.');
