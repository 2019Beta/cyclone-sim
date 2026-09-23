const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const radarStart = source.indexOf('function radarClamp');
const radarEnd = source.indexOf('function simulatedBaseScanBrightnessTemperature');
const coreStart = source.indexOf('function targetRadiusOfMaxWind');
const typeStart = source.indexOf('// -- Type Determination --');
const typeEnd = source.indexOf('// -- Version --');
assert.ok(radarStart>=0 && radarEnd>radarStart && coreStart>radarEnd && typeStart>coreStart && typeEnd>typeStart);

const map = (v,a,b,c,d,within)=>{
    let t = (v-a)/(b-a);
    if(within) t = Math.max(0,Math.min(1,t));
    return c+(d-c)*t;
};
const context = {
    Math,
    Number,
    PI:Math.PI,
    TAU:Math.PI*2,
    WIDTH:960,
    HEIGHT:540,
    TROP:2,
    SUBTROP:1,
    EXTROP:0,
    TROPWAVE:3,
    MONSOON:4,
    SIM_MODE_EXPERIMENTAL:4,
    STORM_ALGORITHM:{defaults:{},4:{}},
    land:null,
    MAP_TYPES:[
        {form:'linear'},
        {form:'linear'},
        {form:'linear'},
        {form:'linear'},
        {form:'radial'},
        {form:'radial'},
        {form:'earth',west:-102.67,east:3,north:59.45,south:0}
    ],
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    lerp:(a,b,t)=>a+(b-a)*t,
    map,
    max:Math.max,
    min:Math.min,
    abs:Math.abs,
    sqrt:Math.sqrt,
    pow:Math.pow,
    sq:v=>v*v,
    sin:Math.sin,
    cos:Math.cos,
    log:Math.log,
    atan:Math.atan,
    floor:Math.floor,
    round:Math.round,
    random:(a,b)=>b===undefined ? 0.5 : (a+b)/2,
    StormData:{
        constrainRadiusOfMaxWind:v=>v,
        estimateRadiusOfMaxWind:()=>45,
        circulationSizeToRadius:()=>48.5,
        constrainCirculationSize:v=>Math.max(0,Math.min(6,Math.round(v)))
    },
    tropOrSub:ty=>ty===2 || ty===1 || ty===4,
    EYEWALL_REPLACEMENT_MIN_WIND:105,
    EYEWALL_REPLACEMENT_MIN_ORGANIZATION:0.68,
    EYEWALL_REPLACEMENT_MIN_WARM_CORE:0.7,
    EYEWALL_REPLACEMENT_TRIGGER_RATE:0,
    EYEWALL_REPLACEMENT_MIN_COOLDOWN:48,
    EYEWALL_REPLACEMENT_MAX_COOLDOWN:96,
    EYEWALL_REPLACEMENT_MIN_DURATION:36,
    EYEWALL_REPLACEMENT_MAX_DURATION:60
};
vm.createContext(context);
vm.runInContext(source.slice(radarStart,radarEnd)+source.slice(coreStart,typeEnd),context);

function makeStorm(){
    const storm = {
        type:context.TROP,
        pressure:975,
        windSpeed:90,
        organization:1,
        lowerWarmCore:1,
        upperWarmCore:1,
        depth:0,
        radiusOfMaxWind:48.5,
        circulationSize:3,
        landWarmCoreDamage:0,
        landExposure:0,
        eyewallCycle:0,
        eyewallCycleCooldown:999,
        eyewallFailure:0,
        interaction:{shear:0,kill:0},
        pos:{x:450,y:300},
        basin:{
            tick:0,
            mapType:0,
            hemY:y=>y,
            env:{
                backgroundPressure:()=>1015,
                get:(field)=>field==='ULSteering' ? {x:0,y:0} : 120
            }
        },
        coord:()=>({latitude:15}),
        fetchStorm:()=>undefined
    };
    return storm;
}

function update(storm,lnd){
    const u = {
        land:()=>lnd,
        f:field=>{
            if(field==='SST') return 28;
            if(field==='moisture') return 0.72;
            if(field==='jetstream') return 120;
            if(field==='shear') return {mag:()=>2};
            return {x:0,y:0};
        }
    };
    context.STORM_ALGORITHM.defaults.core(storm,u);
    context.STORM_ALGORITHM.defaults.typeDetermination(storm,u);
    storm.basin.tick++;
}

const direct = makeStorm();
// The real storm normally spends time over water before landfall. This also
// guards against accidentally locking in a "not mature" state at genesis.
for(let hour=0;hour<6;hour++) update(direct,0);
const lowerWarmCoreBeforeLandfall = direct.lowerWarmCore;
for(let hour=0;hour<12;hour++) update(direct,0.501);
assert.ok(direct.lowerWarmCore<lowerWarmCoreBeforeLandfall,
    'land friction must weaken the lower warm core while the center is over land');
assert.equal(direct.type,context.TROP,
    'a strong cyclone crossing a low-relief island should retain tropical classification');
assert.ok(direct.windSpeed>=34,
    'a 90 kt cyclone should remain at least tropical-storm strength after a short island crossing');

for(let hour=0;hour<12;hour++) {
    update(direct,0);
}
assert.ok(direct.windSpeed>=34,
    'a cyclone should not fall below tropical-storm strength immediately after leaving an island');
assert.ok(direct.landWarmCoreDamage>0,
    'landfall memory should persist after the center returns over water');
assert.ok(direct.organization>0,
    'landfall should weaken organization gradually instead of deleting it');

// Damage is an exposure-time integral whose rate depends on current
// intensity: a weak system should take longer to lose its warm core than a
// major hurricane crossing the same island.
const weakDamage = {landWarmCoreDamage:0,windSpeed:35};
const strongDamage = {landWarmCoreDamage:0,windSpeed:125};
for(let hour=0;hour<12;hour++){
    context.lowerWarmCoreRecoveryFactor(weakDamage,0.501);
    context.lowerWarmCoreRecoveryFactor(strongDamage,0.501);
}
assert.ok(strongDamage.landWarmCoreDamage>weakDamage.landWarmCoreDamage*1.3,
    'stronger systems should accumulate land damage faster than weak systems');

// A peripheral brush is intentionally much weaker than a center crossing.
const land = {
    getAtXY(x){ return x>460 ? 1 : 0; }
};
context.land = land;
const brush = makeStorm();
brush.pos.x = 450;
const centerExposure = context.landfallExposureAtStorm(brush,0.501);
const brushExposure = context.landfallExposureAtStorm(brush,0);
assert.ok(centerExposure>0.8,'direct center contact should be a strong exposure');
assert.ok(brushExposure>0 && brushExposure<0.42,
    'a peripheral brush should receive a smaller, non-zero exposure');

// The center can remain over water while one eyewall sector clips the coast.
// That contact must start a gradual lower-core response without collapsing the
// entire storm on the first brush.
const eyewallCoast = {
    getAtXY(x){ return x>482 ? 1 : 0; }
};
context.land = eyewallCoast;
const peripheral = makeStorm();
const peripheralLowerCoreBefore = peripheral.lowerWarmCore;
update(peripheral,0);
assert.ok(peripheral.landExposure>0,
    'an eyewall brush must register while the storm center remains over water');
assert.ok(peripheral.lowerWarmCore<peripheralLowerCoreBefore,
    'a peripheral land brush must begin weakening the lower warm core');
assert.ok(peripheral.lowerWarmCore>peripheralLowerCoreBefore*0.95,
    'a single peripheral brush must not erase the lower warm core');

// A damaged warm core is not, by itself, evidence of extratropical transition
// at low latitude. Keep the original tropical-family classification after
// landfall, while preserving the normal transition at higher latitude.
const lowLatitudeDamaged = makeStorm();
lowLatitudeDamaged.landWarmCoreDamage = 0.72;
lowLatitudeDamaged.lowerWarmCore = 0.30;
lowLatitudeDamaged.upperWarmCore = 0.40;
context.STORM_ALGORITHM.defaults.typeDetermination(lowLatitudeDamaged,{});
assert.equal(lowLatitudeDamaged.type,context.TROP,
    'low-latitude landfall damage should not force a tropical cyclone to become extratropical');

const higherLatitudeDamaged = makeStorm();
higherLatitudeDamaged.coord = ()=>({latitude:35});
higherLatitudeDamaged.landWarmCoreDamage = 0.72;
higherLatitudeDamaged.lowerWarmCore = 0.30;
higherLatitudeDamaged.upperWarmCore = 0.40;
context.STORM_ALGORITHM.defaults.typeDetermination(higherLatitudeDamaged,{});
assert.equal(higherLatitudeDamaged.type,context.EXTROP,
    'the latitude guard should not suppress a valid higher-latitude transition');

console.log('Landfall persistence, classification grace, and peripheral exposure verified.');
