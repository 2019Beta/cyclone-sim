const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sim-mode-defs.js','utf8');
const start = source.indexOf('const SIMULATED_IR_BD_BT_MIN');
const end = source.indexOf('function simulatedIrBdColor');
assert.ok(start >= 0 && end > start,'IR-BD shade function is present');

const context = {
    Math,
    Number,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),
    map:(v,a,b,c,d,within)=>{
        const t = (v-a)/(b-a);
        return c+(d-c)*(within ? Math.max(0,Math.min(1,t)) : t);
    }
};
vm.runInNewContext(
    source.slice(start,end)+'\nglobalThis.getShade = simulatedIrBdShade;',
    context
);

const expectedOw = 109+(202-109)*(9-(-20))/(9-(-30));
const checks = [
    [25,0],
    [50,0],
    [40,0],
    [9,109],
    [-30,202],
    [-20,expectedOw],
    [-35,60],
    [-47,110],
    [-58,160],
    [-66,0],
    [-72,255],
    [-78,135],
    [-80,85],
    [-81,85],
    [-84,85],
    [-86,55],
    [-100,25]
];
for(const [temperature,expected] of checks){
    assert.ok(
        Math.abs(context.getShade(temperature)-expected)<1e-9,
        `unexpected IR-BD shade at ${temperature} C`
    );
}

console.log('Dvorak IR-BD shade thresholds verified.');

// The supplied GOES-18 BAND14-BD reference has two opposite continuous
// ramps, separated at +9 C, before the discrete cold-cloud enhancement.
for(let t=10;t<25;t++)
    assert.ok(context.getShade(t)>context.getShade(t+1),
        'warm pixels should brighten toward +9 C');
for(let t=-29;t<=9;t++)
    assert.ok(context.getShade(t-1)>context.getShade(t),
        'OW cloud tops should brighten toward -30 C');
assert.equal(context.getShade(NaN),0);
assert.equal(context.getShade(Infinity),0);
