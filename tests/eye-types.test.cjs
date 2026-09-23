const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const constants = fs.readFileSync('constants.js','utf8');
const source = fs.readFileSync('sim-mode-defs.js','utf8');
const storm = fs.readFileSync('storm.js','utf8');

assert.match(constants,/EYE_TYPE_PINHOLE/);
assert.match(constants,/diameterMin: 3/);
assert.match(constants,/diameterMax: 120/);
assert.match(storm,/eyeType/);
assert.match(storm,/eyeDiameter/);

const profiles = [
    {intensificationRate:1.38,pressurePotential:1.10,windPotential:1.08},
    {intensificationRate:1.22,pressurePotential:1.06,windPotential:1.04},
    {intensificationRate:1,pressurePotential:1,windPotential:1},
    {intensificationRate:0.92,pressurePotential:0.98,windPotential:0.98},
    {intensificationRate:0.86,pressurePotential:0.96,windPotential:0.96}
];

const context = {
    Math,
    Number,
    TROP:2,
    SUBTROP:1,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    max:Math.max,
    min:Math.min,
    round:Math.round,
    StormData:{
        eyeTypeProfile:type=>profiles[Math.max(0,Math.min(4,Math.round(type)))],
        constrainCirculationSize:value=>Math.max(0,Math.min(6,Math.round(value)))
    }
};
vm.createContext(context);
const helperStart = source.indexOf('function coreCirculationIntensityProxy');
const helperEnd = source.indexOf('function convectiveEnvironmentTarget');
assert.ok(helperStart>=0 && helperEnd>helperStart);
vm.runInContext(
    source.slice(helperStart,helperEnd)+
        '\nglobalThis.getEyeMaturity = coreEyeTypeMaturity;'+
        '\nglobalThis.getEyeRate = coreEyeTypeIntensificationMultiplier;'+
        '\nglobalThis.getEyePressure = coreEyeTypePressurePotential;'+
        '\nglobalThis.getEyeWind = coreEyeTypeWindPotential;',
    context
);

const mature = {
    type:2,
    windSpeed:105,
    organization:0.9,
    lowerWarmCore:0.95,
    upperWarmCore:0.95
};
const valueFor = (type,fn)=>context[fn]({...mature,eyeType:type});
assert.equal(valueFor(2,'getEyeRate'),1);
assert.ok(valueFor(0,'getEyeRate')>valueFor(1,'getEyeRate'));
assert.ok(valueFor(1,'getEyeRate')>valueFor(2,'getEyeRate'));
assert.ok(valueFor(2,'getEyeRate')>valueFor(3,'getEyeRate'));
assert.ok(valueFor(3,'getEyeRate')>valueFor(4,'getEyeRate'));
assert.ok(valueFor(0,'getEyePressure')>valueFor(2,'getEyePressure'));
assert.ok(valueFor(0,'getEyeWind')>valueFor(2,'getEyeWind'));
assert.equal(context.getEyeMaturity({...mature,eyeType:0}),
    context.getEyeMaturity({...mature,eyeType:4}));
assert.equal(context.getEyeMaturity({...mature,windSpeed:25,eyeType:0}),0,
    'eye advantages must not apply before a mature eye can exist');

const imageryContext = {
    Math,
    Number,
    TAU:Math.PI*2,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    ENV_DEFS:{defaults:{}},
    ENABLE_SIMULATED_BASE_SCAN_LAYER:false,
    SIMULATED_BASE_SCAN_BT_MIN:140,
    SIMULATED_BASE_SCAN_BT_MAX:300,
    StormData:{eyeTypeProfile:type=>({
        visualScale:[0.45,0.70,1,1.45,1.8][Math.max(0,Math.min(4,Math.round(type)))]
    })}
};
vm.createContext(imageryContext);
const imageryStart = source.indexOf('function radarClamp');
const imageryEnd = source.indexOf('function simulatedIrBdTemperature');
assert.ok(imageryStart>=0 && imageryEnd>imageryStart);
vm.runInContext(
    source.slice(imageryStart,imageryEnd)+
        '\nglobalThis.getEyeScale = simulatedCloudEyeScale;'+
        '\nglobalThis.getEyeRadiusFactor = simulatedEyeTypeRadiusFactor;',
    imageryContext
);
const medium = {phase:1.4,cloudEyeExpansion:0,eyeType:2};
const pinhole = {phase:1.4,cloudEyeExpansion:0,eyeType:0};
const giant = {phase:1.4,cloudEyeExpansion:0,eyeType:4};
assert.ok(imageryContext.getEyeScale(pinhole)<imageryContext.getEyeScale(medium));
assert.ok(imageryContext.getEyeScale(medium)<imageryContext.getEyeScale(giant));
assert.ok(imageryContext.getEyeRadiusFactor({
    eyeType:0,eyeDiameter:6,radiusOfMaxWind:30
}) < imageryContext.getEyeRadiusFactor({
    eyeType:4,eyeDiameter:100,radiusOfMaxWind:30
}));

console.log('Eye type diameter bands, imagery sizing, and compact-eye intensification verified.');
