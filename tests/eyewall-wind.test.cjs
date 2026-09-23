const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('sim-mode-defs.js','utf8');
const c = {Math,Number,constrain:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('function radarClamp'),
    source.indexOf('// Every simulated imagery')),c);
// Expose the common base-scan geometry so the SAR peak-position regression
// can compare both products in the same normalized storm coordinates.
vm.runInContext(
    '\nglobalThis.getBaseScanWallAngle = simulatedBaseScanTextureAngle;'+
    '\nglobalThis.getWindRadii = simulatedEyewallRadii;',c
);
const storm = {radiusOfMaxWind:30,eyewallCycle:0.45};
const wind = r=>c.simulatedReplacementWindProfile(storm,r*30,0.62);
const outer = c.simulatedReplacementRadius(storm);
const samples=[];
for(let i=0;i<=600;i++){
    const radius=i/100;
    samples.push({radius,speed:wind(radius)});
}
const innerPeak=samples.filter(sample=>sample.radius>=0.80 && sample.radius<=1.20)
    .reduce((best,current)=>current.speed>best.speed ? current : best);
const outerPeak=samples.filter(sample=>sample.radius>=1.55 && sample.radius<=2.40)
    .reduce((best,current)=>current.speed>best.speed ? current : best);
const interWallMinimum=samples.filter(sample=>sample.radius>=1.25 && sample.radius<=1.50)
    .reduce((minimum,current)=>Math.min(minimum,current.speed),Infinity);
assert.ok(innerPeak.speed>interWallMinimum+0.03,
    'an active replacement must retain a distinct inner wind-speed peak');
assert.ok(outerPeak.speed>interWallMinimum+0.045,
    'the expanded outer RMW must rise above the inter-wall transition');
assert.ok(outerPeak.radius>innerPeak.radius+0.35 && outerPeak.radius>1.30,
    'the active replacement must move the dominant wind maximum outward');
assert.ok(wind(1.30)>0.70 && wind(1.60)>0.85,
    'the expanded circulation must remain broad through the transition');
assert.ok(wind(outer)>interWallMinimum+0.045,
    'the replacement RMW must not be separated by an artificial moat');
assert.ok(wind(outer+0.20)>outerPeak.speed*0.78,
    'wind outside the outer eye must taper gradually instead of dropping to background');
assert.ok(wind(outer+0.70)>outerPeak.speed*0.55,
    'the peripheral circulation must remain connected beyond the outer eyewall');
assert.equal(wind(0),0,'replacement must not create wind at the center');
let previous = outer;
for(let p=0.46;p<=1;p+=0.01){
    storm.eyewallCycle=p;
    let r=c.simulatedReplacementRadius(storm);
    assert.ok(r<=previous+1e-10,'outer wind ring contracts');
    previous=r;
}
for(let r=0;r<5;r+=0.03){
    storm.eyewallCycle=0.99999;
    let before=wind(r);
    storm.eyewallCycle=0;
    assert.ok(Math.abs(before-wind(r))<0.0001,'completion has no wind jump');
}
for(let p=0;p<=1;p+=0.02){
    storm.eyewallCycle=p;
    for(let r=0;r<6;r+=0.03)
        assert.ok(Number.isFinite(wind(r)) && wind(r)>=0 && wind(r)<=1.001,
            'profile stays finite and within the prescribed maximum wind');
}
console.log('ERC wind profile retains two peaks, expands the RMW, and keeps a connected outer tail.');

// A completed successful replacement has one outer eyewall, but its broad
// circulation must continue decaying outside that wall. Without this
// regression check the post-cycle SAR field collapses into an isolated ring.
const postReplacement = {
    radiusOfMaxWind:30,
    eyeType:0,
    eyeDiameter:6,
    eyewallCycle:0,
    eyewallReplacementMemory:0.24
};
const postSamples=[];
for(let i=0;i<=300;i++)
    postSamples.push(c.simulatedReplacementWindProfile(
        postReplacement,i*0.01*30,0.62,0,24
    ));
const postPeaks=[];
for(let i=1;i<postSamples.length-1;i++)
    if(postSamples[i]>=postSamples[i-1] &&
        postSamples[i]>=postSamples[i+1] && postSamples[i]>.35)
        postPeaks.push({radius:i*.01,speed:postSamples[i]});
const postWallAngle=c.simulatedBaseScanTextureAngle(
    postReplacement,0,1,24
);
const postRadii=c.simulatedEyewallRadii(
    postReplacement,postWallAngle,true,24
);
assert.ok(postPeaks.some(peak=>Math.abs(
    peak.radius-postRadii.windOuter
)<.12 && peak.speed>.65),
    'the post-replacement wind field must retain a dominant outer maximum');
assert.ok(!postPeaks.some(peak=>peak.radius<postRadii.windOuter-.25 &&
    peak.speed>.55),
    'a completed replacement must not retain an inner eyewall maximum');
const postWindAt = radius=>c.simulatedReplacementWindProfile(
    postReplacement,radius*postReplacement.radiusOfMaxWind,0.62,0,24
);
assert.ok(postWindAt(1.8)>.30 && postWindAt(2.5)>.20,
    'the post-replacement circulation must retain peripheral wind outside the outer wall');
console.log('Post-replacement SAR wind field has one outer wall and a peripheral wind tail.');

storm.eyewallCycle=0.45;
storm.visualSeed=1.4;
const peaks=[];
for(let i=0;i<48;i++){
    const angle=i*Math.PI*2/48;
    let best={speed:0,radius:0};
    for(let r=1.6;r<2.5;r+=0.01){
        const speed=c.simulatedReplacementWindProfile(storm,r*30,0.62,angle,24);
        if(speed>best.speed) best={speed,radius:r};
    }
    peaks.push(best);
}
assert.ok(Math.max(...peaks.map(p=>p.radius))-Math.min(...peaks.map(p=>p.radius))>0.2,
    'outer wind maximum must not follow a circular radius');
assert.ok(Math.max(...peaks.map(p=>p.speed))-Math.min(...peaks.map(p=>p.speed))>0.15,
    'outer ring must have broad stronger and weaker sectors');
for(let angle=0;angle<Math.PI*2;angle+=0.17){
    for(let radius=0;radius<120;radius+=3){
        const at=t=>c.simulatedReplacementWindProfile(storm,radius,0.62,angle,t);
        assert.ok(Math.abs(at(24.01)-at(24))<0.002,'structure evolves smoothly');
        assert.equal(at(24),at(24),'same simulation time is deterministic');
        assert.ok(at(24)>=0 && at(24)<=1,'azimuthal modulation stays bounded');
    }
}
console.log('SAR wind rings have noncircular geometry and evolving asymmetric sectors.');

// The clear-eye type belongs to the imagery mask, not to the physical SAR
// wind radius. A pinhole and a giant eye should therefore share the same
// migrated RMW instead of producing an eye-type-dependent inner ring.
const eyePeaks=[];
for(const eye of [
    {label:'pinhole',eyeType:0,eyeDiameter:6},
    {label:'medium',eyeType:2,eyeDiameter:30},
    {label:'giant',eyeType:4,eyeDiameter:100}
]){
    const aligned = {
        radiusOfMaxWind:30,
        eyeType:eye.eyeType,
        eyeDiameter:eye.eyeDiameter,
        eyewallCycle:0.45,
        eyewallOuterRadius:1.9,
        hemisphere:1,
        visualSeed:1.4
    };
    const angle=2.4;
    const tick=24;
    let best={radius:0,speed:-1};
    for(let radius=1;radius<=2.5;radius+=0.002){
        let speed=c.simulatedReplacementWindProfile(
            aligned,radius*aligned.radiusOfMaxWind,0.62,angle,tick
        );
        if(speed>best.speed) best={speed,radius};
    }
    eyePeaks.push(best);
    assert.ok(best.radius>1.25 && best.speed>.70,
        `${eye.label} SAR must retain the expanded circulation`);
}
assert.ok(Math.max(...eyePeaks.map(item=>item.radius))-
    Math.min(...eyePeaks.map(item=>item.radius))<0.08,
    'SAR RMW must not change with clear-eye category');
console.log('SAR uses one eye-type-independent, noncircular expanded RMW.');
