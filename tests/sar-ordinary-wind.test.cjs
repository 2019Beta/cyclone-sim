const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('function radarClamp');
const baseScanDefs = source.indexOf('ENV_DEFS.defaults.baseScan');
const sarStart = source.indexOf('const SIMULATED_SAR_WIND_MIN');
const end = source.indexOf('ENV_DEFS.defaults.clouds');
assert.ok(start>=0 && baseScanDefs>start && sarStart>baseScanDefs &&
    end>sarStart,'SAR wind model is present');

const context = {Math,Number,constrain:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(context);
vm.runInContext(source.slice(start,baseScanDefs)+
    source.slice(sarStart,end)+
    '\nglobalThis.getSarFade = simulatedSarWindOuterFade;'+
    '\nglobalThis.getSarTexture = simulatedSarSurfaceTexture;'+
    '\nglobalThis.getSarRadius = simulatedSarStormRelativeRadius;',context);

const system = {
    radiusOfMaxWind:30,
    visualSeed:1.4,
    hemisphere:1,
    shearFactor:0.35
};

const peaks = [];
for(let index=0;index<48;index++){
    const angle = index*Math.PI*2/48;
    let best = {radius:0,speed:-1};
    for(let radius=0.55;radius<1.55;radius+=0.005){
        const speed = context.simulatedReplacementWindProfile(
            system,radius*system.radiusOfMaxWind,0.62,angle,24
        );
        if(speed>best.speed) best={radius,speed};
    }
    peaks.push(best);
}

assert.ok(Math.max(...peaks.map(peak=>peak.radius))-
    Math.min(...peaks.map(peak=>peak.radius))>0.18,
    'ordinary SAR RMW must vary by sector instead of forming a concentric ring');
assert.ok(Math.max(...peaks.map(peak=>peak.speed))-
    Math.min(...peaks.map(peak=>peak.speed))>0.08,
    'ordinary SAR wind must retain broad sector asymmetry');
for(const peak of peaks)
    assert.ok(Number.isFinite(peak.speed) && peak.speed>=0 && peak.speed<=1,
        'ordinary SAR wind profile must stay bounded');

const utility = {simulatedSystems:[{x:0,y:0,rmwX:10,rmwY:10}]};
assert.equal(context.getSarRadius(utility,0,0),0,
    'SAR storm center must remain distinct from a missing descriptor');
assert.equal(context.getSarRadius({simulatedSystems:[]},0,0),undefined,
    'SAR texture should identify when no storm descriptor is available');
const equalRadiusTexture = [];
for(let index=0;index<24;index++){
    const angle = index*Math.PI*2/24;
    equalRadiusTexture.push(context.getSarTexture(
        Math.cos(angle)*40,Math.sin(angle)*40,24,4
    ));
    assert.ok(Math.abs(context.getSarRadius(
        utility,Math.cos(angle)*40,Math.sin(angle)*40
    )-4)<1e-12,'SAR background texture test points must share one radius');
}
assert.ok(Math.max(...equalRadiusTexture)-Math.min(...equalRadiusTexture)>0.035,
    'SAR far-field texture must vary independently of storm radius');
assert.equal(context.getSarFade(2.8),1,
    'SAR outer taper must leave the resolved circulation unchanged');
assert.ok(context.getSarFade(4.2)<1 && context.getSarFade(4.2)>0.3,
    'SAR outer taper must soften the distant cyclone tail');
assert.ok(context.getSarFade(5.6)<context.getSarFade(4.2),
    'SAR outer taper must change smoothly with distance');

console.log('Ordinary SAR wind field has deterministic sector asymmetry and a noncircular RMW.');
