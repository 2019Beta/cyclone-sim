const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const end = source.indexOf('function simulatedIrBdTemperature');
assert.ok(start >= 0 && end > start,'cloud temperature model is present');

const context = {
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
    colorMode:()=>{},
    RGB:1,
    color:()=>{},
    lerpColor:()=>{},
    ENV_DEFS:{defaults:{}},
    ENABLE_SIMULATED_BASE_SCAN_LAYER:false,
    SIMULATED_BASE_SCAN_BT_MIN:140,
    SIMULATED_BASE_SCAN_BT_MAX:300
};
vm.runInNewContext(
    source.slice(start,end)+'\nglobalThis.getCloudTemperature = simulatedCloudTemperature;',
    context
);

// Deliberately make the environment unfavorable enough to lower the rain
// signal. Pressure/wind intensity and an organized eyewall should still leave
// a resolvable Dvorak B band in the IR cloud-top field.
const system = {
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
    tropicalFactor:0.9,
    frontalFactor:0.05,
    frontAngle:0,
    strength:0.36,
    intensity:1,
    eyeFactor:0.85,
    eyeFillFactor:0,
    eyewallInnerWeight:1,
    eyewallOuterWeight:0,
    eyewallOuterRadius:1.55,
    eyewallFactor:0.88,
    bandPower:1.7,
    bands:[]
};
const utility = {
    field(name){ return name==='moisture' ? 0.34 : 25; },
    simulatedSystems:[system],
    simulatedSystemsTick:0
};

let bSamples = 0;
let lgSamples = 0;
let eyeTemperature = context.getCloudTemperature(utility,0,0,0);
for(let angleIndex=0;angleIndex<720;angleIndex++){
    let angle = angleIndex/720*2*Math.PI;
    for(let radiusIndex=0;radiusIndex<=100;radiusIndex++){
        let radius = 0.4+radiusIndex/100*1.8;
        let temperature = context.getCloudTemperature(
            utility,
            Math.cos(angle)*radius*system.rmwX,
            Math.sin(angle)*radius*system.rmwY,
            0
        );
        if(temperature>=-63 && temperature<-53) lgSamples++;
        if(temperature>=-69 && temperature<-63) bSamples++;
    }
}

assert.ok(bSamples>1000,'an intense organized cyclone should expose a Dvorak B band');
assert.ok(lgSamples>1000,'the surrounding dense overcast should retain an LG shoulder');
assert.ok(eyeTemperature>9,'the same cyclone should retain a warm eye center');

// Exercise the complete continuous intensity ladder instead of only the
// strongest case. These values represent a smooth TS-to-C5 progression; the
// eyewall and eye are allowed to mature with intensity, as they do in the
// environment descriptor.
const intensityProfiles = [
    {label:'TS', intensity:0.19, strength:0.18, eyewallFactor:0,    eyeFactor:0},
    {label:'C1', intensity:0.41, strength:0.38, eyewallFactor:0.30, eyeFactor:0.10},
    {label:'C2', intensity:0.53, strength:0.50, eyewallFactor:0.55, eyeFactor:0.30},
    {label:'C3', intensity:0.64, strength:0.61, eyewallFactor:0.72, eyeFactor:0.50},
    {label:'C4', intensity:0.76, strength:0.73, eyewallFactor:0.82, eyeFactor:0.68},
    {label:'C5', intensity:0.99, strength:0.90, eyewallFactor:0.88, eyeFactor:0.85}
];

function measureIntensityProfile(profile){
    const levelSystem = {...system,...profile};
    const levelUtility = {...utility,simulatedSystems:[levelSystem]};
    let coldSamples = 0;
    let lgSamples = 0;
    let bSamples = 0;
    let ringTotal = 0;
    let ringCount = 0;
    let minimum = 25;
    for(let angleIndex=0;angleIndex<240;angleIndex++){
        let angle = angleIndex/240*2*Math.PI;
        let ringTemperature = context.getCloudTemperature(
            levelUtility,
            Math.cos(angle)*0.95*levelSystem.rmwX,
            Math.sin(angle)*0.95*levelSystem.rmwY,
            0
        );
        ringTotal += ringTemperature;
        ringCount++;
        for(let radiusIndex=0;radiusIndex<=48;radiusIndex++){
            let radius = 0.4+radiusIndex/48*1.8;
            let temperature = context.getCloudTemperature(
                levelUtility,
                Math.cos(angle)*radius*levelSystem.rmwX,
                Math.sin(angle)*radius*levelSystem.rmwY,
                0
            );
            minimum = Math.min(minimum,temperature);
            if(temperature<-41) coldSamples++;
            if(temperature>=-63 && temperature<-53) lgSamples++;
            if(temperature>=-69 && temperature<-63) bSamples++;
        }
    }
    return {
        label:profile.label,
        ringMean:ringTotal/ringCount,
        coldSamples,
        lgSamples,
        bSamples,
        minimum,
        eyeTemperature:context.getCloudTemperature(levelUtility,0,0,0)
    };
}

const intensityMeasurements = intensityProfiles.map(measureIntensityProfile);
for(let i=0;i<intensityMeasurements.length;i++){
    let measurement = intensityMeasurements[i];
    assert.ok(measurement.coldSamples>0,
        `${measurement.label} should retain a cold convective cloud field`);
    assert.ok(measurement.minimum< -41,
        `${measurement.label} should reach at least the MG temperature range`);
    if(i>0){
        let previous = intensityMeasurements[i-1];
        assert.ok(measurement.ringMean<previous.ringMean-0.5,
            `IR-BD ring response should strengthen from ${previous.label} to ${measurement.label}`);
    }
}

assert.ok(intensityMeasurements[1].coldSamples>
    intensityMeasurements[0].coldSamples,
    'C1 should expand the cold cloud-top coverage beyond TS');
assert.ok(intensityMeasurements[3].bSamples>0,
    'C3 should begin exposing a B cloud-top range');
assert.ok(intensityMeasurements[3].eyeTemperature>
    intensityMeasurements[3].ringMean+20,
    'C3 should retain a warmer eye than its surrounding convective ring');

// The raw temperatures remain continuous between category samples; the
// discrete grayscale transitions belong only to the Dvorak enhancement map.
let fineProfileSteps = [];
for(let step=0;step<=20;step++){
    let level = step/20;
    let measurement = measureIntensityProfile({
        label:`fine-${step}`,
        intensity:0.12+0.87*level,
        strength:0.12+0.78*level,
        eyewallFactor:0.88*level,
        eyeFactor:0.85*level
    });
    fineProfileSteps.push(measurement.ringMean);
}
let largestFineStep = 0;
for(let i=1;i<fineProfileSteps.length;i++)
    largestFineStep = Math.max(
        largestFineStep,
        Math.abs(fineProfileSteps[i]-fineProfileSteps[i-1])
    );
assert.ok(largestFineStep<4.5,
    'IR-BD temperature response should not jump between adjacent intensity levels');

console.log('IR-BD intensity ladder and mature eye structure verified.');

// Spatial seams and temporal jumps become especially visible when BD turns
// a small temperature change into a discrete grayscale boundary.
const evolvingUtility = tick=>({...utility,simulatedSystemsTick:tick});
for(const radius of [0.6,1,2,4,8]){
    const x = -radius*system.rmwX;
    const upper = context.getCloudTemperature(utility,x,1e-7,0);
    const lower = context.getCloudTemperature(utility,x,-1e-7,0);
    assert.ok(Math.abs(upper-lower)<0.001,'cloud field must join across the angular seam');
    const before = context.getCloudTemperature(evolvingUtility(24-1e-5),x,3,24-1e-5);
    const after = context.getCloudTemperature(evolvingUtility(24+1e-5),x,3,24+1e-5);
    assert.ok(Math.abs(before-after)<0.001,'cloud cells must evolve continuously across noise epochs');
    assert.equal(context.getCloudTemperature(utility,x,3,0),
        context.getCloudTemperature(utility,x,3,0),'rendering must be deterministic');
}

const replacing = {...system,eyewallInnerWeight:0.2,eyewallOuterWeight:0.8,
    eyewallOuterRadius:1.9};
const replacementUtility = {...utility,simulatedSystems:[replacing]};
const outerX = replacing.eyewallOuterRadius*system.rmwX;
assert.ok(context.getCloudTemperature(replacementUtility,outerX,0,0)<
    context.getCloudTemperature(utility,outerX,0,0),
    'a developing outer eyewall should cool the corresponding cloud tops');

const eyeScales = Array.from({length:40},(_,i)=>
    context.simulatedCloudEyeScale({phase:i*0.157}));
assert.ok(eyeScales.every(scale=>scale>=0.54 && scale<=0.72),
    'ordinary cloud eyes should retain the reduced radius range');
assert.ok(Math.max(...eyeScales)-Math.min(...eyeScales)>0.15,
    'different storms should have visibly different eye sizes');
assert.equal(context.simulatedCloudEyeScale(system),context.simulatedCloudEyeScale(system),
    'per-storm eye size must not flicker');
const expandedSystem = {...system,cloudEyeExpansion:1};
assert.ok(Math.abs(context.simulatedCloudEyeScale(expandedSystem)/
    context.simulatedCloudEyeScale(system)-1.25)<1e-12,
    'post-replacement expansion should be bounded at 25 percent');
const eyeEdgeX = 0.30*system.rmwX;
assert.ok(context.getCloudTemperature({...utility,simulatedSystems:[expandedSystem]},eyeEdgeX,0,0)>
    context.getCloudTemperature(utility,eyeEdgeX,0,0),
    'replacement expansion must enlarge the warm eye in the rendered temperature field');

// Hold the vortex fixed and move only the rainband. The outer infrared cloud
// must follow the spiral rather than retaining a filled circular canopy.
const bandRadius = 4;
const bandPhase = -system.hemisphere*0.75*Math.log(bandRadius+0.35);
const cloudBand = {phase:bandPhase,width:0.18,start:0.9,reach:4,curvature:0.75,strength:1};
const sampleBand = phase=>context.getCloudTemperature({...utility,
    simulatedSystems:[{...system,bands:[{...cloudBand,phase}]}]},
    bandRadius*system.rmwX,0,0);
assert.ok(sampleBand(bandPhase)<sampleBand(bandPhase+Math.PI)-10,
    'outer cloud bands must remain colder than the clear interband gaps');
