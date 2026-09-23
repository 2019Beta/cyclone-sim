const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const end = source.indexOf('function simulatedIrBdTemperature');
assert.ok(start>=0 && end>start,'cloud temperature model is present');

const context = {
    Math,
    Number,
    TAU:Math.PI*2,
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
    ENABLE_SIMULATED_CLOUD_LAYER:false,
    SIMULATED_BASE_SCAN_BT_MIN:140,
    SIMULATED_BASE_SCAN_BT_MAX:300
};
vm.runInNewContext(
    source.slice(start,end)+'\nglobalThis.cloudTemperature = simulatedCloudTemperature;',
    context
);

const baseSystem = {
    x:300,
    y:250,
    rmwX:18,
    rmwY:18,
    outerRadius:4,
    shearOffset:1.4,
    shearAngle:0.8,
    phase:1.4,
    shearFactor:0.22,
    tropicalFactor:0.95,
    frontalFactor:0.05,
    frontAngle:0.8+Math.PI/2,
    strength:0.78,
    intensity:0.82,
    convectiveActivity:0.8,
    eyeFactor:0.72,
    eyeFillFactor:0,
    eyewallInnerWeight:1,
    eyewallOuterWeight:0,
    eyewallOuterRadius:1.55,
    eyewallFactor:0.84,
    eyewallCycle:0,
    eyewallFailure:0,
    bands:[
        {phase:0.2,strength:0.9,width:0.18,start:0.82,reach:3.7,curvature:0.75},
        {phase:2.4,strength:0.72,width:0.16,start:0.95,reach:3.1,curvature:0.9},
        {phase:4.3,strength:0.8,width:0.2,start:0.88,reach:4.1,curvature:0.62}
    ]
};

function statistics(values){
    const mean = values.reduce((sum,value)=>sum+value,0)/values.length;
    const variance = values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length;
    return {mean,standardDeviation:Math.sqrt(variance),range:Math.max(...values)-Math.min(...values)};
}

function sampleHemisphere(hemisphere){
    const system = {...baseSystem,hemisphere};
    const utility = {
        field(name){ return name==='moisture' ? 0.74 : 28; },
        simulatedSystems:[system],
        simulatedSystemsTick:12
    };
    return [0.8,1.05,1.35,1.8,2.5].map(radius=>{
        const values = [];
        for(let index=0;index<360;index++){
            const angle = index/360*Math.PI*2;
            values.push(context.cloudTemperature(
                utility,
                system.x+Math.cos(angle)*radius*system.rmwX,
                system.y+Math.sin(angle)*radius*system.rmwY,
                12
            ));
        }
        return statistics(values);
    });
}

const north = sampleHemisphere(1);
const south = sampleHemisphere(-1);
for(const [name,measurements] of [['north',north],['south',south]]){
    assert.ok(measurements.slice(1).every(item=>item.range>8),
        `${name} cloud field must not collapse into concentric temperature rings`);
    assert.ok(measurements.slice(1).every(item=>item.standardDeviation>1.8),
        `${name} cloud field should retain coherent azimuthal cloud-cell structure`);
}

const northSpread = north.reduce((sum,item)=>sum+item.standardDeviation,0)/north.length;
const southSpread = south.reduce((sum,item)=>sum+item.standardDeviation,0)/south.length;
const spreadRatio = northSpread/southSpread;
assert.ok(spreadRatio>0.65 && spreadRatio<1.54,
    'Northern and Southern Hemisphere imagery should have comparable texture density');

console.log('Cloud morphology is non-concentric and balanced across hemispheres.');

// Season age must not progressively wind coherent cloud cells into speckle.
for(const hemisphere of [1,-1]){
    for(const tick of [12,8760,50000]){
        const system = {...baseSystem,hemisphere};
        const utility = {
            field:name=>name==='moisture' ? 0.74 : 28,
            simulatedSystems:[system],simulatedSystemsTick:tick
        };
        let variation = 0;
        const count = 800;
        for(let i=0;i<count;i++){
            const radius = 0.8+i/count*2.8;
            const x = system.x+radius*system.rmwX;
            const y = system.y+0.3*system.rmwY;
            variation += Math.abs(context.cloudTemperature(utility,x+0.025,y,tick)-
                context.cloudTemperature(utility,x,y,tick));
        }
        assert.ok(variation/count<0.3,
            `Cloud texture must stay resolved at tick ${tick}, hemisphere ${hemisphere}: ${variation/count}`);
    }
}
