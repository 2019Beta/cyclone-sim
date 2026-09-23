const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('sim-mode-defs.js','utf8');
let draws = 0;
let draw = 0;
const context = {
    Math, Number, TROP:1, max:Math.max,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    random:(a,b)=>{ draws++; return b===undefined ? draw : (a+b)/2; },
    EYEWALL_REPLACEMENT_MIN_COOLDOWN:72,
    EYEWALL_REPLACEMENT_MAX_COOLDOWN:120
};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function radarClamp'),
    source.indexOf('// Every simulated imagery')),context);
vm.runInContext(source.slice(source.indexOf('function eyewallReplacementWeights'),
    source.indexOf('function circulationIntensificationRate')),context);
const storm = ()=>({eyewallCycle:0.56,eyewallCycleDuration:48,
    eyewallCycleCooldown:100,type:1,windSpeed:120,organization:0.8});
const failed = storm();
context.updateEyewallReplacementCycle(failed,0,3);
assert.equal(failed.eyewallFailureMode,1);
assert.ok(failed.eyewallFailure>0 && failed.eyewallFailure<0.2);
const firstDraws = draws;
context.updateEyewallReplacementCycle(failed,0,3);
assert.equal(draws,firstDraws,'failure must be sampled only once per cycle');
for(let hour=0;hour<24;hour++) context.updateEyewallReplacementCycle(failed,0,3);
assert.equal(failed.eyewallCycle,0);
assert.ok(failed.eyewallFailure>0.7,'failed structure must survive cycle completion');
assert.ok(failed.eyewallReplacementMemory>=0.24,
    'cycle completion must leave a residual eye-size memory');
assert.ok(failed.cloudEyeExpansion<0.50,
    'the live replacement eye expansion must remain bounded');
assert.ok(failed.eyewallFailureEvent>0.6,
    'a failed replacement must emit a persistent structural event');
assert.equal(failed.eyewallFailureEventMode,1,
    'the failure event must retain its sampled morphology mode');
const damage = failed.eyewallFailure;
context.updateEyewallReplacementCycle(failed,0,3);
assert.ok(failed.eyewallFailure<damage && failed.eyewallFailure>damage*0.95);
const giant = context.eyewallReplacementWeights(0,1,1);
const layered = context.eyewallReplacementWeights(0,1,2);
assert.ok(giant.inner<0.1 && giant.outer>0.7);
assert.ok(layered.inner>0.5 && layered.outer>0.7);
const nested = context.eyewallReplacementWeights(0,0.9,2,0.24,1);
assert.ok(nested.inner>0.5 && nested.outer>0.7,
    'one failure mode should preserve a nested double-wall structure');
const nearCompletion = context.eyewallReplacementWeights(0.99,0,0,0.24);
const completed = context.eyewallReplacementWeights(1,0,0,0.24);
assert.ok(nearCompletion.inner<0.15,
    'the original inner eyewall must collapse before the cycle ends');
assert.ok(nearCompletion.outer>0.85,
    'the replacement eyewall must dominate before the cycle boundary');
assert.ok(Math.abs(nearCompletion.inner-completed.inner)<0.15,
    'the original eyewall must not pop back in when the cycle resets');
assert.ok(completed.inner<0.01 && completed.outer>0.99,
    'a successful replacement must settle on one dominant outer eyewall');
draw = 0.99;
const success = storm();
context.updateEyewallReplacementCycle(success,0,0);
assert.equal(success.eyewallFailureMode,0);
assert.equal(success.eyewallFailure,0);
vm.runInContext(source.slice(source.indexOf('function simulatedEyeVisibilityFactor'),
    source.indexOf('function simulatedRadarReflectivity')),context);
const successful = {
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
context.updateEyewallReplacementCycle(successful,0,0);
assert.equal(successful.eyewallCycle,0);
assert.equal(successful.eyewallFailureEvent,0);
assert.ok(context.simulatedReplacementRadius(successful)>1.10,
    'successful completion must retain a larger post-replacement wall radius');
const postWeights = context.eyewallReplacementWeights(
    0,successful.eyewallFailure,successful.eyewallFailureMode,
    successful.eyewallReplacementMemory,successful.eyewallFailureEvent
);
assert.ok(postWeights.outer>0.9 && postWeights.inner<0.1,
    'the completed success must hand off to one dominant outer wall');
const eye = {eyeFactor:0.9,eyeFillFactor:0,phase:1,eyewallFailure:1};
assert.ok(context.simulatedEyeVisibilityFactor(eye)<0.35);
for(let i=0;i<40;i++) assert.ok(context.simulatedBrokenWall(eye,i/40*Math.PI*2,1)<0.66);
const gapSystem = {
    eyewallFailure:0.9,
    eyewallFailureMode:1,
    eyewallFailureEvent:1,
    eyewallFailureEventMode:1,
    eyewallOuterRadius:1.8,
    phase:0.8,
    visualSeed:2.1
};
let gapDifference = 0;
for(let i=0;i<48;i++){
    const angle=i/48*Math.PI*2;
    gapDifference=Math.max(gapDifference,
        Math.abs(
            context.simulatedEyewallWallContinuity(gapSystem,angle,0)-
            context.simulatedEyewallWallContinuity(gapSystem,angle,1)
        )
    );
}
assert.ok(gapDifference>0.18,
    'failure gaps in the inner and outer walls must not be forced to coincide');
console.log('Failed replacement probability, persistence, morphology and reduced clearing verified.');
