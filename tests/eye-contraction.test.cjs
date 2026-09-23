const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function coreCirculationIntensityProxy');
const end = source.indexOf('function convectiveEnvironmentTarget');
assert.ok(start>=0 && end>start,'eye contraction helpers are present');

const profiles = [
    {diameterMin:3,diameterMax:10,typicalDiameter:6},
    {diameterMin:10,diameterMax:20,typicalDiameter:15},
    {diameterMin:20,diameterMax:40,typicalDiameter:30},
    {diameterMin:40,diameterMax:80,typicalDiameter:60},
    {diameterMin:80,diameterMax:120,typicalDiameter:100}
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
    lerp:(a,b,t)=>a+(b-a)*t,
    StormData:{
        eyeTypeProfile:type=>profiles[Math.max(0,Math.min(4,Math.round(type)))],
        constrainCirculationSize:value=>Math.max(0,Math.min(6,Math.round(value)))
    }
};
vm.createContext(context);
vm.runInContext(
    source.slice(start,end)+
        '\nglobalThis.getContraction = coreEyeContractionPotential;'+
        '\nglobalThis.updateEye = updateEyeDiameter;',
    context
);

const makeStorm = overrides=>({
    type:context.TROP,
    windSpeed:30,
    pressure:1005,
    organization:0.9,
    lowerWarmCore:0.95,
    upperWarmCore:0.95,
    eyeType:2,
    eyeDiameter:30,
    eyeDiameterBase:30,
    ...overrides
});

const weak = makeStorm();
const strong = makeStorm({windSpeed:150,pressure:910});
assert.equal(context.getContraction(weak),0,
    'weak tropical systems should not contract their eye');
assert.ok(context.getContraction(strong)>0.9,
    'a mature high-intensity system should reach the contraction regime');

context.updateEye(strong);
assert.ok(strong.eyeDiameter<strong.eyeDiameterBase,
    'high intensity should reduce the current eye diameter');
assert.ok(strong.eyeDiameter>=20 && strong.eyeDiameter>0,
    'eye contraction must retain the eye-type minimum and never reach zero');

const contracted = strong.eyeDiameter;
for(let hour=0;hour<80;hour++){
    strong.windSpeed = 30;
    strong.pressure = 1005;
    context.updateEye(strong);
}
assert.ok(strong.eyeDiameter>contracted,
    'a weakening system should gradually reopen its eye');
assert.equal(context.updateEye(makeStorm({type:0,windSpeed:150,pressure:910})),30,
    'extratropical systems should not use the tropical eye-contraction rule');

console.log('High-intensity eye contraction, non-zero floor, and recovery verified.');
