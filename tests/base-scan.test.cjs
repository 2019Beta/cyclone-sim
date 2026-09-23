const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const end = source.indexOf('ENV_DEFS.defaults.baseScan');
assert.ok(start >= 0 && end > start,'base-scan model is present');

const context = {
    Math,
    Number,
    TAU: Math.PI*2,
    SIMULATED_BASE_SCAN_BT_MIN:100,
    SIMULATED_BASE_SCAN_BT_MAX:300,
    SIMULATED_BASE_SCAN_BACKGROUND_BASE:0.07,
    SIMULATED_BASE_SCAN_BACKGROUND_VARIATION:0.11,
    SIMULATED_BASE_SCAN_CELL_SCALE:1.2,
    SIMULATED_BASE_SCAN_CELL_WEIGHT:0.10,
    SIMULATED_BASE_SCAN_DENOISE_LOW:0.075,
    SIMULATED_BASE_SCAN_DENOISE_HIGH:0.86,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    floor:Math.floor,
    lerp:(a,b,t)=>a+(b-a)*t
};
vm.runInNewContext(
    source.slice(start,end)+
        '\nglobalThis.getReflectivity = simulatedRadarReflectivity;'+
        '\nglobalThis.getBrightness = simulatedBaseScanBrightnessTemperature;',
    context
);

const makeSystem = strength=>({
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
    strength,
    baseScanStrength:strength,
    eyeFactor:0.85,
    eyeFillFactor:0,
    eyewallInnerWeight:1,
    eyewallOuterWeight:0,
    eyewallOuterRadius:1.55,
    eyewallFactor:0.88,
    bandPower:1.7,
    landSuppression:0,
    landAbrasionProfile:new Array(32).fill(0),
    landAbrasionSectorCount:32,
    bands:[{
        phase:0.2,
        strength:0.9,
        width:0.18,
        start:0.82,
        reach:3.0,
        curvature:0.75
    }]
});

const utility = systems=>({
    field(name){ return name==='moisture' ? 0.72 : 27; },
    simulatedSystems:systems,
    simulatedSystemsTick:0
});
const utilityFor = (systems,tick)=>({...utility(systems),simulatedSystemsTick:tick});

const sampleAtRadius = (strength,radius=1.05)=>{
    const system = makeSystem(strength);
    const u = utility([system]);
    return context.getReflectivity(
        u,
        Math.cos(0.6)*radius*system.rmwX,
        Math.sin(0.6)*radius*system.rmwY,
        0,
        true
    );
};

const weak = sampleAtRadius(0.28);
const moderate = sampleAtRadius(0.55);
const strong = sampleAtRadius(0.86);
const strongCore = sampleAtRadius(0.86,0.60);
const extremeCore = sampleAtRadius(1.45,0.60);
assert.ok(weak < moderate && moderate < strong,
    'base-scan response should increase continuously for weak, moderate, and strong systems');
assert.ok(strong > 0.65,
    'a strong organized system should retain a high-contrast base-scan eyewall');
assert.ok(extremeCore > strongCore+0.015,
    'C6+/hyper-intense base-scan returns must retain headroom above ordinary C5');

// Weak tropical cyclones should retain a diffuse lower-level precipitation
// core even when they have no resolved eyewall. Their center should not look
// like an empty eye merely because the spiral bands have not organized yet.
{
    const weakCoreSystem = {...makeSystem(0.30),
        baseScanStrength:0.30,
        intensity:0.20,
        eyeFactor:0,
        eyewallFactor:0,
        convectiveActivity:0.65,
        bands:[]
    };
    const weakCoreUtility = utilityFor([weakCoreSystem],0);
    const weakCoreCenter = context.getReflectivity(
        weakCoreUtility,0,0,0,true
    );
    const weakCoreEdge = context.getReflectivity(
        weakCoreUtility,weakCoreSystem.rmwX,0,0,true
    );
    assert.ok(weakCoreCenter>0.10,
        'a weak tropical cyclone base scan should retain a filled inner core');
    assert.ok(weakCoreCenter>weakCoreEdge*0.45,
        'a weak inner core should not collapse into an artificial hollow ring');
    const clearSky = context.getBrightness(utility([]),0,0,0);
    const weakCoreBrightness = context.getBrightness(
        weakCoreUtility,0,0,0
    );
    assert.ok(Math.abs(weakCoreBrightness-clearSky)>2.5,
        'weak lower-level precipitation should remain visible against clear sky');
    const weakCoreInnerRingBrightness = context.getBrightness(
        weakCoreUtility,weakCoreSystem.rmwX*0.72,0,0
    );
    const weakCoreOuterBrightness = context.getBrightness(
        weakCoreUtility,weakCoreSystem.rmwX*1.35,0,0
    );
    assert.ok(weakCoreInnerRingBrightness>=weakCoreOuterBrightness-3,
        'an immature tropical cyclone should not gain an isolated cold eyewall ring');
}

// A resolved eyewall may be textured, but a few deterministic lattice cells
// must not become isolated intensity leaders. Check several noise epochs and
// storm phases so the guard covers the intermittent version of the artifact.
for(const phase of [0.2,1.4,2.5,4.8]){
    for(const tick of [0,72,8760]){
        const system = {...makeSystem(0.86),phase,bands:[]};
        const utility = utilityFor([system],tick);
        const ring = [];
        for(let index=0;index<360;index++){
            const angle = index/360*Math.PI*2;
            ring.push(context.getReflectivity(
                utility,
                Math.cos(angle)*system.rmwX*1.05,
                Math.sin(angle)*system.rmwY*1.05,
                tick,
                true
            ));
        }
        const sorted = ring.slice().sort((a,b)=>a-b);
        const p90 = sorted[Math.floor(sorted.length*0.90)];
        assert.ok(sorted[sorted.length-1]-p90<0.04,
            `base-scan ring must not develop isolated high-return spots at phase ${phase}, tick ${tick}`);
    }
}

// A band may still appear outside the core, but it must not stack with the
// primary eyewall and create a saturated inner-ring outlier.
{
    const system = makeSystem(0.86);
    const utility = utilityFor([system],0);
    const ring = [];
    for(let index=0;index<360;index++){
        const angle = index/360*Math.PI*2;
        ring.push(context.getReflectivity(utility,
            Math.cos(angle)*system.rmwX*1.05,
            Math.sin(angle)*system.rmwY*1.05,0,true));
    }
    const sorted = ring.slice().sort((a,b)=>a-b);
    const p90 = sorted[Math.floor(sorted.length*0.90)];
    assert.ok(sorted[sorted.length-1]-p90<0.018,
        'rainband/eyewall stacking must not create a saturated inner-ring outlier');
}

const quiet = utility([]);
const background = [];
for(let y=-180;y<=180;y+=12){
    for(let x=-180;x<=180;x+=12){
        background.push(context.getReflectivity(quiet,x,y,0,true));
    }
}
const isolatedReturns = background.filter(v=>v>0.35).length;
assert.ok(isolatedReturns===0,
    'quiet base-scan background should not create isolated high-return noise points');

console.log('Base-scan strength and background-noise checks passed.');

// Isolate coast contact from subsequent thermodynamic weakening. Contact
// should break the landward wall without deleting ocean-side precipitation.
const oceanSystem = makeSystem(0.86);
const coastalSystem = {...oceanSystem,
    landAbrasionProfile:Array.from({length:32},(_,i)=>i<8 || i>24 ? 0.7 : 0)};
const oceanU = utility([oceanSystem]);
const coastalU = utility([coastalSystem]);
const wallX = oceanSystem.rmwX;
const oceanWall = context.getReflectivity(oceanU,wallX,0,0,true);
const coastalWall = context.getReflectivity(coastalU,wallX,0,0,true);
assert.ok(coastalWall<oceanWall,'landward wall should weaken on contact');
assert.ok(coastalWall>oceanWall*0.25,'contact must not erase precipitation');
assert.equal(context.getReflectivity(coastalU,-wallX,0,0,true),
    context.getReflectivity(oceanU,-wallX,0,0,true),'ocean-side wall should remain intact');

const recoveryStart = source.indexOf('function lowerWarmCoreRecoveryFactor');
const recoveryEnd = source.indexOf('function applyLowerWarmCoreResponse');
vm.runInNewContext(source.slice(recoveryStart,recoveryEnd)+
    '\nglobalThis.recover = lowerWarmCoreRecoveryFactor;',context);
const lowland = {landWarmCoreDamage:0};
const mountain = {landWarmCoreDamage:0};
context.recover(lowland,0.501);
assert.ok(lowland.landWarmCoreDamage>0 && lowland.landWarmCoreDamage<0.1,
    'first landfall hour should start gradual damage');
for(let hour=0;hour<24;hour++){
    context.recover(lowland,0.501);
    context.recover(mountain,1);
}
assert.ok(mountain.landWarmCoreDamage>lowland.landWarmCoreDamage,
    'higher terrain should accelerate inland damage');
const inlandDamage = lowland.landWarmCoreDamage;
context.recover(lowland,0);
assert.ok(lowland.landWarmCoreDamage<inlandDamage &&
    lowland.landWarmCoreDamage>0.9*inlandDamage,
    'returning to water should retain the inland structural memory');
const damaged = {landWarmCoreDamage:0.98};
context.recover(damaged,0.501);
assert.equal(damaged.landWarmCoreDamage,0.98,'moving to lowland must not heal an inland core');

for(const tick of [12,8760,50000]){
    const system = {...makeSystem(0.86),hemisphere:1};
    const u = utility([system]);
    u.simulatedSystemsTick = tick;
    let variation = 0;
    for(let i=0;i<800;i++){
        const x = (0.8+i/800*2.8)*system.rmwX;
        const y = 0.3*system.rmwY;
        variation += Math.abs(context.getReflectivity(u,x+0.025,y,tick,true)-
            context.getReflectivity(u,x,y,tick,true));
    }
    assert.ok(variation/800<0.004,
        `Base scan texture must stay resolved at tick ${tick}: ${variation/800}`);
}
