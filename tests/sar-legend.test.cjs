const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js','utf8');

const labelStart = ui.indexOf('function stormImageryDrawScaleLabels');
const labelEnd = ui.indexOf('function stormImageryBdLegendLevels',labelStart);
assert.ok(labelStart>=0 && labelEnd>labelStart,
    'SAR scale-label renderer is present');

const drawnLabels = [];
let currentAlignment;
const labelContext = {
    LEFT: 'left',
    RIGHT: 'right',
    CENTER: 'center',
    TOP: 'top',
    COLORS: {UI:{text:'#fff'}},
    map:(value,start,end,outStart,outEnd)=>outStart+
        (value-start)/(end-start)*(outEnd-outStart),
    noStroke:()=>{},
    fill:()=>{},
    textSize:()=>{},
    textWidth:label=>String(label).length*5,
    textAlign:alignment=>{ currentAlignment = alignment; },
    text:(label,x)=>drawnLabels.push({label:String(label),x,
        alignment:currentAlignment})
};
vm.runInNewContext(
    ui.slice(labelStart,labelEnd)+
        '\nglobalThis.drawLabels = stormImageryDrawScaleLabels;',
    labelContext
);

const ticks = [0,17,34,54,75,95,115,136,155,170,210,270,330,400,440]
    .map(value=>({value,label:String(value)}));
labelContext.drawLabels(0,0,155,0,440,ticks);

assert.ok(drawnLabels.length<ticks.length,
    'dense SAR categories should be reduced to readable labels');
assert.equal(drawnLabels[0].label,'0',
    'the left endpoint of the SAR scale remains labeled');
assert.equal(drawnLabels.at(-1).label,'440',
    'the right endpoint of the SAR scale remains labeled');
for(let i=1;i<drawnLabels.length;i++){
    const previous = drawnLabels[i-1];
    const current = drawnLabels[i];
    const previousWidth = String(previous.label).length*5;
    const currentWidth = String(current.label).length*5;
    const previousRight = previous.alignment==='left' ? previous.x+
        previousWidth : previous.alignment==='right' ? previous.x :
        previous.x+previousWidth/2;
    const currentLeft = current.alignment==='left' ? current.x :
        current.alignment==='right' ? current.x-currentWidth :
        current.x-currentWidth/2;
    assert.ok(currentLeft>=previousRight+2,
        'visible SAR labels must not overlap');
}

const maxStart = ui.indexOf('function stormImagerySarMaxWindLabel');
const maxEnd = ui.indexOf('function renderStormSarOverlay',maxStart);
assert.ok(maxStart>=0 && maxEnd>maxStart,
    'SAR maximum-wind formatter is present');
const maxContext = {
    Math,
    Number,
    constrain:(value,minimum,maximum)=>Math.max(minimum,
        Math.min(maximum,value)),
    SIMULATED_SAR_WIND_MIN:0,
    SIMULATED_SAR_WIND_MAX:440,
    SIMULATED_SAR_KNOTS_PER_MS:1.943844
};
vm.runInNewContext(
    ui.slice(maxStart,maxEnd)+
        '\nglobalThis.formatMaxWind = stormImagerySarMaxWindLabel;',
    maxContext
);
assert.equal(maxContext.formatMaxWind(100),
    'Max Wind: 51 m/s · 100 knots');
assert.equal(maxContext.formatMaxWind(undefined),'Max Wind: --');

console.log('SAR max-wind readout and non-overlapping scale labels passed.');
