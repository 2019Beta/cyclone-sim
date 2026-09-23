const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const outflowStart = source.indexOf('function troughOutflowPotential');
const pressureTargetStart = source.indexOf('function pressureWindTarget');
const coreStart = source.indexOf('STORM_ALGORITHM.defaults.core = function');
const experimentalStart = source.indexOf(
    'STORM_ALGORITHM[SIM_MODE_EXPERIMENTAL].core = function',coreStart
);
assert.ok(outflowStart>=0 && pressureTargetStart>outflowStart &&
    coreStart>pressureTargetStart && experimentalStart>coreStart);

const map = (v,a,b,c,d,within)=>{
    let t = (v-a)/(b-a);
    if(within) t = Math.max(0,Math.min(1,t));
    return c+(d-c)*t;
};
const context = {
    Math,
    Number,
    PI:Math.PI,
    HEIGHT:540,
    TROP:2,
    SUBTROP:1,
    EXTROP:0,
    TROPWAVE:3,
    MONSOON:4,
    STORM_ALGORITHM:{defaults:{}},
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    lerp:(a,b,t)=>a+(b-a)*t,
    map,
    max:Math.max,
    min:Math.min,
    abs:Math.abs,
    sqrt:Math.sqrt,
    pow:Math.pow,
    sq:v=>v*v,
    log:Math.log,
    random:()=>0.5,
    tropOrSub:type=>type===2 || type===1 || type===4
};
vm.createContext(context);

vm.runInContext(source.slice(outflowStart,pressureTargetStart),context);
const coreEnd = experimentalStart;
const coreFunction = source.slice(
    source.indexOf('function',coreStart),coreEnd
).replace(/;\s*$/,'');
vm.runInContext('globalThis.runCore = '+coreFunction+';',context);

Object.assign(context,{
    circulationEnvironmentalSensitivity:()=>1,
    circulationIntensificationRate:()=>1,
    extratropicalDevelopmentPotential:()=>0,
    coreEyeTypePressurePotential:()=>1,
    lowerWarmCoreRecoveryFactor:()=>1,
    landfallIntensityFactor:()=>1,
    applyLowerWarmCoreResponse:(previous,current)=>current,
    landfallOrganizationFloor:()=>0,
    targetRadiusOfMaxWind:()=>48,
    updateWindFieldStructure:()=>{},
    updateConvectiveActivity:()=>{},
    updateRainbandActivity:()=>{},
    updateEyewallReplacementCycle:()=>{},
    eyewallReplacementWeights:()=>({}),
    eyewallReplacementWeakening:()=>0,
    eyewallReplacementRadiusExpansion:()=>0,
    updateLandfallRadiusOfMaxWind:()=>{},
    windPressureSizeFactors:()=>({pressure:1,wind:1}),
    pressureWindTarget:()=>130
});

function makeEnvironment(withOutflow){
    return {
        backgroundPressure:()=>1015,
        get:(field,x,y)=>{
            if(field==='jetstream'){
                if(!withOutflow) return 220;
                return x<450 ? 260 : 220;
            }
            if(field==='ULSteering'){
                if(!withOutflow) return {x:0,y:0};
                if(x<418) return {x:0,y:0};
                if(x>482) return {x:4,y:0};
                return y<300 ? {x:2,y:0} : {x:2,y:4};
            }
            return 0;
        }
    };
}

function makeStorm(withOutflow){
    return {
        type:context.TROP,
        pressure:980,
        windSpeed:90,
        organization:0.90,
        lowerWarmCore:1,
        upperWarmCore:1,
        depth:0.5,
        circulationSize:3,
        radiusOfMaxWind:48,
        landWarmCoreDamage:0,
        landExposure:0,
        eyewallCycle:0,
        eyewallFailure:0,
        eyewallFailureMode:0,
        eyewallFailureEvent:0,
        eyewallFailureEventMode:0,
        eyewallReplacementMemory:0,
        interaction:{shear:0,kill:0},
        pos:{x:450,y:300},
        basin:{
            tick:0,
            hemY:y=>y,
            env:makeEnvironment(withOutflow)
        }
    };
}

function makeUtility(){
    return {
        land:()=>0,
        f:field=>{
            if(field==='SST') return 29;
            if(field==='jetstream') return 240;
            if(field==='moisture') return 0.72;
            if(field==='shear') return {mag:()=>3.3};
            return 0;
        }
    };
}

const highOutflow = makeStorm(true);
const noOutflow = makeStorm(false);
const highPotential = context.troughOutflowPotential(
    highOutflow,60,0.72,3.3,29,0
);
const noPotential = context.troughOutflowPotential(
    noOutflow,60,0.72,3.3,29,0
);
assert.ok(highPotential>0.95,'the test environment should produce a strong outflow signal');
assert.equal(noPotential,0,'a flat jet should not produce trough outflow');
assert.equal(context.tropicalOutflowPressureRateMultiplier(0),1);
assert.ok(context.tropicalOutflowPressureRateMultiplier(highPotential)>3);
assert.ok(context.tropicalOutflowWindRateMultiplier(highPotential)>1.8);

const utility = makeUtility();
context.runCore(noOutflow,utility);
context.runCore(highOutflow,utility);
assert.ok(highOutflow.pressure<noOutflow.pressure,
    'high outflow should accelerate pressure falls');
assert.ok(highOutflow.windSpeed>noOutflow.windSpeed,
    'high outflow should accelerate the wind response to deepening');
assert.ok(highOutflow.windSpeed<130,
    'outflow support must not snap the wind directly to its target');

// A storm entering the divergent side of the trough should receive a short
// phasing burst, while a stationary channel should settle back to its normal
// sustained support.
const phasingStorm = makeStorm(false);
context.runCore(phasingStorm,utility);
assert.equal(phasingStorm.troughOutflowBurst,0,
    'no trough signal should not create a phasing burst');
phasingStorm.basin.env = makeEnvironment(true);
context.runCore(phasingStorm,utility);
const entryBurst = phasingStorm.troughOutflowBurst;
assert.ok(entryBurst>0.5,
    'entering a strong divergent channel should trigger a phasing burst');
context.runCore(phasingStorm,utility);
context.runCore(phasingStorm,utility);
assert.ok(phasingStorm.troughOutflowBurst<entryBurst,
    'the phasing burst should decay while the outflow channel remains steady');

console.log('High-outflow pressure and wind-rate acceleration verified.');
