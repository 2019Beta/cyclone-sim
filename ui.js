class UI{
    constructor(parent,x,y,w,h,renderer,onclick,showing){
        if(parent instanceof UI){
            this.parent = parent;
            this.parent.children.push(this);
        }
        this.relX = x;
        this.relY = y;
        this.width = w;
        this.height = h;
        if(renderer instanceof Function) this.renderFunc = renderer;
        if(renderer instanceof Array){
            let [size, charLimit, enterFunc] = renderer;
            this.isInput = true;
            this.value = '';
            this.clickFunc = function(){
                // textInput.value = this.value;
                // if(charLimit) textInput.maxLength = charLimit;
                // else textInput.removeAttribute('maxlength');
                // textInput.focus();
                UI.inputData.value = this.value;
                UI.inputData.maxLength = charLimit;
                UI.inputData.cursor = UI.inputData.selectionStart = UI.inputData.selectionEnd = this.value.length;
                UI.focusedInput = this;
                if(onclick instanceof Function) onclick.call(this,UI.focusedInput===this);
            };
            this.textCanvas = createBuffer(this.width,this.height);
            this.renderFunc = function(s){
                s.input(size);
            };
            if(enterFunc) this.enterFunc = enterFunc;
        }else{
            this.clickFunc = onclick;
            this.isInput = false;
        }
        this.children = [];
        this.showing = showing===undefined ? true : showing;
        if(!this.parent) UI.elements.push(this);
    }

    getX(){
        if(this.parent) return this.parent.getX() + this.relX;
        return this.relX;
    }

    getY(){
        if(this.parent) return this.parent.getY() + this.relY;
        return this.relY;
    }

    render(){
        if(this.showing){
            translate(this.relX,this.relY);
            if(this.renderFunc) this.renderFunc(this.schematics());
            if(this.children.length===1){
                this.children[0].render();
            }else{
                for(let c of this.children){
                    push();
                    c.render();
                    pop();
                }
            }
        }
    }

    schematics(){
        let s = {};
        s.fullRect = ()=>{
            rect(0,0,this.width,this.height);
        };
        s.button = (txt,box,size,grey)=>{
            noStroke();
            if(box){
                fill(COLORS.UI.buttonBox);
                s.fullRect();
            }
            if(this.isHovered()){
                fill(COLORS.UI.buttonHover);
                s.fullRect();
            }
            if(grey) fill(COLORS.UI.greyText);
            else fill(COLORS.UI.text);
            textAlign(CENTER,CENTER);
            textSize(size || 18);
            text(txt,this.width/2,this.height/2);
        };
        s.input = (size)=>{
            fill(COLORS.UI.input);
            if(UI.focusedInput===this) stroke(COLORS.UI.text);
            else{
                if(this.isHovered()){
                    noStroke();
                    s.fullRect();
                    fill(COLORS.UI.buttonHover);
                }
                stroke(COLORS.UI.nonSelectedInput);
            }
            s.fullRect();
            let c = this.textCanvas;
            c.clear();
            c.noStroke();
            c.fill(COLORS.UI.text);
            c.textSize(size || 18);
            let t = UI.focusedInput===this ? /* textInput */UI.inputData.value : this.value;
            let xAnchor;
            if(UI.focusedInput===this){
                c.textAlign(LEFT,CENTER);
                let caret1X = c.textWidth(t.slice(0,/* textInput */UI.inputData.selectionStart));
                let caret2X = c.textWidth(t.slice(0,/* textInput */UI.inputData.selectionEnd));
                if(caret2X>this.width-5) xAnchor = this.width-5-caret2X;
                else xAnchor = 5;
                caret1X += xAnchor;
                caret2X += xAnchor;
                c.text(t,xAnchor,this.height/2);
                if(/* textInput */UI.inputData.selectionStart === /* textInput */UI.inputData.selectionEnd){
                    c.stroke(COLORS.UI.text);
                    c.noFill();
                    if(millis()%1000<500) c.line(caret1X,this.height/8,caret1X,7*this.height/8);
                }else{
                    c.rect(caret1X,this.height/8,caret2X-caret1X,3*this.height/4);
                    c.fill(COLORS.UI.input);
                    c.text(t.slice(/* textInput */UI.inputData.selectionStart, /* textInput */UI.inputData.selectionEnd), caret1X, this.height / 2);
                }
            }else{
                if(c.textWidth(t)>this.width-5){
                    c.textAlign(RIGHT,CENTER);
                    xAnchor = this.width-5;
                }else{
                    c.textAlign(LEFT,CENTER);
                    xAnchor = 5;
                }
                c.text(t,xAnchor,this.height/2);
            }
            image(c, 0, 0, this.width, this.height);
        };
        return s;
    }

    setBox(x,y,w,h){    // Should be used inside of the renderer function
        if(x===undefined) x = this.relX;
        if(y===undefined) y = this.relY;
        if(w===undefined) w = this.width;
        if(h===undefined) h = this.height;
        translate(x-this.relX,y-this.relY);
        this.relX = x;
        this.relY = y;
        this.width = w;
        this.height = h;
    }

    append(chain,...opts){
        if(chain!==false && this.children.length>chain) return this.children[chain].append(0,...opts);
        return new UI(this,...opts);
    }

    checkMouseOver(){
        if(this.showing){
            if(this.children.length>0){
                let cmo = null;
                for(let i=this.children.length-1;i>=0;i--){
                    cmo = this.children[i].checkMouseOver();
                    if(cmo) return cmo;
                }
            }
            let left = this.getX();
            let right = left + this.width;
            let top = this.getY();
            let bottom = top + this.height;
            if(this.clickFunc && getMouseX()>=left && getMouseX()<right && getMouseY()>=top && getMouseY()<bottom) return this;
        }
        return null;
    }

    isHovered(){
        return UI.mouseOver===this;     // onclick parameter in constructor is required in order for hovering to work; use any truthy non-function value if clicking the UI does nothing
    }

    clicked(){
        if(this.clickFunc instanceof Function) this.clickFunc();
    }

    show(){
        this.showing = true;
    }

    hide(){
        this.showing = false;
    }

    toggleShow(){
        this.showing = !this.showing;
    }

    remove(){
        let mouseIsHere = false;
        if(this.checkMouseOver()){
            UI.mouseOver = undefined;
            mouseIsHere = true;
        }
        if(this.parent){
            for(let i=this.parent.children.length-1;i>=0;i--){
                if(this.parent.children[i]===this){
                    this.parent.children.splice(i,1);
                    break;
                }
            }
        }else{
            for(let i=UI.elements.length-1;i>=0;i--){
                if(UI.elements[i]===this){
                    UI.elements.splice(i,1);
                    break;
                }
            }
        }
        if(mouseIsHere) UI.updateMouseOver();
    }

    dropChildren(){
        let mouseIsHere = false;
        if(this.checkMouseOver()){
            UI.mouseOver = undefined;
            mouseIsHere = true;
        }
        this.children = [];
        if(mouseIsHere) UI.updateMouseOver();
    }
}

UI.elements = [];

function layerLegendColor(field,value){
    let c;
    if(field.hueMap instanceof Function){
        c = field.hueMap(value);
        colorMode(RGB);
    }else if(field.hueMap instanceof Array){
        let h = field.hueMap;
        colorMode(HSB);
        c = color(map(value,h[0],h[1],h[2],h[3],true),100,100);
        colorMode(RGB);
    }else c = COLORS.UI.text;
    return c;
}

function layerLegendValue(field,legend,value,index){
    if(legend.labels instanceof Array && legend.labels[index]!==undefined)
        return legend.labels[index];
    if(legend.valueFormat instanceof Function)
        return legend.valueFormat(value);
    return field.displayFormat(value);
}

function renderEnvLayerLegend(){
    if(!simSettings.showLayerLegends || !(UI.viewBasin instanceof Basin) || UI.viewBasin.env.displaying<0) return;

    let basin = UI.viewBasin;
    let fieldName = basin.env.fieldList[basin.env.displaying];
    let field = basin.env.fields[fieldName];
    if(!field) return;

    let legend = field.legend || {};
    let legendType = legend.type || (field.contourInterval ? 'contour' :
        field.isVectorField && !field.vectorColorFill ? 'vector' : 'gradient');

    let x = 8;
    let width = 256;
    let height = 64;
    let y = HEIGHT-30-height-6;
    let left = x+8;
    let barY = y+24;
    let barWidth = width-16;
    let barHeight = 11;

    push();
    noStroke();
    fill(COLORS.UI.box);
    rect(x,y,width,height);
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(11);
    text(legend.title || field.displayName,left,y+5);

    if(legendType==='vector'){
        let sampleValue = legend.sampleValue===undefined ?
            ((field.magMap && field.magMap[0] || 0)+(field.magMap && field.magMap[1] || 1))/2 : legend.sampleValue;
        let magMap = field.magMap || [0,1,6,22];
        let arrowLength = constrain(map(sampleValue,magMap[0],magMap[1],magMap[2],magMap[3],true),12,52);
        let arrowX = left+8;
        let arrowY = barY+7;
        let arrowColor = layerLegendColor(field,sampleValue);
        stroke(arrowColor);
        strokeWeight(2);
        line(arrowX,arrowY,arrowX+arrowLength,arrowY);
        noStroke();
        fill(arrowColor);
        triangle(arrowX+arrowLength+5,arrowY,arrowX+arrowLength,arrowY-3,arrowX+arrowLength,arrowY+3);
        fill(COLORS.UI.text);
        textAlign(LEFT,CENTER);
        text(legend.valueFormat instanceof Function ? legend.valueFormat(sampleValue) : sampleValue,arrowX+arrowLength+14,arrowY);
    }else if(legendType==='contour'){
        let lineY = barY+7;
        stroke(255);
        strokeWeight(3);
        line(left,lineY,left+36,lineY);
        stroke(COLORS.UI.text);
        strokeWeight(1.4);
        line(left,lineY,left+36,lineY);
        noStroke();
        fill(COLORS.UI.text);
        textAlign(LEFT,CENTER);
        let interval = field.contourInterval;
        let labelInterval = field.contourLabelInterval || interval;
        let description = legend.description || interval + ' hPa contours · labels every ' + labelInterval + ' hPa';
        text(description,left+50,lineY);
    }else{
        let range = legend.range || [0,1];
        let minimum = range[0];
        let maximum = range[1];
        let ticks = legend.ticks instanceof Array && legend.ticks.length ? legend.ticks : [minimum,maximum];
        for(let i=0;i<barWidth;i++){
            let value = map(i,0,barWidth-1,minimum,maximum);
            fill(layerLegendColor(field,value));
            rect(left+i,barY,1,barHeight);
        }
        noFill();
        stroke(COLORS.UI.text);
        strokeWeight(1);
        rect(left,barY,barWidth,barHeight);
        textSize(9);
        for(let i=0;i<ticks.length;i++){
            let value = ticks[i];
            let tickX = map(value,minimum,maximum,left,left+barWidth,true);
            line(tickX,barY+barHeight,tickX,barY+barHeight+3);
            noStroke();
            fill(COLORS.UI.text);
            if(i===0){
                textAlign(LEFT,TOP);
                text(layerLegendValue(field,legend,value,i),tickX,barY+barHeight+5);
            }else if(i===ticks.length-1){
                textAlign(RIGHT,TOP);
                text(layerLegendValue(field,legend,value,i),tickX,barY+barHeight+5);
            }else{
                textAlign(CENTER,TOP);
                text(layerLegendValue(field,legend,value,i),tickX,barY+barHeight+5);
            }
            stroke(COLORS.UI.text);
        }
    }
    pop();
}

UI.renderAll = function(){
    for(let u of UI.elements){
        push();
        u.render();
        pop();
    }
};

UI.mouseOver = undefined;
UI.focusedInput = undefined;
UI.inputData = {
    value: '',
    cursor: 0,
    selectionStart: 0,
    selectionEnd: 0,
    maxLength: undefined,
    insert: ''
};

UI.setInputCursorPosition = function(i, isSelecting){
    let anchor;
    if(UI.inputData.cursor === UI.inputData.selectionEnd)
        anchor = UI.inputData.selectionStart;
    else
        anchor = UI.inputData.selectionEnd;
    UI.inputData.cursor = i;
    if(isSelecting){
        UI.inputData.selectionStart = Math.min(i, anchor);
        UI.inputData.selectionEnd = Math.max(i, anchor);
    }else{
        UI.inputData.selectionStart = i;
        UI.inputData.selectionEnd = i;
    }
};

UI.updateMouseOver = function(){
    updateObservationBuoyCloseButton();
    for(let i=UI.elements.length-1;i>=0;i--){
        let u = UI.elements[i];
        let mo = u.checkMouseOver();
        if(mo){
            UI.mouseOver = mo;
            return mo;
        }
    }
    UI.mouseOver = null;
    return null;
};

UI.click = function(){
    UI.updateMouseOver();
    if(UI.mouseOver === UI.focusedInput)
        return false;
    else if(UI.focusedInput){
        UI.focusedInput.value = UI.inputData.value;
        UI.focusedInput = undefined;
    }
    if(UI.mouseOver){
        UI.mouseOver.clicked();
        return true;
    }
    return false;
};

UI.viewBasin = undefined;
// UI.viewTick = undefined;

let panel_timeline_container;
let stormImageryPanel;
let stormImageryRaster;
let stormImageryRasterBasin;
let stormImageryRasterStorm;
let stormImageryRasterTick;
let stormImageryRasterTab;
let stormImageryRasterSize;
let stormImageryRasterExtent;
let stormImageryRasterSarMaxWind;
// Clouds and IR-BD use the same simulated cloud-top temperature field. Keep
// that scalar field separate from the tab-specific color raster so switching
// between the two products only recolors pixels instead of re-running the
// multi-scale cloud model.
let stormImageryCloudTemperatureCache;
let stormImageryTab = 'clouds';
let stormImageryHighDefinition = false;
let stormPolarCloudRaster;
let stormPolarIrBdRaster;
let stormPolarBaseScanRaster;
let stormPolarSarRaster;
let stormPolarSatelliteRenderJob;
let stormPolarCloudTemperatureCache;
let stormPolarRasterState = {
    clouds: {basin:undefined,storm:undefined,tick:undefined,extent:undefined,rendered:false,maxWind:undefined},
    irBd: {basin:undefined,storm:undefined,tick:undefined,extent:undefined,rendered:false,maxWind:undefined},
    baseScan: {basin:undefined,storm:undefined,tick:undefined,extent:undefined,rendered:false,maxWind:undefined},
    sar: {basin:undefined,storm:undefined,tick:undefined,extent:undefined,rendered:false,maxWind:undefined}
};
let stormImageryCloudsTab;
let stormImageryIrBdTab;
let stormImageryBaseScanTab;
let stormImagerySarTab;
let polarSatellitePanel;
let polarSatelliteTab = 'clouds';
let polarSatelliteOpen = false;
let polarSatelliteSnapshot;
let polarSatelliteCloudsTab;
let polarSatelliteIrBdTab;
let polarSatelliteBaseScanTab;
let polarSatelliteSarTab;
const STORM_IMAGERY_PANEL_WIDTH = 340;
const STORM_IMAGERY_PANEL_HEIGHT = 470;
const STORM_IMAGERY_RASTER_SIZE = 160;
const STORM_IMAGERY_BASE_SCAN_RASTER_SIZE = 160;
const STORM_IMAGERY_SAR_RASTER_SIZE = 128;
// Keep the observation raster dimensions fixed. Compact tropical cyclones
// instead receive a tighter geographic crop so more of those same pixels
// describe the eye and eyewall.
const STORM_IMAGERY_DEFAULT_MIN_EXTENT = 42;
const STORM_IMAGERY_COMPACT_MIN_EXTENT = 30;
const STORM_IMAGERY_SAR_DEFAULT_MIN_EXTENT = 52;
const STORM_IMAGERY_SAR_COMPACT_MIN_EXTENT = 38;
const STORM_IMAGERY_COMPACT_RMW_MIN = 2.5;
const STORM_IMAGERY_COMPACT_RMW_MAX = 8;
const STORM_POLAR_SATELLITE_TABS = ['clouds','irBd','baseScan','sar'];
// Keep each frame responsive while a 512px product is sampled. The budget is
// deliberately small because the field model is more expensive than the
// later color upload; the panel can show progress while the task continues.
const STORM_POLAR_RENDER_FRAME_BUDGET_MS = 8;
// All phases yield after their time budget, rather than limiting cheap rows.
// The ordinary panel keeps a light raster for continuous map interaction.
// The polar-satellite action intentionally renders a larger product on demand
// and caches it so each page remains crisp after it has been opened.
const STORM_POLAR_SATELLITE_RASTER_SIZE = 512;

function stormImageryIsTropicalType(type){
    return type===TROP || type===SUBTROP || type===MONSOON;
}

function stormImageryMinimumExtent(descriptor,data,isSar){
    let defaultExtent = isSar ? STORM_IMAGERY_SAR_DEFAULT_MIN_EXTENT :
        STORM_IMAGERY_DEFAULT_MIN_EXTENT;
    let compactExtent = isSar ? STORM_IMAGERY_SAR_COMPACT_MIN_EXTENT :
        STORM_IMAGERY_COMPACT_MIN_EXTENT;
    if(!descriptor) return defaultExtent;

    let type = Number.isFinite(descriptor.type) ? descriptor.type :
        data && Number.isFinite(data.type) ? data.type : undefined;
    if(!stormImageryIsTropicalType(type)) return defaultExtent;

    let rmwValues = [];
    if(Number.isFinite(descriptor.rmwX)) rmwValues.push(descriptor.rmwX);
    if(Number.isFinite(descriptor.rmwY)) rmwValues.push(descriptor.rmwY);
    if(!rmwValues.length) return defaultExtent;

    // Blend continuously from the compact-storm zoom to the legacy framing.
    // This avoids a visible jump when a storm grows through the threshold.
    let rmw = Math.max(...rmwValues);
    let compactness = (STORM_IMAGERY_COMPACT_RMW_MAX-rmw)/
        (STORM_IMAGERY_COMPACT_RMW_MAX-STORM_IMAGERY_COMPACT_RMW_MIN);
    compactness = Math.max(0,Math.min(1,compactness));
    return defaultExtent-(defaultExtent-compactExtent)*compactness;
}

function stormImageryTabEnabled(tab){
    if(tab==='sar') return true;
    let setting;
    if(tab==='baseScan') return true;
    else if(tab==='clouds' || tab==='irBd') setting = simSettings.showCloudsTab;
    else return false;
    // Undefined means the setting is still loading (or comes from an older
    // save), so preserve the original enabled-by-default behavior. The
    // explicit boolean/numeric false values both disable the tab.
    return setting===undefined ? true : !!setting;
}

function stormImageryPanelEnabled(){
    let setting = simSettings && simSettings.showScanTab;
    return setting===undefined ? true : !!setting;
}

const POLAR_SATELLITE_INTERVAL_TICKS = ADVISORY_TICKS;

function stormImageryVisibleTabs(){
    return ['clouds','irBd','baseScan','sar'];
}

function normalizeStormImageryTab(){
    let visibleTabs = stormImageryVisibleTabs();
    if(visibleTabs.includes(stormImageryTab) &&
        stormImageryTabEnabled(stormImageryTab)) return;
    for(let tab of visibleTabs){
        if(stormImageryTabEnabled(tab)){
            stormImageryTab = tab;
            return;
        }
    }
}

function updateStormImageryTabs(){
    normalizeStormImageryTab();
    let entries = [
        ['clouds',stormImageryCloudsTab],
        ['irBd',stormImageryIrBdTab],
        ['baseScan',stormImageryBaseScanTab],
        ['sar',stormImagerySarTab]
    ];
    let visibleTabs = stormImageryVisibleTabs();
    let visible = entries.filter(entry=>entry[1] &&
        visibleTabs.includes(entry[0]) && stormImageryTabEnabled(entry[0]));
    if(visible.length){
        let gap = 4;
        let tabWidth = (STORM_IMAGERY_PANEL_WIDTH-16-gap*(visible.length-1))/visible.length;
        for(let entry of entries){
            let tab = entry[1];
            if(!tab) continue;
            let index = visible.findIndex(item=>item[1]===tab);
            if(index<0){
                tab.hide();
                continue;
            }
            tab.relX = 8+index*(tabWidth+gap);
            tab.width = tabWidth;
            tab.show();
        }
    }
    updateStormImageryPanel();
}

function stormImageryIsAvailable(storm){
    return storm instanceof Storm && storm.current instanceof ActiveSystem &&
        UI.viewBasin instanceof Basin && UI.viewBasin.viewingPresent() &&
        storm.basin===UI.viewBasin;
}

function resetStormPolarSatelliteRasters(){
    stormPolarSatelliteRenderJob = undefined;
    stormPolarCloudTemperatureCache = undefined;
    stormPolarRasterState = {};
    for(let tab of STORM_POLAR_SATELLITE_TABS)
        stormPolarRasterState[tab] = {
            basin: undefined,
            storm: undefined,
            tick: undefined,
            extent: undefined,
            rendered: false,
            maxWind: undefined
        };
}

function ensureStormPolarSatelliteRaster(tab){
    if(tab==='irBd'){
        if(!stormPolarIrBdRaster ||
            stormPolarIrBdRaster.width!==STORM_POLAR_SATELLITE_RASTER_SIZE ||
            stormPolarIrBdRaster.height!==STORM_POLAR_SATELLITE_RASTER_SIZE)
            stormPolarIrBdRaster = createImage(STORM_POLAR_SATELLITE_RASTER_SIZE,
                STORM_POLAR_SATELLITE_RASTER_SIZE);
        return stormPolarIrBdRaster;
    }
    if(tab==='baseScan'){
        if(!stormPolarBaseScanRaster ||
            stormPolarBaseScanRaster.width!==STORM_POLAR_SATELLITE_RASTER_SIZE ||
            stormPolarBaseScanRaster.height!==STORM_POLAR_SATELLITE_RASTER_SIZE)
            stormPolarBaseScanRaster = createImage(STORM_POLAR_SATELLITE_RASTER_SIZE,
                STORM_POLAR_SATELLITE_RASTER_SIZE);
        return stormPolarBaseScanRaster;
    }
    if(tab==='sar'){
        if(!stormPolarSarRaster ||
            stormPolarSarRaster.width!==STORM_POLAR_SATELLITE_RASTER_SIZE ||
            stormPolarSarRaster.height!==STORM_POLAR_SATELLITE_RASTER_SIZE)
            stormPolarSarRaster = createImage(STORM_POLAR_SATELLITE_RASTER_SIZE,
                STORM_POLAR_SATELLITE_RASTER_SIZE);
        return stormPolarSarRaster;
    }
    if(!stormPolarCloudRaster ||
        stormPolarCloudRaster.width!==STORM_POLAR_SATELLITE_RASTER_SIZE ||
        stormPolarCloudRaster.height!==STORM_POLAR_SATELLITE_RASTER_SIZE)
        stormPolarCloudRaster = createImage(STORM_POLAR_SATELLITE_RASTER_SIZE,
            STORM_POLAR_SATELLITE_RASTER_SIZE);
    return stormPolarCloudRaster;
}

function stormPolarSatelliteRasterNeedsUpdate(tab,basin,storm,tick,extent){
    let state = stormPolarRasterState[tab];
    return !state || !state.rendered || state.basin!==basin ||
        state.storm!==storm || state.tick!==tick || state.extent!==extent;
}

function stormPolarSatelliteEyeCenter(system){
    if(!system || !Number.isFinite(system.x) || !Number.isFinite(system.y))
        return undefined;

    // The infrared cloud-top field places the apparent eye downshear. Keep
    // this helper as the single source for the Polar product's eye location so
    // the eye-temperature readout samples the same feature that is rendered.
    let shearAngle = Number.isFinite(system.shearAngle) ? system.shearAngle : 0;
    let shearOffset = Number.isFinite(system.shearOffset) ?
        system.shearOffset*1.8 : 0;
    return {
        x: system.x+Math.cos(shearAngle)*shearOffset,
        y: system.y+Math.sin(shearAngle)*shearOffset
    };
}

function stormPolarSatelliteEyeCoverage(system,x,y,z){
    if(!system || !Number.isFinite(system.x) || !Number.isFinite(system.y) ||
        !Number.isFinite(system.rmwX) || !Number.isFinite(system.rmwY) ||
        system.rmwX<=0 || system.rmwY<=0) return 0;

    let eyeCenter = stormPolarSatelliteEyeCenter(system);
    if(!eyeCenter) return 0;
    let dx = (x-eyeCenter.x)/system.rmwX;
    let dy = (y-eyeCenter.y)/system.rmwY;
    let radius = Math.hypot(dx,dy);
    if(radius>2.8) return 0;

    let phase = Number.isFinite(system.phase) ? system.phase : 0;
    let hemisphere = system.hemisphere<0 ? -1 : 1;
    let angle = Math.atan2(dy,dx);
    let spiralAngle = angle+hemisphere*(
        -0.72*Math.log(radius+0.38)+z*0.016+
        0.45*Math.sin(z*0.016)/(1+radius*0.16)
    );
    let tx = radius*Math.cos(spiralAngle);
    let ty = radius*Math.sin(spiralAngle);
    let broad = typeof radarEvolvingNoise==='function' ?
        radarEvolvingNoise(tx*0.95,ty*0.95,z,phase) : 0.5;
    let cells = typeof radarEvolvingNoise==='function' ?
        radarEvolvingNoise(tx*3.6,ty*3.6,z,phase+8.3) : 0.5;
    // Match the slight non-circularity and softened boundary of the ordinary
    // cloud product so switching to Polar HD does not reintroduce a perfect
    // geometric hole.
    let eyeShape = 1+
        0.055*(broad-0.5)+
        0.035*(cells-0.5)+
        0.025*Math.sin(2*spiralAngle+phase)+
        0.018*Math.sin(3*spiralAngle-phase);
    let warpedRadius = radius/Math.max(0.84,eyeShape);

    let intensity = typeof simulatedIntensityLevel==='function' ?
        simulatedIntensityLevel(system) :
        Math.max(0,Math.min(1,Number.isFinite(system.intensity) ?
            system.intensity : Number.isFinite(system.strength) ? system.strength : 0));
    let eyeScale = typeof simulatedCloudEyeScale==='function' ?
        simulatedCloudEyeScale(system) : 0.58;
    let innerWeight = Number.isFinite(system.eyewallInnerWeight) ?
        Math.max(0,Math.min(1,system.eyewallInnerWeight)) : 1;
    let outerWeight = Number.isFinite(system.eyewallOuterWeight) ?
        Math.max(0,Math.min(1,system.eyewallOuterWeight)) : 0;
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        Number.isFinite(system.eyewallFailure) ?
            Math.max(0,Math.min(1,system.eyewallFailure)) : 0;
    let outerEyeRadius = Number.isFinite(system.eyewallOuterRadius) ?
        system.eyewallOuterRadius : 1.55;
    let innerRadius = (0.58-0.06*intensity)*eyeScale;
    let outerRadius = (0.61-0.05*intensity)*
        Math.min(1.3+0.7*failure,outerEyeRadius)*eyeScale;
    if(innerRadius<=0 || outerRadius<=0) return 0;

    // Share the bounded clear-eye response with the ordinary cloud and
    // microwave products. The outer wall remains available for the HD
    // product's double-eyewall texture, but it cannot turn the whole moat into
    // a giant clear eye or disappear at the cycle boundary.
    if(typeof simulatedReplacementEyeCoverage==='function')
        return simulatedReplacementEyeCoverage(
            system,warpedRadius,innerRadius,outerRadius
        );
    // Keep a compatibility fallback for an older standalone UI bundle.
    let coverage = innerWeight*Math.exp(-Math.pow(
        warpedRadius/innerRadius,3.2
    ))+
        outerWeight*Math.exp(-Math.pow(warpedRadius/outerRadius,3.2));
    return Math.max(0,Math.min(1,coverage));
}

function stormPolarSatelliteEyeClearance(utility,x,y,z,temperature){
    if(!Number.isFinite(temperature)) return temperature;
    let systems = utility && Array.isArray(utility.simulatedSystems) ?
        utility.simulatedSystems : [];
    let enhancedTemperature = temperature;
    for(let system of systems){
        let eyeFillFactor = Number.isFinite(system.eyeFillFactor) ?
            Math.max(0,Math.min(1,system.eyeFillFactor)) : 0;
        let eyewallFailure = typeof simulatedEyewallFailureLevel==='function' ?
            simulatedEyewallFailureLevel(system) :
            Number.isFinite(system.eyewallFailure) ?
                Math.max(0,Math.min(1,system.eyewallFailure)) : 0;
        let eyeStructureAvailability = (1-0.92*eyeFillFactor)*
            (1-0.65*eyewallFailure);
        let visibility = typeof simulatedEyeVisibilityFactor==='function' ?
            simulatedEyeVisibilityFactor(system) :
            Math.max(0,Math.min(1,(Number.isFinite(system.eyeFactor) ?
                system.eyeFactor : 0)*eyeStructureAvailability));
        if(visibility<=0) continue;

        let coverage = stormPolarSatelliteEyeCoverage(system,x,y,z);
        if(coverage<=0) continue;

        let eyeTemperatureTarget;
        let clearTemperature;
        if(typeof simulatedEyeTemperatureTarget==='function'){
            let sst = utility && typeof utility.field==='function' ?
                utility.field('SST',x,y,z) : 26;
            if(!Number.isFinite(sst)) sst = 26;
            let clearMinimum = typeof SIMULATED_CLOUD_CLEAR_BT_MIN==='number' ?
                SIMULATED_CLOUD_CLEAR_BT_MIN : -2;
            let clearMaximum = typeof SIMULATED_CLOUD_CLEAR_BT_MAX==='number' ?
                SIMULATED_CLOUD_CLEAR_BT_MAX : 50;
            clearTemperature = Math.max(clearMinimum,Math.min(
                clearMaximum,sst-1
            ));
            eyeTemperatureTarget = simulatedEyeTemperatureTarget(
                system,clearTemperature
            );
        }else{
            let sst = utility && typeof utility.field==='function' ?
                utility.field('SST',x,y,z) : 26;
            if(!Number.isFinite(sst)) sst = 26;
            clearTemperature = sst-1;
        }

        let eyewallMaturity = Number.isFinite(system.eyewallFactor) ?
            Math.max(0,Math.min(1,system.eyewallFactor)) : visibility;
        // A polar footprint resolves the clear center more completely than
        // the ordinary cloud raster, but the gain remains proportional to a
        // real eye and grows with eyewall organization. Closed/failed eyes
        // therefore keep the same modeled cloud filling.
        let resolutionGain = (0.12+0.18*eyewallMaturity)*
            eyeStructureAvailability;
        let highResolutionVisibility = Math.min(1,
            visibility*(1+resolutionGain));
        let ordinaryEye = Math.pow(Math.max(0,1-visibility*coverage),1.15);
        let polarEye = Math.pow(Math.max(0,
            1-highResolutionVisibility*coverage),1.15);
        let relativeClearance = ordinaryEye>1e-6 ?
            Math.max(0,Math.min(1,1-polarEye/ordinaryEye)) : 0;
        // Preserve some cloud-top texture in the center. The satellite
        // product should show a clearer eye, not replace the simulated field
        // with an artificially uniform warm disk.
        let resolvedClearance = relativeClearance*
            (0.58+0.22*eyewallMaturity)*eyeStructureAvailability;
        // Polar resolution may expose more of the clear eye. Move toward the
        // same local SST/radiative target used by the underlying cloud field
        // so warm-water eyes share its empirical 28 C ceiling.
        let clearanceTarget = Number.isFinite(eyeTemperatureTarget) ?
            eyeTemperatureTarget : Number.isFinite(clearTemperature) ?
                clearTemperature : 25;
        enhancedTemperature += (clearanceTarget-enhancedTemperature)*
            resolvedClearance;
        // Keep the high-resolution eye on the same target as the ordinary
        // cloud field inside the eye core only; surrounding clear sky keeps
        // its normal surface-window temperature.
        if(Number.isFinite(eyeTemperatureTarget)){
            let eyeCore = coverage*coverage;
            enhancedTemperature = enhancedTemperature*(1-eyeCore)+
                Math.min(enhancedTemperature,eyeTemperatureTarget)*eyeCore;
        }
    }
    let minimumTemperature = typeof SIMULATED_CLOUD_BT_MIN==='number' ?
        SIMULATED_CLOUD_BT_MIN : -100;
    let maximumTemperature = typeof SIMULATED_CLOUD_BT_MAX==='number' ?
        SIMULATED_CLOUD_BT_MAX : 50;
    return Math.max(minimumTemperature,
        Math.min(maximumTemperature,enhancedTemperature));
}

function stormPolarSatelliteDenoiseProfile(tab){
    // These are value-domain thresholds, not blur radii. A small local blend
    // attenuates pixel noise, while the edge threshold rejects neighbors on
    // the other side of an eye/eyewall or wind-field gradient.
    if(tab==='sar') return {
        impulse:3.2,
        edge:14,
        localBlend:0.22,
        outlierBlend:0.78
    };
    if(tab==='baseScan') return {
        impulse:7,
        edge:24,
        localBlend:0.24,
        outlierBlend:0.80
    };
    if(tab==='irBd') return {
        impulse:4.5,
        edge:11,
        localBlend:0.16,
        outlierBlend:0.72
    };
    return {
        impulse:3.2,
        edge:15,
        localBlend:0.24,
        outlierBlend:0.80
    };
}

function stormPolarSatelliteDenoiseValues(values,width,height,tab,
    startRow=0,endRow=height,source){
    let profile = stormPolarSatelliteDenoiseProfile(tab);
    if(!source) source = new Float32Array(values);
    startRow = Math.max(0,Math.min(height,startRow));
    endRow = Math.max(startRow,Math.min(height,endRow));
    let spatialWeights = [1,2,1,2,4,2,1,2,1];
    let neighbors = new Float64Array(9);
    for(let row=startRow;row<endRow;row++){
        for(let col=0;col<width;col++){
            let index = row*width+col;
            let center = source[index];
            let neighborCount = 0;
            for(let dy=-1;dy<=1;dy++){
                let sourceRow = Math.max(0,Math.min(height-1,row+dy));
                for(let dx=-1;dx<=1;dx++){
                    let sourceCol = Math.max(0,Math.min(width-1,col+dx));
                    let value = source[sourceRow*width+sourceCol];
                    if(Number.isFinite(value)) neighbors[neighborCount++] = value;
                }
            }
            if(!neighborCount){
                values[index] = center;
                continue;
            }

            // Missing samples are filled from the nearest local field, while
            // finite samples retain their original edge-aware treatment.
            if(!Number.isFinite(center)){
                let total = 0;
                for(let i=0;i<neighborCount;i++) total += neighbors[i];
                values[index] = total/neighborCount;
                continue;
            }

            // Reuse nine slots instead of allocating/sorting arrays per pixel.
            for(let i=1;i<neighborCount;i++){
                let value = neighbors[i];
                let j = i-1;
                while(j>=0 && neighbors[j]>value){
                    neighbors[j+1] = neighbors[j];
                    j--;
                }
                neighbors[j+1] = value;
            }
            let median = neighbors[Math.floor(neighborCount/2)];
            let medianDistance = Math.abs(center-median);
            let total = center*4;
            let totalWeight = 4;
            let neighborIndex = 0;
            for(let dy=-1;dy<=1;dy++){
                let sourceRow = Math.max(0,Math.min(height-1,row+dy));
                for(let dx=-1;dx<=1;dx++){
                    let sourceCol = Math.max(0,Math.min(width-1,col+dx));
                    let value = source[sourceRow*width+sourceCol];
                    let spatialWeight = spatialWeights[neighborIndex++];
                    if(!Number.isFinite(value) ||
                        (dx===0 && dy===0)) continue;
                    let difference = Math.abs(value-center);
                    // Gaussian range weighting keeps small texture changes
                    // but quickly removes cross-edge influence.
                    let rangeWeight = Math.exp(-Math.pow(
                        difference/profile.edge,2
                    ));
                    total += value*spatialWeight*rangeWeight;
                    totalWeight += spatialWeight*rangeWeight;
                }
            }
            let local = total/totalWeight;
            let target = local;
            let blend = profile.localBlend;
            if(medianDistance>profile.impulse){
                // Require several neighbors to agree before treating a
                // sample as a speckle. This leaves narrow real boundaries
                // intact and rejects isolated hot/cold/gust pixels.
                let support = 0;
                for(let i=0;i<neighborCount;i++)
                    if(Math.abs(neighbors[i]-median)<=profile.impulse) support++;
                if(support>=6){
                    target = median;
                    blend = profile.outlierBlend;
                }
            }
            values[index] = center+(target-center)*blend;
        }
    }
}

function stormPolarSatelliteProductFunctions(tab){
    let isSar = tab==='sar';
    let isIrBd = tab==='irBd';
    let isBaseScan = tab==='baseScan';
    return {
        isSar,
        isBaseScan,
        valueFunc: isSar ? simulatedSarWindSpeed :
            isBaseScan ? simulatedBaseScanBrightnessTemperature :
            isIrBd ? simulatedIrBdTemperature : simulatedCloudTemperature,
        colorFunc: isSar ? simulatedSarColor :
            isBaseScan ? simulatedBaseScanColor :
            isIrBd ? simulatedIrBdColor : simulatedCloudColor,
        rgbaFunc: isSar ? simulatedSarRgba :
            isBaseScan ? simulatedBaseScanRgba :
            isIrBd ? simulatedIrBdRgba : simulatedCloudRgba
    };
}

function stormPolarSatelliteRenderNow(){
    return typeof performance!=='undefined' &&
        performance.now instanceof Function ? performance.now() : Date.now();
}

function stormPolarSatelliteRenderJobMatches(job,raster,tab,basin,storm,
    centerX,centerY,extent,tick){
    return job && job.raster===raster && job.tab===tab &&
        job.basin===basin && job.storm===storm &&
        job.centerX===centerX && job.centerY===centerY &&
        job.extent===extent && job.tick===tick;
}

function clearStormPolarSatelliteRaster(raster){
    raster.loadPixels();
    raster.pixels.fill(0);
    raster.updatePixels();
}

function stormImagerySampleInBounds(x,y){
    return x>=0 && x<=WIDTH-1 && y>=0 && y<=HEIGHT-1;
}

function createStormPolarSatelliteRenderJob(raster,tab,utility,basin,centerX,
    centerY,extent,tick){
    clearStormPolarSatelliteRaster(raster);
    let product = stormPolarSatelliteProductFunctions(tab);
    let cloudTemperatureCache;
    if(stormImageryUsesCloudTemperature(tab)){
        cloudTemperatureCache = ensureStormCloudTemperatureCache(
            stormPolarCloudTemperatureCache,basin,utility.storm,tick,
            centerX,centerY,extent,raster.width,raster.height
        );
        stormPolarCloudTemperatureCache = cloudTemperatureCache;
        if(!cloudTemperatureCache.polarValues){
            cloudTemperatureCache.polarValues = new Float32Array(raster.width*raster.height);
            cloudTemperatureCache.polarValues.fill(NaN);
        }
    }
    // Coordinates depend on the viewport, not the pixel's field value.
    let sampleXs = new Float64Array(raster.width);
    let sampleYs = new Float64Array(raster.height);
    for(let col=0;col<raster.width;col++){
        let sampleX = centerX+((col+0.5)/raster.width-0.5)*2*extent;
        sampleXs[col] = product.isBaseScan ? sampleX :
            constrain(sampleX,0,WIDTH-1);
    }
    for(let row=0;row<raster.height;row++){
        let sampleY = centerY+((row+0.5)/raster.height-0.5)*2*extent;
        sampleYs[row] = product.isBaseScan ? sampleY :
            constrain(sampleY,0,HEIGHT-1);
    }
    return {
        raster,
        tab,
        utility,
        basin,
        storm: utility.storm,
        centerX,
        centerY,
        extent,
        tick,
        width: raster.width,
        height: raster.height,
        product,
        cloudTemperatureCache,
        sampleXs,
        sampleYs,
        values: new Float32Array(raster.width*raster.height),
        source: undefined,
        denoiseEnabled: tab==='baseScan' || tab==='sar',
        phase: 'sample',
        nextRow: 0,
        pixelsLoaded: false,
        maxWind: undefined,
        done: false
    };
}

function sampleStormPolarSatelliteRow(job,row){
    let product = job.product;
    let utility = job.utility;
    for(let col=0;col<job.width;col++){
        let sampleX = job.sampleXs[col];
        let screenY = job.sampleYs[row];
        // The panel center and cached imagery descriptors already use the
        // hemisphere-normalized coordinate space expected by the field model.
        // Flipping this value again moved every Southern Hemisphere sample
        // away from the selected cyclone and left the product looking empty.
        let sampleY = screenY;
        utility.sampleX = sampleX;
        utility.sampleY = sampleY;
        utility.sampleZ = job.tick;
        let value;
        let sampleIndex = row*job.width+col;
        if(product.isBaseScan &&
            !stormImagerySampleInBounds(sampleX,sampleY)){
            // The crop can extend beyond the basin near its edges. Treat that
            // area as clear sky instead of repeating the nearest map-edge
            // sample across a row or column.
            job.values[sampleIndex] = SIMULATED_BASE_SCAN_BT_MAX;
            continue;
        }
        if(job.cloudTemperatureCache &&
            Number.isFinite(job.cloudTemperatureCache.polarValues[sampleIndex])){
            job.values[sampleIndex] = job.cloudTemperatureCache.polarValues[sampleIndex];
            continue;
        }
        if(job.cloudTemperatureCache){
            value = job.cloudTemperatureCache.values[sampleIndex];
            if(!Number.isFinite(value)){
                value = simulatedCloudTemperature(
                    utility,sampleX,sampleY,job.tick
                );
                job.cloudTemperatureCache.values[sampleIndex] = value;
            }
        }else{
            value = product.valueFunc(utility,sampleX,sampleY,job.tick);
        }
        if(!product.isSar && !product.isBaseScan)
            value = stormPolarSatelliteEyeClearance(
                utility,sampleX,sampleY,job.tick,value
            );
        job.values[sampleIndex] = value;
        if(job.cloudTemperatureCache)
            job.cloudTemperatureCache.polarValues[sampleIndex] = value;
    }
}

function colorStormPolarSatelliteRow(job,row){
    let product = job.product;
    let rgbaScratch = product.rgbaFunc ? [0,0,0,0] : undefined;
    for(let col=0;col<job.width;col++){
        let value = job.values[row*job.width+col];
        if(product.isSar && Number.isFinite(value))
            job.maxWind = job.maxWind===undefined ? value :
                Math.max(job.maxWind,value);
        let index = 4*(row*job.width+col);
        if(Number.isFinite(value) && product.rgbaFunc){
            let rgba = product.rgbaFunc(value,rgbaScratch);
            job.raster.pixels[index] = rgba[0];
            job.raster.pixels[index+1] = rgba[1];
            job.raster.pixels[index+2] = rgba[2];
            job.raster.pixels[index+3] = rgba[3];
        }else{
            let c = Number.isFinite(value) ? product.colorFunc(value) :
                (product.isSar ? color(0,0,0,0) : color(128,128,128,255));
            job.raster.pixels[index] = red(c);
            job.raster.pixels[index+1] = green(c);
            job.raster.pixels[index+2] = blue(c);
            job.raster.pixels[index+3] = alpha(c);
        }
    }
}

function advanceStormPolarSatelliteRenderJob(job){
    let frameStart = stormPolarSatelliteRenderNow();
    let rowsProcessed = 0;
    while(true){
        let withinBudget = rowsProcessed===0 ||
            (stormPolarSatelliteRenderNow()-frameStart<
                    STORM_POLAR_RENDER_FRAME_BUDGET_MS);
        if(!withinBudget) return false;

        if(job.phase==='sample'){
            if(job.nextRow<job.height){
                let queryCached = job.basin && job.basin.env &&
                    typeof job.basin.env.beginQueryCache==='function';
                if(queryCached) job.basin.env.beginQueryCache();
                try{
                    sampleStormPolarSatelliteRow(job,job.nextRow++);
                }finally{
                    if(queryCached) job.basin.env.endQueryCache();
                }
                rowsProcessed++;
                continue;
            }
            if(job.denoiseEnabled){
                // Keep a stable source image while each denoise chunk is
                // spread over later frames; otherwise neighboring rows would
                // use a mix of old and already-filtered values.
                job.source = new Float32Array(job.values);
                job.phase = 'denoise';
            }else{
                // Clouds and IR-BD deliberately retain the native simulated
                // texture. Treating their fine cloud structure as speckle
                // made the polar image look like a soft synthetic disk.
                job.phase = 'color';
                job.nextRow = 0;
                job.raster.loadPixels();
                job.pixelsLoaded = true;
            }
            if(job.denoiseEnabled) job.nextRow = 0;
            continue;
        }

        if(job.phase==='denoise'){
            if(job.nextRow<job.height){
                let startRow = job.nextRow;
                stormPolarSatelliteDenoiseValues(
                    job.values,job.width,job.height,job.tab,
                    startRow,startRow+1,job.source
                );
                job.nextRow++;
                rowsProcessed++;
                continue;
            }
            job.phase = 'color';
            job.nextRow = 0;
            job.raster.loadPixels();
            job.pixelsLoaded = true;
            continue;
        }

        if(job.phase==='color'){
            if(job.nextRow<job.height){
                colorStormPolarSatelliteRow(job,job.nextRow++);
                rowsProcessed++;
                continue;
            }
            job.raster.updatePixels();
            job.phase = 'done';
            job.done = true;
            return true;
        }

        return job.done;
    }
}

function renderStormPolarSatelliteRaster(raster,tab,utility,basin,centerX,centerY,extent,tick){
    if(!stormPolarSatelliteRenderJobMatches(
        stormPolarSatelliteRenderJob,raster,tab,basin,utility.storm,
        centerX,centerY,extent,tick
    ))
        stormPolarSatelliteRenderJob = createStormPolarSatelliteRenderJob(
            raster,tab,utility,basin,centerX,centerY,extent,tick
        );
    return advanceStormPolarSatelliteRenderJob(stormPolarSatelliteRenderJob);
}

function stormPolarSatelliteRenderProgress(job){
    if(!job) return 0;
    let fraction = job.nextRow/job.height;
    if(job.phase==='sample') return (job.denoiseEnabled ? 0.68 : 0.86)*fraction;
    if(!job.denoiseEnabled && job.phase==='color') return 0.86+0.14*fraction;
    if(job.phase==='denoise') return 0.68+0.20*fraction;
    if(job.phase==='color') return 0.88+0.12*fraction;
    return job.done ? 1 : 0;
}

function renderStormPolarSatelliteLoading(imageX,imageY,imageSize,job){
    let labels = {
        clouds:'Clouds',
        irBd:'IR-BD',
        baseScan:'Base scan',
        sar:'SAR wind'
    };
    let progress = stormPolarSatelliteRenderProgress(job);
    push();
    noStroke();
    fill(0,155);
    rect(imageX,imageY,imageSize,imageSize);
    fill(255);
    textAlign(CENTER,CENTER);
    textSize(13);
    text(labels[job.tab]+' · '+round(progress*100)+'%',
        imageX+imageSize/2,imageY+imageSize/2-8);
    fill(255,70);
    rect(imageX+imageSize*0.18,imageY+imageSize/2+12,
        imageSize*0.64,5);
    fill(120,220,255);
    rect(imageX+imageSize*0.18,imageY+imageSize/2+12,
        imageSize*0.64*progress,5);
    pop();
}

function openPolarSatelliteImagery(){
    if(!stormImageryPanelEnabled() || !stormImageryIsAvailable(selectedStorm)) return;
    let basin = UI.viewBasin;
    let snapshotTick = floor(basin.tick/POLAR_SATELLITE_INTERVAL_TICKS)*
        POLAR_SATELLITE_INTERVAL_TICKS;
    let snapshotData = selectedStorm.getStormDataByTick(snapshotTick,true);
    // A newly formed cyclone may not have a six-hour advisory record yet.
    // Capture its live position in that one case so the button still works.
    if(!snapshotData){
        snapshotTick = basin.tick;
        snapshotData = selectedStorm.current;
    }
    if(!snapshotData || !snapshotData.pos) return;
    polarSatelliteSnapshot = {
        basin,
        storm: selectedStorm,
        tick: snapshotTick,
        data: snapshotData
    };
    polarSatelliteOpen = true;
    polarSatelliteTab = 'clouds';
    resetStormPolarSatelliteRasters();
    updatePolarSatellitePanel();
}

function polarSatelliteVisibleTabs(){
    return ['clouds','irBd','baseScan','sar'].filter(tab=>
        stormImageryTabEnabled(tab)
    );
}

function normalizePolarSatelliteTab(){
    let visibleTabs = polarSatelliteVisibleTabs();
    if(visibleTabs.includes(polarSatelliteTab)) return;
    polarSatelliteTab = visibleTabs.length ? visibleTabs[0] : 'sar';
}

function updatePolarSatelliteTabs(){
    let entries = [
        ['clouds',polarSatelliteCloudsTab],
        ['irBd',polarSatelliteIrBdTab],
        ['baseScan',polarSatelliteBaseScanTab],
        ['sar',polarSatelliteSarTab]
    ];
    let visibleTabs = polarSatelliteVisibleTabs();
    let visible = entries.filter(entry=>entry[1] &&
        visibleTabs.includes(entry[0]));
    if(!visible.length) return;
    let gap = 4;
    let tabWidth = (STORM_IMAGERY_PANEL_WIDTH-16-
        gap*(visible.length-1))/visible.length;
    for(let entry of entries){
        let tab = entry[1];
        if(!tab) continue;
        let index = visible.findIndex(item=>item[1]===tab);
        if(index<0){
            tab.hide();
            continue;
        }
        tab.relX = 8+index*(tabWidth+gap);
        tab.width = tabWidth;
        tab.show();
    }
}

function updatePolarSatellitePanel(){
    if(!polarSatellitePanel) return;
    normalizePolarSatelliteTab();
    updatePolarSatelliteTabs();
    let hiddenByModal = typeof helpBox !== 'undefined' && helpBox.showing;
    let hiddenByInfo = panel_timeline_container && panel_timeline_container.showing;
    let hasSnapshot = polarSatelliteSnapshot &&
        polarSatelliteSnapshot.basin===UI.viewBasin &&
        polarSatelliteSnapshot.storm===selectedStorm;
    if(polarSatelliteOpen && stormImageryPanelEnabled() && hasSnapshot &&
        stormImageryIsAvailable(selectedStorm) &&
        !hiddenByModal && !hiddenByInfo)
        polarSatellitePanel.show();
    else
        polarSatellitePanel.hide();
}

function updateStormImageryPanel(){
    if(!stormImageryPanel) return;
    // This setting controls the storm-imagery interface as a whole. Keeping
    // the panel open with only Base scan and SAR made "Disabled" look as if
    // it merely hid two tabs.
    if(!stormImageryPanelEnabled() || !stormImageryTabEnabled('clouds')){
        stormImageryPanel.hide();
        updatePolarSatellitePanel();
        return;
    }
    normalizeStormImageryTab();
    let hiddenByModal = typeof helpBox !== 'undefined' && helpBox.showing;
    let hiddenByInfo = panel_timeline_container && panel_timeline_container.showing;
    let hasEnabledTab = stormImageryTabEnabled('clouds') ||
        stormImageryTabEnabled('baseScan') || stormImageryTabEnabled('sar');
    if(stormImageryPanelEnabled() && stormImageryIsAvailable(selectedStorm) && hasEnabledTab &&
        !hiddenByModal && !hiddenByInfo)
        stormImageryPanel.show();
    else
        stormImageryPanel.hide();
    updatePolarSatellitePanel();
}

function ensureStormImageryRaster(size){
    if(!stormImageryRaster || stormImageryRaster.width!==size ||
        stormImageryRaster.height!==size){
        stormImageryRaster = createImage(size,size);
    }
    return stormImageryRaster;
}

function stormCloudTemperatureCacheMatches(cache,basin,storm,tick,
    centerX,centerY,extent,width,height){
    return !!cache && cache.basin===basin && cache.storm===storm &&
        cache.tick===tick && cache.centerX===centerX &&
        cache.centerY===centerY && cache.extent===extent &&
        cache.width===width && cache.height===height;
}

function ensureStormCloudTemperatureCache(cache,basin,storm,tick,
    centerX,centerY,extent,width,height){
    if(stormCloudTemperatureCacheMatches(
        cache,basin,storm,tick,centerX,centerY,extent,width,height
    )) return cache;
    let values = new Float64Array(width*height);
    values.fill(NaN);
    return {
        basin,
        storm,
        tick,
        centerX,
        centerY,
        extent,
        width,
        height,
        values
    };
}

function stormImageryUsesCloudTemperature(tab){
    return tab==='clouds' || tab==='irBd';
}

function stormImagerySarMaxWindLabel(maxWind){
    if(!Number.isFinite(maxWind)) return 'Max Wind: --';
    let knots = constrain(maxWind,SIMULATED_SAR_WIND_MIN,
        SIMULATED_SAR_WIND_MAX);
    let metersPerSecond = knots/SIMULATED_SAR_KNOTS_PER_MS;
    return 'Max Wind: '+Math.round(metersPerSecond)+' m/s · '+
        Math.round(knots)+' knots';
}

function renderStormSarOverlay(imageX,imageY,imageSize,maxWind){
    let centerX = imageX+imageSize/2;
    let centerY = imageY+imageSize/2;

    push();
    // Keep the geolocated-product grid without imposing a satellite swath
    // mask; this panel presents the complete simulated wind field.
    stroke(255,135);
    strokeWeight(0.55);
    for(let i=1;i<6;i++){
        let p = imageX+imageSize*i/6;
        line(p,imageY,p,imageY+imageSize);
        p = imageY+imageSize*i/6;
        line(imageX,p,imageX+imageSize,p);
    }
    stroke(255,185);
    strokeWeight(0.7);
    line(centerX-5,centerY,centerX+5,centerY);
    line(centerX,centerY-5,centerX,centerY+5);

    noStroke();
    fill(255,235);
    textAlign(LEFT,CENTER);
    textSize(9);
    text('SAR  SURFACE WIND',imageX+10,imageY+12.5);
    textAlign(RIGHT,CENTER);
    textSize(8);
    text(stormImagerySarMaxWindLabel(maxWind),imageX+imageSize-10,
        imageY+12.5);
    pop();
}

const STORM_IMAGERY_BASE_SCAN_COLOR_LEVELS =
    [100,120,140,152,168,180,192,210,228,246,264,282,300];
const STORM_IMAGERY_SAR_COLOR_LEVELS =
    [0,17,34,54,75,95,115,136,155,170,210,270,330,400,440];

function stormImageryDrawGradient(x,y,w,start,end,colorFunc){
    for(let i=0;i<w;i++){
        let value = map(i,0,w-1,start,end);
        fill(colorFunc(value));
        rect(x+i,y,1,8);
    }
    noFill();
    stroke(COLORS.UI.text);
    rect(x,y,w,8);
}

function stormImageryDrawTickMarks(x,y,w,start,end,values){
    stroke(COLORS.UI.text);
    strokeWeight(1);
    for(let value of values){
        let tickX = map(value,start,end,x,x+w,true);
        line(tickX,y+8,tickX,y+12);
    }
}

function stormImageryDrawScaleLabels(x,y,w,start,end,ticks,labelY){
    noStroke();
    fill(COLORS.UI.text);
    textSize(7);
    let candidates = [];
    for(let i=0;i<ticks.length;i++){
        let tick = ticks[i];
        let tickX = map(tick.value,start,end,x,x+w,true);
        let alignment = i===0 ? LEFT : i===ticks.length-1 ? RIGHT : CENTER;
        let label = String(tick.label);
        let labelWidth = textWidth(label);
        let left = alignment===LEFT ? tickX : alignment===RIGHT ?
            tickX-labelWidth : tickX-labelWidth/2;
        candidates.push({tick,tickX,alignment,left,
            right:left+labelWidth,index:i});
    }

    // Keep every tick mark, but only draw labels whose measured bounds fit.
    // SAR has two short side-by-side bars, so rendering every category label
    // makes the values unreadable even though the tick positions themselves
    // remain useful.
    let visible = [];
    let labelGap = 2;
    for(let candidate of candidates){
        if(!visible.length){
            visible.push(candidate);
            continue;
        }
        let previous = visible[visible.length-1];
        if(candidate.left < previous.right+labelGap){
            if(candidate.index===candidates.length-1){
                // Preserve the right endpoint by dropping the last interior
                // label(s) that collide with it.
                while(visible.length && candidate.left <
                    visible[visible.length-1].right+labelGap)
                    visible.pop();
                if(!visible.length || candidate.left >=
                    visible[visible.length-1].right+labelGap)
                    visible.push(candidate);
            }
            continue;
        }
        visible.push(candidate);
    }

    for(let candidate of visible){
        textAlign(candidate.alignment,TOP);
        text(candidate.tick.label,candidate.tickX,
            labelY===undefined ? y+10 : labelY);
    }
}

function stormImageryBdLegendLevels(){
    return [
        {name:'WMG',range:'>+9°C',sample:18},
        {name:'OW',range:'+9~-30°C',sample:-10},
        {name:'DG',range:'-30~-41°C',sample:-35},
        {name:'MG',range:'-41~-53°C',sample:-47},
        {name:'LG',range:'-53~-63°C',sample:-58},
        {name:'B',range:'-63~-69°C',sample:-66},
        {name:'W',range:'-69~-75°C',sample:-72},
        {name:'CMG',range:'-75~-80°C',sample:-78},
        {name:'CDG',range:'-80~-85°C',sample:-82.5},
        {name:'VCDG',range:'-85~-89°C',sample:-87},
        {name:'ECDG',range:'<-89°C',sample:SIMULATED_IR_BD_BT_MIN}
    ];
}

function stormImageryDrawBdLegendKey(x,y,w){
    let levels = stormImageryBdLegendLevels();
    let columns = 4;
    let cellWidth = w/columns;
    let rowHeight = 6;
    let keyY = y+13;
    textSize(6);
    textAlign(LEFT,TOP);
    for(let i=0;i<levels.length;i++){
        let level = levels[i];
        let cellX = x+(i%columns)*cellWidth;
        let rowY = keyY+Math.floor(i/columns)*rowHeight;
        noStroke();
        fill(simulatedIrBdColor(level.sample));
        rect(cellX,rowY+1,5,5);
        fill(COLORS.UI.text);
        text(level.name+' '+level.range,cellX+7,rowY);
    }
}

function stormImageryLegend(tab,x,y,w){
    if(tab==='sar'){
        let gap = 10;
        let barWidth = Math.floor((w-gap)/2);
        let drawBar = (barX,maxValue,toKnots,title,displayValue)=>{
            stormImageryDrawGradient(barX,y,barWidth,0,maxValue,
                value=>simulatedSarColor(toKnots(value)));
            noStroke();
            fill(COLORS.UI.text);
            textAlign(LEFT,TOP);
            textSize(8);
            text(title,barX,y-12);
            let ticks = STORM_IMAGERY_SAR_COLOR_LEVELS.map(value=>({
                value:displayValue(value),
                label:String(round(displayValue(value)))
            }));
            stormImageryDrawTickMarks(barX,y,barWidth,0,maxValue,
                ticks.map(tick=>tick.value));
            stormImageryDrawScaleLabels(barX,y,barWidth,0,maxValue,ticks);
        };
        drawBar(x,SIMULATED_SAR_WIND_MAX/SIMULATED_SAR_KNOTS_PER_MS,
            v=>v*SIMULATED_SAR_KNOTS_PER_MS,'Wind speed (m/s)',
            v=>v/SIMULATED_SAR_KNOTS_PER_MS);
        drawBar(x+barWidth+gap,SIMULATED_SAR_WIND_MAX,v=>v,
            'Wind speed (knots)',v=>v);
        return;
    }

    let isBaseScan = tab==='baseScan';
    let isIrBd = tab==='irBd';
    let cloudMaximum = typeof SIMULATED_CLOUD_BT_MAX==='number' ?
        SIMULATED_CLOUD_BT_MAX : 50;
    let start = isBaseScan ? SIMULATED_BASE_SCAN_BT_MIN :
        isIrBd ? SIMULATED_IR_BD_BT_MAX : cloudMaximum;
    let end = isBaseScan ? SIMULATED_BASE_SCAN_BT_MAX :
        isIrBd ? SIMULATED_IR_BD_BT_MIN : -85;
    let colorFunc = isBaseScan ? simulatedBaseScanColor :
        isIrBd ? simulatedIrBdColor : simulatedCloudColor;
    stormImageryDrawGradient(x,y,w,start,end,colorFunc);

    noStroke();
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(8);
    if(isBaseScan) text('Brightness temperature (K)',x,y-12);
    else if(isIrBd) text('Dvorak BD enhancement · cloud-top °C',x,y-12);

    if(isBaseScan){
        let ticks = STORM_IMAGERY_BASE_SCAN_COLOR_LEVELS.map(value=>({
            value,
            label:String(value)
        }));
        stormImageryDrawTickMarks(x,y,w,start,end,
            ticks.map(tick=>tick.value));
        stormImageryDrawScaleLabels(x,y,w,start,end,ticks);
    }else if(isIrBd){
        let tickValues = [SIMULATED_IR_BD_BT_MAX,9,-30,-41,-53,-63,
            -69,-75,-80,SIMULATED_IR_BD_CDG_MIN,
            SIMULATED_IR_BD_VCDG_MIN,SIMULATED_IR_BD_BT_MIN];
        stormImageryDrawTickMarks(x,y,w,start,end,tickValues);
        stormImageryDrawBdLegendKey(x,y,w);
    }else{
        stormImageryDrawTickMarks(x,y,w,start,end,[start,end]);
        stormImageryDrawScaleLabels(x,y,w,start,end,[
            {value:start,label:'Clear'},
            {value:end,label:'Deep convection'}
        ]);
    }
}

function stormImageryTemperatureLabel(temperature){
    let rounded = round(temperature*10)/10;
    return (rounded>0 ? '+' : '')+rounded+'°C';
}

function renderStormImageryPanel(panel,imageryFrame){
    if(!stormImageryPanelEnabled()){
        panel.hide();
        return;
    }
    if(!stormImageryIsAvailable(selectedStorm)){
        panel.hide();
        return;
    }
    normalizeStormImageryTab();
    if(!stormImageryTabEnabled(stormImageryTab)) return;

    let basin = UI.viewBasin;
    let storm = selectedStorm;
    let data = imageryFrame && imageryFrame.data ? imageryFrame.data : storm.current;
    if(!data || !data.pos || !Number.isFinite(data.pos.x) || !Number.isFinite(data.pos.y)) return;
    let tick = imageryFrame && Number.isFinite(imageryFrame.tick) ?
        imageryFrame.tick : basin.tick;
    let isSar = stormImageryTab==='sar';
    let isIrBd = stormImageryTab==='irBd';
    let isBaseScan = stormImageryTab==='baseScan';
    let isPolarHd = stormImageryHighDefinition;
    let systems = basin.env.getBaseScanSystems(tick,storm);
    let descriptor = systems[0];
    let minimumExtent = stormImageryMinimumExtent(descriptor,data,isSar);
    let baseScanExtent = descriptor ?
        max(descriptor.rmwX,descriptor.rmwY)*3.1 : undefined;
    let sarExtent = descriptor ?
        max(minimumExtent,max(descriptor.rmwX,descriptor.rmwY)*4.2) : undefined;
    let extent = descriptor && stormImageryTab==='baseScan' ?
        max(minimumExtent,baseScanExtent) : isSar && sarExtent ? sarExtent : descriptor ?
        max(descriptor.outerX,descriptor.outerY)*1.18 :
        max(minimumExtent,Number.isFinite(data.radiusOfMaxWind) ? data.radiusOfMaxWind/2 : minimumExtent);
    extent = max(minimumExtent,extent);

    let imageX = 10;
    let imageY = 68;
    let imageSize = panel.width-20;
    let rasterSize = isPolarHd ? STORM_POLAR_SATELLITE_RASTER_SIZE :
        stormImageryTab==='baseScan' ? STORM_IMAGERY_BASE_SCAN_RASTER_SIZE :
        isSar ? STORM_IMAGERY_SAR_RASTER_SIZE : STORM_IMAGERY_RASTER_SIZE;
    let raster = isPolarHd ? ensureStormPolarSatelliteRaster(stormImageryTab) :
        ensureStormImageryRaster(rasterSize);
    let rasterNeedsUpdate = isPolarHd ?
        stormPolarSatelliteRasterNeedsUpdate(stormImageryTab,basin,storm,tick,extent) :
        stormImageryRasterBasin!==basin ||
        stormImageryRasterStorm!==storm || stormImageryRasterTick!==tick ||
        stormImageryRasterTab!==stormImageryTab ||
        stormImageryRasterSize!==rasterSize ||
        stormImageryRasterExtent!==extent;

    let utility = {
        basin,
        storm,
        simulatedSystems: systems,
        simulatedSystemsTick: tick,
        sampleX: data.pos.x,
        sampleY: basin.hemY(data.pos.y),
        sampleZ: tick,
        sarVector: createVector(),
        field(name,x,y,z){
            if(x===undefined) x = utility.sampleX;
            if(y===undefined) y = utility.sampleY;
            if(z===undefined) z = utility.sampleZ;
            return basin.env.get(name,x,y,z,true);
        }
    };
    let valueFunc = isSar ? simulatedSarWindSpeed :
        stormImageryTab==='baseScan' ? simulatedBaseScanBrightnessTemperature :
        isIrBd ? simulatedIrBdTemperature : simulatedCloudTemperature;
    let colorFunc = isSar ? simulatedSarColor :
        stormImageryTab==='baseScan' ? simulatedBaseScanColor :
        isIrBd ? simulatedIrBdColor : simulatedCloudColor;
    let rgbaFunc = isSar ? simulatedSarRgba :
        isBaseScan ? simulatedBaseScanRgba :
        isIrBd ? simulatedIrBdRgba : simulatedCloudRgba;
    let centerX = data.pos.x;
    let centerY = basin.hemY(data.pos.y);
    // The cloud/IR field displaces the apparent eye downshear for every
    // raster mode, not only Polar HD. Use that same center for the readout so
    // ordinary IR-BD does not report the colder storm-center pixel.
    let eyeCenter = descriptor ?
        stormPolarSatelliteEyeCenter(descriptor) : undefined;
    let eyeSampleX = eyeCenter ? eyeCenter.x : centerX;
    let eyeSampleY = eyeCenter ? eyeCenter.y : centerY;
    // `field()` defaults to the utility's current sample position. Keep it in
    // step with the eye sample so moisture/SST do not silently come from the
    // storm center while the temperature is read from the displaced eye.
    utility.sampleX = eyeSampleX;
    utility.sampleY = eyeSampleY;
    utility.sampleZ = tick;
    let eyeTemperature = isIrBd ?
        simulatedIrBdTemperature(utility,eyeSampleX,eyeSampleY,tick) : undefined;
    if(isPolarHd && Number.isFinite(eyeTemperature))
        eyeTemperature = stormPolarSatelliteEyeClearance(
            utility,eyeSampleX,eyeSampleY,tick,eyeTemperature
        );
    let polarRasterReady = true;
    let sarMaxWind;
    if(rasterNeedsUpdate){
        if(isPolarHd){
            // Render only the selected page. The other high-resolution
            // products stay cold until their tabs are opened, then retain
            // their own cached raster and geographic extent.
            polarRasterReady = renderStormPolarSatelliteRaster(
                raster,stormImageryTab,utility,
                basin,centerX,centerY,extent,tick
            );
            if(polarRasterReady)
                stormPolarRasterState[stormImageryTab] = {
                    basin,
                    storm,
                    tick,
                    extent,
                    rendered: true,
                    maxWind: isSar ? stormPolarSatelliteRenderJob.maxWind :
                        undefined
                };
        }else{
            let cloudTemperatureCache;
            if(stormImageryUsesCloudTemperature(stormImageryTab)){
                cloudTemperatureCache = ensureStormCloudTemperatureCache(
                    stormImageryCloudTemperatureCache,basin,storm,tick,
                    centerX,centerY,extent,raster.width,raster.height
                );
                stormImageryCloudTemperatureCache = cloudTemperatureCache;
            }
            raster.loadPixels();
            let rasterSarMaxWind;
            let rgbaScratch = rgbaFunc ? [0,0,0,0] : undefined;
            let queryCached = basin.env &&
                typeof basin.env.beginQueryCache==='function';
            if(queryCached) basin.env.beginQueryCache();
            try{
                for(let row=0;row<raster.height;row++){
                    for(let col=0;col<raster.width;col++){
                        let localX = (col+0.5)/raster.width-0.5;
                        let localY = (row+0.5)/raster.height-0.5;
                        let rawSampleX = centerX+localX*2*extent;
                        let rawScreenY = centerY+localY*2*extent;
                        let outsideBaseScan = isBaseScan &&
                            !stormImagerySampleInBounds(rawSampleX,rawScreenY);
                        let sampleX = outsideBaseScan ? rawSampleX :
                            constrain(rawSampleX,0,WIDTH-1);
                        let screenY = outsideBaseScan ? rawScreenY :
                            constrain(rawScreenY,0,HEIGHT-1);
                        // `centerY`, the descriptor, and every simulated imagery
                        // function share hemisphere-normalized coordinates. Do not
                        // apply the Southern Hemisphere transform a second time.
                        let sampleY = screenY;
                        utility.sampleX = sampleX;
                        utility.sampleY = sampleY;
                        utility.sampleZ = tick;
                        let index = row*raster.width+col;
                        let value;
                        if(outsideBaseScan){
                            // Match the panel's clear-sky background outside
                            // the basin instead of stretching its edge data.
                            value = SIMULATED_BASE_SCAN_BT_MAX;
                        }else if(cloudTemperatureCache){
                            value = cloudTemperatureCache.values[index];
                            if(!Number.isFinite(value)){
                                value = simulatedCloudTemperature(
                                    utility,sampleX,sampleY,tick
                                );
                                cloudTemperatureCache.values[index] = value;
                            }
                        }else{
                            value = valueFunc(utility,sampleX,sampleY,tick);
                        }
                        if(isSar && Number.isFinite(value))
                            rasterSarMaxWind = rasterSarMaxWind===undefined ? value :
                                Math.max(rasterSarMaxWind,value);
                        let pixelIndex = 4*index;
                        if(Number.isFinite(value) && rgbaFunc){
                            let rgba = rgbaFunc(value,rgbaScratch);
                            raster.pixels[pixelIndex] = rgba[0];
                            raster.pixels[pixelIndex+1] = rgba[1];
                            raster.pixels[pixelIndex+2] = rgba[2];
                            raster.pixels[pixelIndex+3] = rgba[3];
                        }else{
                            let c = Number.isFinite(value) ? colorFunc(value) :
                                (isSar ? color(0,0,0,0) : color(128,128,128,255));
                            raster.pixels[pixelIndex] = red(c);
                            raster.pixels[pixelIndex+1] = green(c);
                            raster.pixels[pixelIndex+2] = blue(c);
                            raster.pixels[pixelIndex+3] = alpha(c);
                        }
                    }
                }
            }finally{
                if(queryCached) basin.env.endQueryCache();
            }
            raster.updatePixels();
            stormImageryRasterBasin = basin;
            stormImageryRasterStorm = storm;
            stormImageryRasterTick = tick;
            stormImageryRasterTab = stormImageryTab;
            stormImageryRasterSize = rasterSize;
            stormImageryRasterExtent = extent;
            stormImageryRasterSarMaxWind = isSar ? rasterSarMaxWind : undefined;
        }
    }

    if(isSar){
        if(isPolarHd){
            let polarState = stormPolarRasterState[stormImageryTab];
            sarMaxWind = polarRasterReady && polarState && polarState.rendered ?
                polarState.maxWind : undefined;
        }else{
            sarMaxWind = stormImageryRasterSarMaxWind;
        }
    }

    if(!isSar){
        noStroke();
        fill(stormImageryTab==='baseScan' ?
            simulatedBaseScanColor(SIMULATED_BASE_SCAN_BT_MAX) :
            isIrBd ? simulatedIrBdColor(SIMULATED_IR_BD_BT_MAX) : color(10,24,42));
        rect(imageX,imageY,imageSize,imageSize);
    }
    push();
    let smoothing = drawingContext.imageSmoothingEnabled;
    // Bilinear interpolation gives the ordinary cloud image its original
    // lightly smoothed appearance. Keep SAR speckle and the stepped IR-BD
    // categories discrete; Polar remains a native 512px product.
    drawingContext.imageSmoothingEnabled = !isSar && !isIrBd;
    image(raster,imageX,imageY,imageSize,imageSize);
    drawingContext.imageSmoothingEnabled = smoothing;
    pop();
    if(isPolarHd && !polarRasterReady)
        renderStormPolarSatelliteLoading(
            imageX,imageY,imageSize,stormPolarSatelliteRenderJob
        );
    if(isSar) renderStormSarOverlay(imageX,imageY,imageSize,sarMaxWind);
    // Keep the three metadata items on one line. The detailed product
    // descriptions remain in the legend title below, while these short names
    // leave a guaranteed gap around the centered wind label.
    let imageryTitle = isSar ? (isPolarHd ? 'SAR wind · HD' : 'SAR wind') :
        isBaseScan ? (isPolarHd ? 'Base scan · HD' : 'Base scan') :
        isIrBd ? (isPolarHd ? 'IR-BD · HD' : 'IR-BD') :
        (isPolarHd ? 'Clouds · HD' : 'Clouds');
    let metadataY = imageY+imageSize+10;
    let windLabel = 'Wind '+displayWindspeed(round(data.windSpeed),1);
    let pressureLabel = round(data.pressure)+' hPa';
    let intensityLabel = windLabel+' · '+pressureLabel;
    fill(COLORS.UI.text);
    textSize(9);
    textAlign(LEFT,TOP);
    text(imageryTitle,10,metadataY);
    textAlign(RIGHT,TOP);
    text(intensityLabel,panel.width-10,metadataY);
    if(isIrBd && Number.isFinite(eyeTemperature)){
        textSize(10);
        textAlign(LEFT,TOP);
        text('Eye temp: '+stormImageryTemperatureLabel(eyeTemperature),
            10,metadataY+15);
    }
    stormImageryLegend(stormImageryTab,10,panel.height-32,panel.width-20);
}

function renderPolarSatelliteImageryPanel(panel){
    if(!stormImageryIsAvailable(selectedStorm) || !polarSatelliteSnapshot){
        panel.hide();
        return;
    }

    // Reuse the same product renderer and legend as the original panel while
    // keeping its selected tab and raster state completely independent.
    let originalTab = stormImageryTab;
    let originalHd = stormImageryHighDefinition;
    stormImageryTab = polarSatelliteTab;
    stormImageryHighDefinition = true;
    renderStormImageryPanel(panel,polarSatelliteSnapshot);
    polarSatelliteTab = stormImageryTab;
    stormImageryTab = originalTab;
    stormImageryHighDefinition = originalHd;
}

// Buoys are viewer-only state. B removes the old buoy and arms the next map click.
let observationBuoy;
let buoyPlacementArmed = false;
let observationBuoyCloseButton;
const BUOY_HISTORY_LENGTH = 24 * 7;
const OBSERVATION_BUOY_PANEL_WIDTH = 270;
const OBSERVATION_BUOY_PANEL_HEIGHT = 174;

function observationBuoyPanelY(){
    return UI.viewBasin.SHem ? HEIGHT-30-OBSERVATION_BUOY_PANEL_HEIGHT-6 : 36;
}

function updateObservationBuoyCloseButton(){
    if(!observationBuoyCloseButton) return;
    if(!(UI.viewBasin instanceof Basin) || !observationBuoy || !observationBuoy.history.length || (typeof helpBox !== 'undefined' && helpBox.showing)){
        observationBuoyCloseButton.hide();
        return;
    }
    let panelX = WIDTH-OBSERVATION_BUOY_PANEL_WIDTH-6;
    observationBuoyCloseButton.relX = panelX+OBSERVATION_BUOY_PANEL_WIDTH-29;
    observationBuoyCloseButton.relY = observationBuoyPanelY()+3;
    observationBuoyCloseButton.show();
}

function clearObservationBuoy(armPlacement){
    observationBuoy = undefined;
    buoyPlacementArmed = !!armPlacement;
    updateObservationBuoyCloseButton();
}

function placeObservationBuoy(x,y){
    if(!(UI.viewBasin instanceof Basin)) return;
    observationBuoy = {x, y, history: []};
    buoyPlacementArmed = false;
    recordObservationBuoy(viewTick);
    updateObservationBuoyCloseButton();
}

function recordObservationBuoy(tick){
    let basin = UI.viewBasin;
    if(!observationBuoy || !(basin instanceof Basin)) return;
    let history = observationBuoy.history;
    if(history.length && history[history.length-1].tick===tick) return;
    let pressure = basin.env.get('pressure',observationBuoy.x,observationBuoy.y,tick);
    let wind = basin.env.get('surfaceWind',observationBuoy.x,observationBuoy.y,tick);
    if(pressure===null || wind===null || !Number.isFinite(pressure) || !wind || !Number.isFinite(wind.mag())) return;
    history.push({tick, pressure, wind: wind.mag()});
    if(history.length>BUOY_HISTORY_LENGTH) history.splice(0,history.length-BUOY_HISTORY_LENGTH);
}

function renderObservationBuoy(){
    if(!(UI.viewBasin instanceof Basin)) return;
    if(buoyPlacementArmed){
        push();
        stroke(COLORS.UI.text);
        line(getMouseX()-8,getMouseY(),getMouseX()+8,getMouseY());
        line(getMouseX(),getMouseY()-8,getMouseX(),getMouseY()+8);
        noStroke();
        fill(COLORS.UI.box);
        rect(WIDTH/2-92,34,184,24);
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(13);
        text('Click the map to place buoy',WIDTH/2,46);
        pop();
        return;
    }
    if(!observationBuoy) return;

    push();
    translate(observationBuoy.x,observationBuoy.y);
    stroke(COLORS.UI.text);
    strokeWeight(2);
    fill(255,190,35);
    ellipse(0,-5,10,10);
    line(0,0,0,9);
    line(-7,9,7,9);
    line(-7,9,-3,4);
    line(7,9,3,4);
    pop();

    let history = observationBuoy.history;
    if(!history.length) return;
    let latest = history[history.length-1];
    const panelW = OBSERVATION_BUOY_PANEL_WIDTH;
    const panelH = OBSERVATION_BUOY_PANEL_HEIGHT;
    const panelX = WIDTH-panelW-6;
    const panelY = observationBuoyPanelY();
    const left = panelX+39;
    const right = panelX+panelW-10;

    push();
    noStroke();
    fill(COLORS.UI.box);
    rect(panelX,panelY,panelW,panelH);
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(13);
    text('Buoy  Pressure '+(round(latest.pressure*10)/10)+' hPa',panelX+8,panelY+6);
    text('Instant wind '+displayWindspeed(round(latest.wind),1),panelX+8,panelY+87);

    let drawPlot = (top,bottom,field,lineColor,formatValue)=>{
        let values = history.map(v=>v[field]);
        let minimum = Math.min(...values);
        let maximum = Math.max(...values);
        if(field==='pressure'){
            minimum = floor((minimum-1)/2)*2;
            maximum = ceil((maximum+1)/2)*2;
        }else{
            minimum = 0;
            maximum = max(10,ceil(maximum/10)*10);
        }
        if(maximum===minimum) maximum = minimum+1;
        stroke(COLORS.UI.text);
        strokeWeight(1);
        line(left,top,left,bottom);
        line(left,bottom,right,bottom);
        fill(COLORS.UI.text);
        noStroke();
        textAlign(RIGHT,CENTER);
        textSize(10);
        text(formatValue(maximum),left-4,top);
        text(formatValue(minimum),left-4,bottom);
        stroke(lineColor);
        strokeWeight(2);
        noFill();
        beginShape();
        for(let i=0;i<history.length;i++){
            let x = history.length===1 ? right : map(i,0,history.length-1,left,right);
            let y = map(history[i][field],minimum,maximum,bottom,top);
            vertex(x,y);
        }
        endShape();
        let lastY = map(latest[field],minimum,maximum,bottom,top);
        strokeWeight(5);
        point(right,lastY);
    };
    drawPlot(panelY+25,panelY+76,'pressure',color(55,105,190),v=>round(v));
    drawPlot(panelY+106,panelY+158,'wind',color(210,75,55),v=>round([v,ktsToMph(v),ktsToKmh(v)][simSettings.speedUnit]));
    noStroke();
    fill(COLORS.UI.text);
    textAlign(RIGHT,BOTTOM);
    textSize(9);
    text(history.length+' h',right,panelY+panelH-3);
    pop();
}

// Definitions for all UI elements

UI.init = function(){
    // hoist!

    let yearselbox;

    // "scene" wrappers

    mainMenu = new UI(null,0,0,WIDTH,HEIGHT);
    basinCreationMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,function(){
        yearselbox.enterFunc();
    },false);
    basinCreationMenuAdvanced = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    loadMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    settingsMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    let desigSystemEditor = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    primaryWrapper = new UI(null,0,0,WIDTH,HEIGHT,function(s){
        if(UI.viewBasin instanceof Basin){
            let basin = UI.viewBasin;
            if(simSettings.showWindFields){
                if(selectedStorm) selectedStorm.renderWindField();
                else if(basin.viewingPresent()){
                    for(let S of basin.activeSystems) S.fetchStorm().renderWindField();
                }else{
                    let seas = basin.fetchSeason(viewTick,true);
                    if(seas) for(let S of seas.forSystems(true)) S.renderWindField();
                }
            }
            if(simSettings.showStormIcons){
                if(basin.viewingPresent()) for(let S of basin.activeSystems) S.fetchStorm().renderIcon();
                else{
                    let seas = basin.fetchSeason(viewTick,true);
                    if(seas) for(let S of seas.forSystems(true)) S.renderIcon();
                }
            }
    
            if(!land.drawn){
                renderToDo = land.draw();
                return;
            }
            let drawMagGlass = ()=>{
                if(simSettings.showMagGlass){
                    let magMeta = buffers.get(magnifyingGlass);
                    image(
                        magnifyingGlass,
                        getMouseX()-magMeta.baseWidth/2,
                        getMouseY()-magMeta.baseHeight/2,
                        magMeta.baseWidth,
                        magMeta.baseHeight
                    );
                }
            };
            drawBuffer(outBasinBuffer);
            if(basin.env.displaying>=0 && basin.env.layerIsOceanic){
                drawBuffer(envLayer);
                drawMagGlass();
            }
            drawBuffer(landBuffer);
            if(simSettings.snowLayers){
                if(land.snowDrawn) drawBuffer(snow[floor(map(seasonCurve(viewTick,SNOW_SEASON_OFFSET),-1,1,0,simSettings.snowLayers*10))]);
                else renderToDo = land.drawSnow();
            }
            if(simSettings.useShadows){
                if(land.shaderDrawn) drawBuffer(landShadows);
                else renderToDo = land.drawShader();
            }
            if(basin.env.displaying>=0 && !basin.env.layerIsOceanic){
                drawBuffer(envLayer);
                drawMagGlass();
                if(!basin.env.layerIsVector) drawBuffer(coastLine);
            }
            // let sub = land.getSubBasin(getMouseX(),getMouseY());
            // if(basin.subBasins[sub] instanceof SubBasin && basin.subBasins[sub].mapOutline) drawBuffer(basin.subBasins[sub].mapOutline);   // test
            drawBuffer(windFields);
            drawBuffer(tracks);
            drawBuffer(forecastTracks);
            if(simSettings.showStormIcons) drawBuffer(stormIcons);
            renderEnvLayerLegend();
        }
    },function(){
        helpBox.hide();
        sideMenu.hide();
        seedBox.hide();
        if(UI.viewBasin instanceof Basin){
            let basin = UI.viewBasin;
            if(buoyPlacementArmed){
                if(getMouseY()>30 && getMouseY()<HEIGHT-30)
                    placeObservationBuoy(getMouseX(),getMouseY());
                return;
            }
            if(basin.godMode && keyIsPressed && basin.viewingPresent()) {
                if(key.toLowerCase()==='u')
                    basin.spawnFujiwharaPair(getMouseX(),getMouseY());
                else if(['l','x','n','N','d','D','s','S','1','2','3','4','5','6','7','8','9','0','y'].includes(key))
                    basin.spawnArchetype(key.toLowerCase()==='n' ? 'n' : key,getMouseX(),getMouseY());
                // let g = {x: getMouseX(), y: getMouseY()};
                // if(key === "l" || key === "L"){
                //     g.sType = "l";
                // }else if(key === "d"){
                //     g.sType = "d";
                // }else if(key === "D"){
                //     g.sType = "sd";
                // }else if(key === "s"){
                //     g.sType = "s";
                // }else if(key === "S"){
                //     g.sType = "ss";
                // }else if(key === "1"){
                //     g.sType = "1";
                // }else if(key === "2"){
                //     g.sType = "2";
                // }else if(key === "3"){
                //     g.sType = "3";
                // }else if(key === "4"){
                //     g.sType = "4";
                // }else if(key === "5"){
                //     g.sType = "5";
                // }else if(key === "6"){
                //     g.sType = "6";
                // }else if(key === "7"){
                //     g.sType = "7";
                // }else if(key === "8"){
                //     g.sType = "8";
                // }else if(key === "9"){
                //     g.sType = "9";
                // }else if(key === "0"){
                //     g.sType = "10";
                // }else if(key === "y" || key === "Y"){
                //     g.sType = "y";
                // }else if(key === "x" || key === "X"){
                //     g.sType = "x";
                // }else return;
                // basin.spawn(false,g);
            }else if(simSettings.showStormIcons && basin.viewingPresent()){
                let mVector = createVector(getMouseX(),getMouseY());
                for(let i=basin.activeSystems.length-1;i>=0;i--){
                    let s = basin.activeSystems[i].fetchStorm();
                    let p = s.getStormDataByTick(viewTick,true).pos;
                    if(p.dist(mVector)<STORM_HIT_RADIUS){
                        selectStorm(s);
                        refreshTracks(true);
                        return;
                    }
                }
                selectStorm();
                refreshTracks(true);
            }else{
                let vSeason = basin.fetchSeason(viewTick,true);
                if(vSeason){
                    let mVector = createVector(getMouseX(),getMouseY());
                    for(let i=vSeason.systems.length-1;i>=0;i--){
                        let s = vSeason.fetchSystemAtIndex(i);
                        if(s && s.aliveAt(viewTick)){
                            let p = s.getStormDataByTick(viewTick).pos;
                            if(p.dist(mVector)<STORM_HIT_RADIUS){
                                selectStorm(s);
                                refreshTracks(true);
                                return;
                            }
                        }
                    }
                    selectStorm();
                    refreshTracks(true);
                }
            }
        }
    },false);
    areYouSure = new UI(null,0,0,WIDTH,HEIGHT,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
    },true,false);

    // main menu

    mainMenu.append(false,WIDTH/2,HEIGHT/4,0,0,function(s){  // title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text(TITLE,0,0);
        textSize(18);
        textStyle(ITALIC);
        text("Simulate your own monster storms!",0,40);
    });

    mainMenu.append(false,WIDTH/2-100,HEIGHT/2-20,200,40,function(s){    // "New Basin" button
        s.button('New Basin',true,24);
    },function(){
        mainMenu.hide();
        basinCreationMenu.show();
    }).append(false,0,60,200,40,function(s){     // load button
        s.button('Load Basin',true,24);
    },function(){
        mainMenu.hide();
        loadMenu.show();
        loadMenu.refresh();
    }).append(false,0,60,200,40,function(s){     // settings menu button
        s.button('Settings',true,24);
    },function(){
        mainMenu.hide();
        settingsMenu.show();
    });

    // basin creation menu

    let newBasinSettings = {};
    newBasinSettings.mapType = 6; // default to Atlantic
    let advancedBasinSettings = {};
    Object.assign(advancedBasinSettings, MAP_TYPES[newBasinSettings.mapType || 0].optionPresets);

    basinCreationMenu.append(false,WIDTH/2,HEIGHT/16,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("New Basin Settings",0,0);
    });

    let basinCreationMenuButtonSpacing = 36;
    let basinCreationMenuButtonHeights = 28;
    let basinCreationMenuButtonWidths = 400;

    let maptypesel = basinCreationMenu.append(false,WIDTH/2-basinCreationMenuButtonWidths/2,HEIGHT/8,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){     // Map type Selector
        let maptype = MAP_TYPES[newBasinSettings.mapType || 0].label;
        s.button('Map Type: '+maptype,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.mapType===undefined) newBasinSettings.mapType = 0;
        newBasinSettings.mapType++;
        newBasinSettings.mapType %= MAP_TYPES.length;
        advancedBasinSettings = {};
        Object.assign(advancedBasinSettings, MAP_TYPES[newBasinSettings.mapType || 0].optionPresets);
    })

    let yearsel = maptypesel.append(false,0,basinCreationMenuButtonSpacing,0,basinCreationMenuButtonHeights,function(s){ // Year selector
        textAlign(LEFT,CENTER);
        text("Starting year: ",0,basinCreationMenuButtonHeights/2);
    });

    yearsel.append(false,110,0,basinCreationMenuButtonWidths-110,basinCreationMenuButtonHeights,function(s){
        let yName;
        if(newBasinSettings.year===undefined) yName = "Current year";
        else{
            let y = newBasinSettings.year;
            let h;
            if(advancedBasinSettings.hem===1) h = false;
            if(advancedBasinSettings.hem===2) h = true;
            if(h===undefined){
                yName = seasonName(y,false) + " or " + seasonName(y,true);
            }else yName = seasonName(y,h);
        }
        textAlign(LEFT,CENTER);
        let fontSize = 18;
        textSize(fontSize);
        while(textWidth(yName)>this.width-10 && fontSize>8){
            fontSize--;
            textSize(fontSize);
        }
        s.button(yName,true,fontSize);
    },function(){
        yearselbox.toggleShow();
        if(yearselbox.showing) yearselbox.clicked();
    });

    yearselbox = yearsel.append(false,110,0,basinCreationMenuButtonWidths-110,basinCreationMenuButtonHeights,[18,16,function(){
        if(yearselbox.showing){
            let v = yearselbox.value;
            let m = v.match(/^\s*(\d+)(\s+B\.?C\.?(?:E\.?)?)?(?:\s*-\s*(\d+))?(?:\s+(?:(B\.?C\.?(?:E\.?)?)|A\.?D\.?|C\.?E\.?))?\s*$/i);
            if(m){
                let bce = m[2] || m[4];
                let bce2 = m[4];
                let year1 = parseInt(m[1]);
                if(bce) year1 = 1-year1;
                let year2;
                if(m[3]){
                    year2 = parseInt(m[3]);
                    if(bce2) year2 = 1-year2;
                    if(year1+1===year2 || (year1+1)%100===year2) newBasinSettings.year = year1+1;
                    else newBasinSettings.year = undefined;
                }else newBasinSettings.year = year1;
            }else if(v!=='') newBasinSettings.year = undefined;
            if(newBasinSettings.year && !moment.utc([newBasinSettings.year,0,1]).isValid()) newBasinSettings.year = undefined;
            yearselbox.value = '';
            yearselbox.hide();
        }
    }],undefined,false);

    let gmodesel = yearsel.append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){    // Simulation mode selector
        let mode = newBasinSettings.actMode || 0;
        mode = SIMULATION_MODES[mode];
        s.button('Simulation Mode: '+mode,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.actMode===undefined) newBasinSettings.actMode = 0;
        newBasinSettings.actMode++;
        newBasinSettings.actMode %= SIMULATION_MODES.length;
    }).append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){     // God mode Selector
        let gMode = newBasinSettings.godMode ? "Enabled" : "Disabled";
        s.button('God Mode: '+gMode,true);
    },function(){
        yearselbox.enterFunc();
        newBasinSettings.godMode = !newBasinSettings.godMode;
    });

    gmodesel.append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){     // Advanced options button
        s.button("Advanced",true);
    },function(){
        yearselbox.enterFunc();
        basinCreationMenu.hide();
        basinCreationMenuAdvanced.show();
    });

    basinCreationMenu.append(false,WIDTH/2-basinCreationMenuButtonWidths/2,7*HEIGHT/8-20,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){    // "Start" button
        s.button("Start",true,20);
    },function(){
        yearselbox.enterFunc();
        let seed = seedsel.value;
        if(/^-?\d+$/g.test(seed)) advancedBasinSettings.seed = parseInt(seed);
        else advancedBasinSettings.seed = hashCode(seed);
        seedsel.value = '';

        let opts = {};
        if(advancedBasinSettings.hem===1) opts.hem = false;
        else if(advancedBasinSettings.hem===2) opts.hem = true;
        else opts.hem = random()<0.5;
        opts.year = opts.hem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
        if(newBasinSettings.year!==undefined) opts.year = newBasinSettings.year;
        for(let o of [
            'actMode',
            'mapType',
            'godMode',
        ]) opts[o] = newBasinSettings[o];
        for(let o of [
            'seed',
            'designations',
            'scale',
            'scaleFlavor'
        ]) opts[o] = advancedBasinSettings[o];
        let basin = new Basin(false,opts);

        newBasinSettings = {};
        newBasinSettings.mapType = 6; // default to Atlantic
        advancedBasinSettings = {};
        Object.assign(advancedBasinSettings, MAP_TYPES[newBasinSettings.mapType || 0].optionPresets);

        basin.initialized.then(()=>{
            basin.mount();
        });
        basinCreationMenu.hide();
    }).append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){ // "Cancel" button
        s.button("Cancel",true,20);
    },function(){
        yearselbox.value = '';
        yearselbox.hide();
        basinCreationMenu.hide();
        mainMenu.show();
    });

    // basin creation menu advanced options

    basinCreationMenuAdvanced.append(false,WIDTH/2,HEIGHT/16,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("New Basin Settings (Advanced)",0,0);
    });

    let hemsel = basinCreationMenuAdvanced.append(false,WIDTH/2-basinCreationMenuButtonWidths/2,HEIGHT/8,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){   // hemisphere selector
        let hem = "Random";
        if(advancedBasinSettings.hem===1) hem = "Northern";
        if(advancedBasinSettings.hem===2) hem = "Southern";
        s.button('Hemisphere: '+hem,true);
    },function(){
        yearselbox.enterFunc();
        if(advancedBasinSettings.hem===undefined) advancedBasinSettings.hem = 1;
        else{
            advancedBasinSettings.hem++;
            advancedBasinSettings.hem %= 3;
        }
    });

    let desigsel = hemsel.append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){    // Scale selector
        let scale = advancedBasinSettings.scale || 0;
        scale = Scale.presetScales[scale].displayName;
        s.button('Scale: '+scale,true);
    },function(){
        if(advancedBasinSettings.scale===undefined) advancedBasinSettings.scale = 0;
        advancedBasinSettings.scale++;
        advancedBasinSettings.scale %= Scale.presetScales.length;
        advancedBasinSettings.scaleFlavor = 0;
    }).append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){     // Scale flavor selector
        let scale = advancedBasinSettings.scale || 0;
        scale = Scale.presetScales[scale];
        let flavor = advancedBasinSettings.scaleFlavor || 0;
        let grey = scale.flavorDisplayNames.length<2;
        s.button('Scale Flavor: '+(scale.flavorDisplayNames[flavor] || 'N/A'),true,18,grey);
    },function(){
        let scale = advancedBasinSettings.scale || 0;
        scale = Scale.presetScales[scale];
        if(scale.flavorDisplayNames.length<2) return;
        if(advancedBasinSettings.scaleFlavor===undefined) advancedBasinSettings.scaleFlavor = 0;
        advancedBasinSettings.scaleFlavor++;
        advancedBasinSettings.scaleFlavor %= scale.flavorDisplayNames.length;
    }).append(false,0,basinCreationMenuButtonSpacing,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){     // Designations selector
        let ds = advancedBasinSettings.designations || 0;
        ds = DesignationSystem.presetDesignationSystems[ds].displayName;
        s.button('Designations: '+ds,true);
    },function(){
        if(advancedBasinSettings.designations===undefined) advancedBasinSettings.designations = 0;
        advancedBasinSettings.designations++;
        advancedBasinSettings.designations %= DesignationSystem.presetDesignationSystems.length;
    });

    let seedsel = desigsel.append(false,0,basinCreationMenuButtonSpacing,0,basinCreationMenuButtonHeights,function(s){
        textAlign(LEFT,CENTER);
        text('Seed:',0,basinCreationMenuButtonHeights/2);
    }).append(false,50,0,basinCreationMenuButtonWidths-50,basinCreationMenuButtonHeights,[18,16]);

    basinCreationMenuAdvanced.append(false,WIDTH/2-basinCreationMenuButtonWidths/2,7*HEIGHT/8-20,basinCreationMenuButtonWidths,basinCreationMenuButtonHeights,function(s){ // "Back" button
        s.button("Back", true, 20);
    },function(){
        basinCreationMenuAdvanced.hide();
        basinCreationMenu.show();
    });

    // load menu

    loadMenu.loadables = []; // cache that stores a list of saved basins and if they are loadable
    loadMenu.page = 0;

    loadMenu.append(false,WIDTH/2,HEIGHT/8,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Load Basin",0,0);
    });

    loadMenu.refresh = function(){
        loadMenu.loadables = [];
        waitForAsyncProcess(()=>{
            return db.transaction('r',db.saves,()=>{
                let col = db.saves.orderBy('format');
                let saveNames = col.primaryKeys();
                let formats = col.keys();
                return Promise.all([saveNames,formats]);
            }).then(res=>{
                let saveNames = res[0];
                let formats = res[1];
                for(let i=0;i<saveNames.length;i++){
                    loadMenu.loadables.push({
                        saveName: saveNames[i],
                        format: formats[i]
                    });
                }
                loadMenu.loadables.sort((a,b)=>{
                    a = a.saveName;
                    b = b.saveName;
                    if(a===AUTOSAVE_SAVE_NAME) return -1;
                    if(b===AUTOSAVE_SAVE_NAME) return 1;
                    return a>b ? 1 : -1;
                });
            });
        },'Fetching Saved Basins...').catch(e=>{
            console.error(e);
        });
    };

    let loadbuttonrender = function(s){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.buttonNum];
        let label;
        let loadable;
        if(!b){
            label = '--Empty--';
            loadable = false;
        }else{
            label = b.saveName;
            if(b.format < EARLIEST_COMPATIBLE_FORMAT || b.format > SAVE_FORMAT){
                label += " [Incompatible]";
                loadable = false;
            }else loadable = true;
        }
        let fontSize = 18;
        textSize(fontSize);
        while(textWidth(label)>this.width-10 && fontSize>8){
            fontSize--;
            textSize(fontSize);
        }
        s.button(label,true,fontSize,!loadable);
    };

    let loadbuttonclick = function(){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.buttonNum];
        if(b && b.format >= EARLIEST_COMPATIBLE_FORMAT && b.format <= SAVE_FORMAT){
            let basin = new Basin(b.saveName);
            basin.initialized.then(()=>{
                basin.mount();
            });
            loadMenu.hide();
        }
    };

    let loadbuttons = [];

    for(let i=0;i<LOAD_MENU_BUTTONS_PER_PAGE;i++){
        let x = i===0 ? WIDTH/2-150 : 0;
        let y = i===0 ? HEIGHT/4 : 40;
        loadbuttons[i] = loadMenu.append(1,x,y,300,30,loadbuttonrender,loadbuttonclick);
        loadbuttons[i].buttonNum = i;
    }

    loadMenu.append(1,0,40,300,30,function(s){ // "Cancel" button
        s.button("Cancel",true,20);
    },function(){
        loadMenu.hide();
        mainMenu.show();
    });

    loadMenu.append(false,WIDTH/2-75,HEIGHT/4-40,30,30,function(s){   // prev page
        s.button('',true,18,loadMenu.page<1);
        triangle(5,15,25,5,25,25);
    },function(){
        if(loadMenu.page>0) loadMenu.page--;
    }).append(false,120,0,30,30,function(s){    // next page
        let grey = loadMenu.page>=ceil(loadMenu.loadables.length/LOAD_MENU_BUTTONS_PER_PAGE)-1;
        s.button('',true,18,grey);
        triangle(5,5,25,15,5,25);
    },function(){
        if(loadMenu.page<ceil(loadMenu.loadables.length/LOAD_MENU_BUTTONS_PER_PAGE)-1) loadMenu.page++;
    });

    let delbuttonrender = function(s){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.parent.buttonNum];
        s.button("Del",true,18,!b);
    };

    let delbuttonclick = function(){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.parent.buttonNum];
        if(b){
            areYouSure.dialog(()=>{
                Basin.deleteSave(b.saveName,()=>{
                    loadMenu.refresh();
                });
            },'Delete "'+b.saveName+'"?');
        }
    };

    for(let i=0;i<LOAD_MENU_BUTTONS_PER_PAGE;i++) loadbuttons[i].append(false,315,0,40,30,delbuttonrender,delbuttonclick);

    // Settings Menu

    settingsMenu.append(false,WIDTH/2,HEIGHT/16,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Settings",0,0);
    });

    settingsMenu.append(false, WIDTH / 2 - 150, HEIGHT / 8 + 2, 300, 30, function(s){   // storm intensity indicator
        let b = simSettings.showStrength ? "Enabled" : "Disabled";
        s.button("Intensity Indicator: "+b,true);
    },function(){
        simSettings.setShowStrength("toggle");
    }).append(false,0,30,300,30,function(s){     // autosaving
        let b = simSettings.doAutosave ? "Enabled" : "Disabled";
        s.button("Autosaving: "+b,true);
    },function(){
        simSettings.setDoAutosave("toggle");
    }).append(false,0,30,300,30,function(s){     // track mode
        let m = ["Active TC Tracks","Full Active Tracks","Season Summary","No Tracks"][simSettings.trackMode];
        s.button("Track Mode: "+m,true);
    },function(){
        simSettings.setTrackMode("incmod",4);
        refreshTracks(true);
    }).append(false,0,30,300,30,function(s){     // wind fields
        let b = simSettings.showWindFields ? "Enabled" : "Disabled";
        s.button("Wind Fields: "+b,true);
    },function(){
        simSettings.setShowWindFields("toggle");
    }).append(false,0,30,300,30,function(s){     // simulated cloud and IR-BD imagery tabs
        let b = stormImageryTabEnabled('clouds') ? "Enabled" : "Disabled";
        s.button("Clouds / IR-BD Tabs: "+b,true);
    },function(){
        simSettings.setShowCloudsTab("toggle");
        updateStormImageryTabs();
    }).append(false,0,30,300,30,function(s){     // simulated storm imagery panel
        let b = stormImageryPanelEnabled() ? "Enabled" : "Disabled";
        s.button("Scan Tab: "+b,true);
    },function(){
        simSettings.setShowScanTab("toggle");
        updateStormImageryPanel();
    }).append(false,0,30,300,30,function(s){     // map layer legends
        let b = simSettings.showLayerLegends ? "Enabled" : "Disabled";
        s.button("Map Layer Legends: "+b,true);
    },function(){
        simSettings.setShowLayerLegends("toggle");
    }).append(false,0,30,300,30,function(s){     // wind field style
        let style = WIND_FIELD_STYLE_NAMES[simSettings.windFieldStyle] || WIND_FIELD_STYLE_NAMES[WIND_FIELD_STYLE_NHC];
        s.button("Wind Field Style: "+style,true);
    },function(){
        simSettings.setWindFieldStyle("incmod",WIND_FIELD_STYLE_COUNT);
    }).append(false,0,30,300,30,function(s){     // snow
        let b = simSettings.snowLayers ? (simSettings.snowLayers*10) + " layers" : "Disabled";
        s.button("Snow: "+b,true);
    },function(){
        simSettings.setSnowLayers("incmod",floor(MAX_SNOW_LAYERS/10)+1);
        if(land) land.clearSnow();
    }).append(false,0,30,300,30,function(s){     // shadows (NOT a shader O~O)
        let b = simSettings.useShadows ? "Enabled" : "Disabled";
        s.button("Land Shadows: "+b,true);
    },function(){
        simSettings.setUseShadows("toggle");
    }).append(false,0,30,300,30,function(s){     // magnifying glass
        let b = simSettings.showMagGlass ? "Enabled" : "Disabled";
        s.button("Magnifying Glass: "+b,true);
    },function(){
        simSettings.setShowMagGlass("toggle");
        if(UI.viewBasin) UI.viewBasin.env.updateMagGlass();
    }).append(false,0,30,300,30,function(s){     // smooth land color
        let b = simSettings.smoothLandColor ? "Enabled" : "Disabled";
        s.button("Smooth Land Color: "+b,true);
    },function(){
        simSettings.setSmoothLandColor("toggle");
        if(land){
            // landBuffer.clear();
            land.drawn = false;
        }
    }).append(false,0,30,300,30,function(s){     // speed unit
        let u = ['kts', 'mph', 'km/h'][simSettings.speedUnit];
        s.button("Windspeed Unit: " + u, true);
    },function(){
        simSettings.setSpeedUnit("incmod", 3);
    }).append(false,0,30,300,30,function(s){     // color scheme
        let n = COLOR_SCHEMES[simSettings.colorScheme].name;
        s.button("Color Scheme: " + n, true);
    },function(){
        simSettings.setColorScheme("incmod", COLOR_SCHEMES.length);
        refreshTracks(true);
    });

    settingsMenu.append(false,WIDTH/2-150,HEIGHT-35,300,30,function(s){ // "Back" button
        s.button("Back",true,20);
    },function(){
        settingsMenu.hide();
        if(UI.viewBasin instanceof Basin) primaryWrapper.show();
        else mainMenu.show();
    });

    // Are you sure dialog

    areYouSure.append(false,WIDTH/2,HEIGHT/4,0,0,function(s){ // dialog text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Are You Sure?",0,0);
        if(areYouSure.desc){
            textSize(24);
            text(areYouSure.desc,0,50);
        }
    });

    areYouSure.append(false,WIDTH/2-108,HEIGHT/4+100,100,30,function(s){ // "Yes" button
        s.button("Yes",true,20);
    },function(){
        if(areYouSure.action){
            areYouSure.action();
            areYouSure.action = undefined;
        }
        else console.error("No action tied to areYouSure dialog");
        areYouSure.hide();
    }).append(false,116,0,100,30,function(s){ // "No" button
        s.button("No",true,20);
    },function(){
        areYouSure.hide();
    });

    areYouSure.dialog = function(action,desc){
        if(action instanceof Function){
            areYouSure.action = action;
            if(typeof desc === "string") areYouSure.desc = desc;
            else areYouSure.desc = undefined;
            areYouSure.show();
        }
    };

    // designation system editor

    const desig_editor_definition = (()=>{
        const section_spacing = 36;
        const section_heights = 28;
        const section_width = 400;
        const name_sections = 6;

        let editing_sub_basin;
        let desig_system;
        let name_list_num = 0;
        let name_list_page = 0;
        let list_lists_mode = true;
        let aux_list = false;
        let prefix_box;
        let suffix_box;
        let num_affix_section;
        let name_editor;
        let name_edit_box;
        let name_edit_index = 0;
        let adding_name = false;

        const refresh_num_section = ()=>{
            if(desig_system instanceof DesignationSystem){
                prefix_box.value = desig_system.numbering.prefix || '';
                suffix_box.value = desig_system.numbering.suffix || '';
            }
            if(desig_system && desig_system.numbering.enabled)
                num_affix_section.show();
            else
                num_affix_section.hide();
        };
        const refresh_name_section = ()=>{
            name_list_page = 0;
        };
        const refresh_desig_editor = ()=>{
            if(editing_sub_basin === undefined)
                editing_sub_basin = UI.viewBasin.mainSubBasin;
            let sb = UI.viewBasin.subBasins[editing_sub_basin];
            if(sb && sb.designationSystem)
                desig_system = sb.designationSystem;
            name_list_num = 0;
            list_lists_mode = true;
            aux_list = false;
            refresh_num_section();
            refresh_name_section();
        };

        const list_array = ()=>{
            if(desig_system instanceof DesignationSystem){
                if(aux_list)
                    return desig_system.naming.auxiliaryLists;
                else
                    return desig_system.naming.mainLists;
            }
        };
        const get_list_from_index = (i)=>{
            let list_arr = list_array();
            if(list_arr)
                return list_arr[i];
        };
        const get_list = ()=>{
            return get_list_from_index(name_list_num);
        };
        const name_at = (i)=>{
            let txt;
            let list = get_list();
            if(list && list[i])
                txt = list[i];
            return txt;
        };
        const invoke_name_editor = (i,is_new_name)=>{
            let list = get_list();
            if(list){
                name_edit_index = i;
                if(is_new_name)
                    name_edit_box.value = '';
                else
                    name_edit_box.value = list[i];
                adding_name = is_new_name;
                name_editor.show();
                name_edit_box.clicked();
            }
        };

        // title text
        desigSystemEditor.append(false,WIDTH/2,HEIGHT/16,0,0,s=>{
            fill(COLORS.UI.text);
            noStroke();
            textAlign(CENTER,CENTER);
            textSize(36);
            text("Designations Editor",0,0);
        });

        // sub-basin selector
        let sb_selector = desigSystemEditor.append(false,WIDTH/2-section_width/2,HEIGHT/8,section_width,0,s=>{
            let txt = 'Editing sub-basin: ';
            let sb = UI.viewBasin.subBasins[editing_sub_basin];
            if(sb instanceof SubBasin)
                txt += sb.getDisplayName();
            textAlign(CENTER,CENTER);
            textSize(18);
            text(txt,section_width/2,section_heights/2);
        });
        
        sb_selector.append(false,0,0,30,10,s=>{ // next sub-basin button
            s.button('',true);
            triangle(15,2,23,8,7,8);
        },()=>{
            do{
                editing_sub_basin++;
                if(editing_sub_basin > 255)
                    editing_sub_basin = 0;
            }while(!(UI.viewBasin.subBasins[editing_sub_basin] instanceof SubBasin && UI.viewBasin.subBasins[editing_sub_basin].designationSystem));
            refresh_desig_editor();
        }).append(false,0,18,30,10,s=>{ // prev sub-basin button
            s.button('',true);
            triangle(15,8,23,2,7,2);
        },()=>{
            do{
                editing_sub_basin--;
                if(editing_sub_basin < 0)
                    editing_sub_basin = 255;
            }while(!(UI.viewBasin.subBasins[editing_sub_basin] instanceof SubBasin && UI.viewBasin.subBasins[editing_sub_basin].designationSystem));
            refresh_desig_editor();
        });

        // numbering enabled/disabled button
        let num_button = sb_selector.append(false,0,section_spacing,section_width,section_heights,s=>{
            let txt = 'Numbering: ';
            let grey = false;
            if(desig_system instanceof DesignationSystem){
                if(desig_system.numbering.enabled)
                    txt += 'Enabled';
                else
                    txt += 'Disabled';
            }
            else{
                txt += 'N/A';
                grey = true;
            }
            s.button(txt,true,18,grey);
        },()=>{
            if(desig_system instanceof DesignationSystem){
                desig_system.numbering.enabled = !desig_system.numbering.enabled;
                refresh_num_section();
            }
        });

        num_affix_section = num_button.append(false,0,section_spacing,0,0);

        // numbering prefix box
        prefix_box = num_affix_section.append(false,0,0,0,0,s=>{
            textAlign(LEFT,CENTER);
            text('Prefix:',0,section_heights/2);
        }).append(false,70,0,section_width/2-75,section_heights,[18,6,()=>{
            if(desig_system instanceof DesignationSystem && desig_system.numbering.enabled)
                desig_system.numbering.prefix = prefix_box.value;
        }]);

        // numbering suffix box
        suffix_box = num_affix_section.append(false,section_width/2+5,0,0,0,s=>{
            textAlign(LEFT,CENTER);
            text('Suffix:',0,section_heights/2);
        }).append(false,70,0,section_width/2-75,section_heights,[18,6,()=>{
            if(desig_system instanceof DesignationSystem && desig_system.numbering.enabled)
                desig_system.numbering.suffix = suffix_box.value;
        }]);

        // name list selector
        let list_selector = num_button.append(false,0,section_spacing*2,section_width,section_heights,s=>{
            let txt;
            if(list_lists_mode)
                txt = aux_list ? `Auxiliary Name Lists` : `Main Name Lists`;
            else
                txt = `Editing name list:${aux_list ? ' Aux.' : ''} List ${name_list_num + 1}`;
            s.button(txt,true,18);
        },()=>{
            if(desig_system instanceof DesignationSystem){
                if(list_lists_mode)
                    aux_list = !aux_list;
                else
                    list_lists_mode = true;
                refresh_name_section();
            }
        });

        const add_name_edit_section = (prev,i)=>{
            const my_width = section_width - 80;
            const index = ()=>name_list_page * name_sections + i;

            let section = prev.append(false,0,section_spacing,my_width,section_heights,s=>{
                let txt = '--';
                let grey = true;
                if(list_lists_mode){
                    let list = get_list_from_index(index());
                    if(list){
                        txt = `${aux_list ? ' Aux.' : ''} List ${index() + 1}`;
                        grey = false;
                    }
                }else{
                    let name = name_at(index());
                    if(name){
                        txt = name;
                        grey = false;
                    }
                }
                s.button(txt,true,18,grey);
            },()=>{
                if(list_lists_mode){
                    let list = get_list_from_index(index());
                    if(list){
                        name_list_num = index();
                        list_lists_mode = false;
                        refresh_name_section();
                    }
                }else{
                    let name = name_at(index());
                    if(name)
                        invoke_name_editor(index(),false);
                }
            });

            section.append(false,my_width+10,0,30,12,s=>{
                let grey = true;
                if(list_lists_mode){
                    let list_arr = list_array();
                    if(list_arr && index() <= list_arr.length)
                        grey = false;
                }else{
                    let list = get_list();
                    if(list && index() <= list.length)
                        grey = false;
                }
                s.button('+',true,15,grey);
                triangle(25,3,28,10,22,10);
            },()=>{
                if(list_lists_mode){
                    let list_arr = list_array();
                    if(list_arr && index() <= list_arr.length){
                        list_arr.splice(index(), 0, []);
                        name_list_num = index();
                        list_lists_mode = false;
                    }
                }else{
                    let list = get_list();
                    if(list && index() <= list.length)
                        invoke_name_editor(index(), true);
                }
            }).append(false,0,section_heights-12,30,12,s=>{
                let grey = true;
                if(list_lists_mode){
                    let list_arr = list_array();
                    if(list_arr && (index() + 1) <= list_arr.length)
                        grey = false;
                }else{
                    let list = get_list();
                    if(list && (index() + 1) <= list.length)
                        grey = false;
                }
                s.button('+',true,15,grey);
                triangle(25,9,28,2,22,2);
            },()=>{
                if(list_lists_mode){
                    let list_arr = list_array();
                    if(list_arr && (index() + 1) <= list_arr.length){
                        list_arr.splice(index() + 1, 0, []);
                        name_list_num = index() + 1;
                        list_lists_mode = false;
                    }
                }else{
                    let list = get_list();
                    if(list && (index() + 1) <= list.length)
                        invoke_name_editor(index() + 1, true);
                }
            });

            section.append(false,my_width+50,0,30,section_heights,s=>{
                let grey;
                if(list_lists_mode)
                    grey = !get_list_from_index(index());
                else
                    grey = !name_at(index());
                s.button('X',true,21,grey);
            },()=>{
                if(list_lists_mode){
                    if(get_list_from_index(index())){
                        let list_arr = list_array();
                        areYouSure.dialog(()=>{
                            list_arr.splice(index(), 1);
                            if(list_arr.length <= name_list_page * name_sections && list_arr.length > 0)
                                name_list_page--;
                        }, `Delete ${aux_list ? 'Aux. ' : ''} List ${index() + 1}?`);
                    }
                }else if(name_at(index())){
                    let list = get_list();
                    list.splice(index(), 1);
                    if(list.length <= name_list_page * name_sections && list.length > 0)
                        name_list_page--;
                }
            });
            return section;
        };

        for(let i = 0, prev = list_selector; i < name_sections; i++){
            prev = add_name_edit_section(prev,i);
        }

        let list_nav = list_selector.append(false,0,section_spacing * (name_sections + 1),0,0);

        list_nav.append(false,section_width/2-40,0,30,section_heights,s=>{
            let grey = true;
            if(name_list_page > 0)
                grey = false;
            s.button('',true,18,grey);
            triangle(4,14,26,4,26,24);
        },()=>{
            if(name_list_page > 0)
                name_list_page--;
        }).append(false,50,0,30,section_heights,s=>{
            let grey = true;
            let list = list_lists_mode ? list_array() : get_list();
            if(list && (name_list_page + 1) * name_sections < list.length)
                grey = false;
            s.button('',true,18,grey);
            triangle(26,14,4,4,4,24);
        },()=>{
            let list = list_lists_mode ? list_array() : get_list();
            if(list && (name_list_page + 1) * name_sections < list.length)
                name_list_page++;
        });

        desigSystemEditor.append(false,WIDTH/2-section_width/2,7*HEIGHT/8+10,section_width,section_heights,function(s){ // "Done" button
            s.button("Done",true,20);
        },function(){
            prefix_box.enterFunc();
            suffix_box.enterFunc();
            editing_sub_basin = UI.viewBasin.mainSubBasin;
            list_lists_mode = true;
            aux_list = false;
            name_list_num = 0;
            name_list_page = 0;
            desigSystemEditor.hide();
            if(UI.viewBasin instanceof Basin)
                primaryWrapper.show();
            else
                mainMenu.show();
        });

        name_editor = desigSystemEditor.append(false,0,0,WIDTH,HEIGHT,s=>{
            fill(COLORS.UI.box);
            noStroke();
            s.fullRect();
        },true,false);

        name_editor.append(false,WIDTH/2,HEIGHT/4,0,0,s=>{
            fill(COLORS.UI.text);
            noStroke();
            textAlign(CENTER,CENTER);
            textSize(24);
            text("Add/Edit Name",0,0);
        });

        name_edit_box = name_editor.append(false, WIDTH/2-section_width/2, HEIGHT/3, section_width, section_heights, [20, 15, ()=>{
            let list = get_list();
            if(list && name_edit_box.value){
                if(adding_name)
                    list.splice(name_edit_index,0,name_edit_box.value);
                else
                    list[name_edit_index] = name_edit_box.value;
            }
            name_editor.hide();
        }]);

        name_edit_box.append(false, 0, section_spacing, section_width, section_heights, s=>{
            s.button('Done',true,20);
        },()=>{
            name_edit_box.enterFunc();
        }).append(false, 0, section_spacing, section_width, section_heights, s=>{
            s.button('Cancel',true,20);
        },()=>{
            name_editor.hide();
        });

        return {refresh: refresh_desig_editor};
    })();

    // primary "in sim" scene

    let topBar = primaryWrapper.append(false,0,0,WIDTH,30,function(s){   // Top bar
        fill(COLORS.UI.bar);
        noStroke();
        s.fullRect();
        textSize(18);
    },false);

    let dateIndicator = topBar.append(false,5,3,100,24,function(s){  // Date indicator
        if(!(UI.viewBasin instanceof Basin)) return;
        let basin = UI.viewBasin;
        let txtStr = formatDate(basin.tickMoment(viewTick)) + (basin.viewingPresent() ? '' : ' [Analysis]');
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            s.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        dateNavigator.toggleShow();
    });

    topBar.append(false,150,3,132,24,function(s){  // High quality imagery button
        let unavailable = !stormImageryPanelEnabled() ||
            !stormImageryIsAvailable(selectedStorm);
        this.setBox(Math.max(145,dateIndicator.width+10),3,132,24);
        s.button('High Quality',true,13,unavailable);
    },function(){
        openPolarSatelliteImagery();
    });

    panel_timeline_container = primaryWrapper.append(false,0,topBar.height,0,0,undefined,undefined,false);

    dateNavigator = primaryWrapper.append(false,0,30,140,80,function(s){     // Analysis navigator panel
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        textSize(15);
        text('Y:',15,53);
    },true,false);

    let navButtonRend = function(s){     // Navigator button render function
        s.button('',false,18,!paused);
        if(this.metadata%2===0) triangle(2,8,10,2,18,8);
        else triangle(2,2,18,2,10,8);
    };

    let navButtonClick = function(){    // Navigator button click function
        if(UI.viewBasin instanceof Basin && paused){
            let basin = UI.viewBasin;
            let m = basin.tickMoment(viewTick);
            switch(this.metadata){
                case 0:
                m.add(TICK_DURATION*ADVISORY_TICKS,"ms");
                break;
                case 1:
                m.subtract(TICK_DURATION*ADVISORY_TICKS,"ms");
                break;
                case 2:
                m.add(1,"M");
                break;
                case 3:
                m.subtract(1,"M");
                break;
                case 4:
                m.add(1,"d");
                break;
                case 5:
                m.subtract(1,"d");
                break;
                case 6:
                m.add(1,"y");
                break;
                case 7:
                m.subtract(1,"y");
                break;
            }
            let t = basin.tickFromMoment(m);
            if(this.metadata%2===0 && t%ADVISORY_TICKS!==0) t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(this.metadata%2!==0 && t%ADVISORY_TICKS!==0) t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(t>basin.tick) t = basin.tick;
            if(t<0) t = 0;
            changeViewTick(t);
        }
    };

    for(let i=0;i<8;i++){   // Navigator buttons
        let x = floor(i/2)*30+15;
        let y = i%2===0 ? 10 : 30;
        let button = dateNavigator.append(false,x,y,20,10,navButtonRend,navButtonClick);
        button.metadata = i;
    }

    let dateNavYearInput = dateNavigator.append(false,30,50,70,20,[15,5,function(){
        if(!(UI.viewBasin instanceof Basin)) return;
        let basin = UI.viewBasin;
        let v = this.value;
        let n = parseInt(v);
        if(!Number.isNaN(n) && paused){
            let m = basin.tickMoment(viewTick);
            m.year(n);
            let t = basin.tickFromMoment(m);
            if(t%ADVISORY_TICKS!==0) t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(t>basin.tick) t = basin.tick;
            if(t<0) t = 0;
            changeViewTick(t);
            this.value = '';
        }
    }]);

    dateNavYearInput.append(false,80,0,20,20,function(s){
        let v = UI.focusedInput === dateNavYearInput ? /* textInput */UI.inputData.value : dateNavYearInput.value;
        let grey;
        if(Number.isNaN(parseInt(v))) grey = true;
        s.button('',false,15,grey);
        triangle(6,3,17,10,6,17);
        rect(2,8,4,4);
    },function(){
        dateNavYearInput.enterFunc();
    });

    topBar.append(false,WIDTH-29,3,24,24,function(s){    // Toggle button for storm info panel and timeline
        s.button('');
        if(panel_timeline_container.showing) triangle(6,15,18,15,12,9);
        else triangle(6,9,18,9,12,15);
    },function(){
        if(!panel_timeline_container.showing){
            stormInfoPanel.target = selectedStorm || UI.viewBasin.getSeason(viewTick);
            if(stormImageryPanel) stormImageryPanel.hide();
            if(polarSatellitePanel) polarSatellitePanel.hide();
        }
        panel_timeline_container.toggleShow();
        if(!panel_timeline_container.showing){
            updateStormImageryPanel();
            updatePolarSatellitePanel();
        }
    }).append(false,-29,0,24,10,function(s){     // Speed increase
        let grey = simSpeed == MAX_SPEED;
        s.button('', false, undefined, grey);
        triangle(4,2,12,5,4,8);
        triangle(12,2,20,5,12,8);
    },function(){
        if(simSpeed < MAX_SPEED)
            simSpeed++;
    }).append(false,0,14,24,10,function(s){     // Speed decrease
        let grey = simSpeed == MIN_SPEED;
        s.button('', false, undefined, grey);
        triangle(20,2,12,5,20,8);
        triangle(12,2,4,5,12,8);
    },function(){
        if(simSpeed > MIN_SPEED)
            simSpeed--;
    }).append(false,-29,-14,24,24,function(s){  // Pause/resume button
        s.button('');
        if(paused) triangle(3,3,21,12,3,21);
        else{
            rect(5,3,5,18);
            rect(14,3,5,18);
        }
    },function(){
        paused = !paused;
        lastUpdateTimestamp = performance.now();
    }).append(false,-105,0,100,24,function(s){  // Pause/speed/selected storm indicator
        let txtStr = "";
        if(selectedStorm){
            let sName = selectedStorm.getFullNameByTick(viewTick);
            let sData = selectedStorm.getStormDataByTick(viewTick);
            if(sData){
                let sWind = sData ? sData.windSpeed : 0;
                sWind = displayWindspeed(sWind);
                let sPrsr = sData ? sData.pressure: 1031;
                txtStr = `${sName}: ${sWind} / ${sPrsr} hPa`;
            }else{
                sName = selectedStorm.getFullNameByTick("peak");
                txtStr = sName + " - ACE: " + selectedStorm.ACE;
            }
        }else{
            if(paused)
                txtStr = "Paused";
            else if(simSpeed < -1)
                txtStr = `1/${Math.pow(2, -simSpeed)} Speed`;
            else if(simSpeed === -1)
                txtStr = 'Half-Speed';
            else if(simSpeed === 0)
                txtStr = 'Normal-Speed';
            else if(simSpeed === 1)
                txtStr = 'Double-Speed';
            else
                txtStr = `${Math.pow(2, simSpeed)}x Speed`;
        }
        let newW = textWidth(txtStr)+6;
        this.setBox(-newW-5,undefined,newW);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            s.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(RIGHT,TOP);
        text(txtStr,this.width-3,3);
    },function(){
        if(!selectedStorm){
            paused = !paused;
            lastUpdateTimestamp = performance.now();
        }else{
            stormInfoPanel.target = selectedStorm;
            panel_timeline_container.show();
            if(stormImageryPanel) stormImageryPanel.hide();
            if(polarSatellitePanel) polarSatellitePanel.hide();
        }
    });

    let bottomBar = primaryWrapper.append(false,0,HEIGHT-30,WIDTH,30,function(s){    // Bottom bar
        fill(COLORS.UI.bar);
        noStroke();
        s.fullRect();
        textSize(18);
    },false);

    bottomBar.append(false,5,3,24,24,function(s){    // Side menu button
        s.button('');
        rect(3,6,18,2);
        rect(3,11,18,2);
        rect(3,16,18,2);
    },function(){
        sideMenu.toggleShow();
        saveBasinAsPanel.hide();
    }).append(false,29,0,100,24,function(s){   // Map layer/environmental field indicator
        let basin = UI.viewBasin;
        let txtStr = "Map Layer: ";
        let red = false;
        if(basin.env.displaying!==-1){
            let f = basin.env.fieldList[basin.env.displaying];
            txtStr += basin.env.getDisplayName(f) + " -- ";
            let x;
            let y;
            let S = selectedStorm && selectedStorm.aliveAt(viewTick);
            if(S){
                let p = selectedStorm.getStormDataByTick(viewTick,true).pos;
                x = p.x;
                y = p.y;
            }else{
                x = getMouseX();
                y = getMouseY();
            }
            if(x >= WIDTH || x < 0 || y >= HEIGHT || y < 0 || (basin.env.fields[f].oceanic && land.get(Coordinate.convertFromXY(basin.mapType, x, y)))){
                txtStr += "N/A";
            }else{
                let v = basin.env.get(f,x,y,viewTick);
                if(v===null){
                    txtStr += "Unavailable";
                    red = true;
                }else
                    txtStr += basin.env.formatFieldValue(f,v);
            }
            txtStr += " @ " + (S ? "selected storm" : "pointer");
            if(viewTick<=basin.env.fields[f].accurateAfter){
                txtStr += ' [MAY BE INACCURATE]';
                red = true;
            }
        }else txtStr += "none";
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            s.fullRect();
        }
        if(red) fill('red');
        else fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        UI.viewBasin.env.displayNext();
    });

    bottomBar.append(false,WIDTH-29,3,24,24,function(s){    // Fullscreen button
        s.button('',false);
        stroke(0);
        if(document.fullscreenElement===canvas){
            line(9,4,9,9);
            line(4,9,9,9);
            line(15,4,15,9);
            line(20,9,15,9);
            line(9,20,9,15);
            line(4,15,9,15);
            line(15,20,15,15);
            line(20,15,15,15);
        }else{
            line(4,4,4,9);
            line(4,4,9,4);
            line(20,4,20,9);
            line(20,4,15,4);
            line(4,20,4,15);
            line(4,20,9,20);
            line(20,20,20,15);
            line(20,20,15,20);
        }
    },function(){
        toggleFullscreen();
    }).append(false,-29,0,24,24,function(s){  // Help button
        noStroke();
        s.button("?",false,22);
    },function(){
        helpBox.toggleShow();
    });

    let timeline;
    let season_button;
    let timelineBox;
    let best_track_button;
    let best_track_view = false;
    let best_track_page = 0;

    const INFO_PANEL_LEFT_BOUND = 11*WIDTH/16;

    stormInfoPanel = panel_timeline_container.append(false, INFO_PANEL_LEFT_BOUND, 0, WIDTH-INFO_PANEL_LEFT_BOUND, HEIGHT-topBar.height-bottomBar.height, function(s){
        let S = this.target;
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        const txt_width = 7*this.width/8;
        const left_col_width = 7*txt_width/16;
        const right_col_width = 9*txt_width/16;
        let name;
        let txt_y = 35;
        let info_row = (left, right)=>{
            left = wrapText('' + left, left_col_width);
            right = wrapText('' + right, right_col_width);
            textAlign(LEFT, TOP);
            text(left, this.width/16, txt_y);
            textAlign(RIGHT, TOP);
            text(right, 15*this.width/16, txt_y);
            txt_y += max(countTextLines(left) * textLeading(), countTextLines(right) * textLeading()) + 3;
        };
        if(S instanceof Storm){
            season_button.show();
            name = S.getFullNameByTick("peak");
            name = wrapText(name, txt_width);
            text(name, this.width/2, txt_y);
            txt_y += countTextLines(name)*textLeading();
            textSize(15);
            let right_txt = '';
            if(S.inBasinTC){
                let enterTime = formatDate(UI.viewBasin.tickMoment(S.enterTime));
                let exitTime = formatDate(UI.viewBasin.tickMoment(S.exitTime));
                right_txt += enterTime;
                if(S.enterTime > S.formationTime)
                    right_txt += ' (entered basin)';
                right_txt += ' -\n';
                if(S.exitTime){
                    right_txt += exitTime;
                    if(!S.dissipationTime || S.exitTime < S.dissipationTime)
                        right_txt += ' (left basin)';
                }else
                    right_txt += 'currently active';
            }else if(S.TC){
                let formTime = formatDate(UI.viewBasin.tickMoment(S.formationTime));
                let dissTime = formatDate(UI.viewBasin.tickMoment(S.dissipationTime));
                right_txt += formTime + ' -\n';
                if(S.dissipationTime)
                    right_txt += dissTime;
                else
                    right_txt += 'currently active';
            }else
                right_txt += "N/A";
            info_row('Dates active', right_txt);
            if(S.peak)
                info_row('Peak pressure', S.peak.pressure + ' hPa');
            else
                info_row('Peak pressure', 'N/A');
            if(S.windPeak)
                info_row('Peak wind speed', displayWindspeed(S.windPeak.windSpeed));
            else
                info_row('Peak wind speed', 'N/A');
            let circulationData = S.getStormDataByTick(viewTick,true);
            if(circulationData instanceof StormData){
                info_row(
                    'Circulation size',
                    StormData.circulationSizeLabel(circulationData.circulationSize) + '\n' + round(circulationData.radiusOfMaxWind) + ' nmi RMW'
                );
                if(circulationData.type===TROP || circulationData.type===SUBTROP){
                    let eyeDiameter = Number.isFinite(circulationData.eyeDiameter) ?
                        round(circulationData.eyeDiameter*10)/10 + ' nmi diameter' :
                        StormData.eyeTypeDiameterLabel(circulationData.eyeType);
                    info_row(
                        'Eye type',
                        StormData.eyeTypeLabel(circulationData.eyeType) + '\n' + eyeDiameter
                    );
                }
            }
            info_row('ACE', S.ACE);
            info_row('Damage', damageDisplayNumber(S.damage));
            info_row('Deaths', S.deaths);
            info_row('Landfalls', S.landfalls);
        }else{
            name = seasonName(S);
            name = wrapText(name, txt_width);
            text(name, this.width/2, txt_y);
            txt_y += countTextLines(name)*textLeading();
            textSize(15);
            let se = UI.viewBasin.fetchSeason(S);
            if(se instanceof Season){
                let stats = se.stats(UI.viewBasin.mainSubBasin);
                let counters = stats.classificationCounters;
                let scale = UI.viewBasin.getScale(UI.viewBasin.mainSubBasin);
                for(let {statName, cNumber} of scale.statDisplay())
                    info_row(statName, counters[cNumber]);
                info_row('Total ACE', stats.ACE);
                info_row('Damage', damageDisplayNumber(stats.damage));
                info_row('Deaths', stats.deaths);
                info_row('Landfalls', stats.landfalls);
                if(stats.most_intense){
                    let most_intense = stats.most_intense.fetch();
                    info_row('Most Intense', most_intense.getNameByTick(-1) + '\n' + most_intense.peak.pressure + ' hPa\n' + displayWindspeed(most_intense.windPeak.windSpeed));
                }else
                    info_row('Most Intense', 'N/A');
            }else
                text('Season Data Unavailable', this.width/2, txt_y);
        }
    },true);

    let timeline_container = panel_timeline_container.append(false,0,0,0,0);

    function find_next_storm(storm,prev){
        if(storm instanceof Storm){
            let season = storm.basin.fetchSeason(storm.statisticalSeason());
            if(season instanceof Season){
                let recent;
                let found_me;
                for(let s of season.forSystems()){
                    if(s instanceof Storm){
                        if(s === storm){
                            if(prev)
                                return recent;
                            else
                                found_me = true;
                        }else if(s.inBasinTC){
                            if(prev)
                                recent = s;
                            else if(found_me)
                                return s;
                        }
                    }
                }
            }
        }
    }

    panel_timeline_container.append(false,INFO_PANEL_LEFT_BOUND+3,3,24,24,function(s){   // info panel/timeline previous storm/season button
        if(timeline.active())
            this.setBox(WIDTH*0.05,5,24,24);
        else
            this.setBox(INFO_PANEL_LEFT_BOUND+3,3,24,24);
        let S = stormInfoPanel.target;
        let grey;
        if(S instanceof Storm)
            grey = !find_next_storm(S,true);
        else
            grey = S<=UI.viewBasin.getSeason(0);
        s.button('',false,18,grey);
        triangle(19,5,19,19,5,12);
    },function(){
        let s = stormInfoPanel.target;
        if(s instanceof Storm){
            let n = find_next_storm(s,true);
            if(n)
                stormInfoPanel.target = n;
        }else if(s>UI.viewBasin.getSeason(0))
            stormInfoPanel.target--;
    });
    
    panel_timeline_container.append(false,WIDTH-27,3,24,24,function(s){ // info panel/timeline next storm/season button
        if(timeline.active())
            this.setBox(WIDTH*0.95-24,5,24,24);
        else
            this.setBox(WIDTH-27,3,24,24);
        let S = stormInfoPanel.target;
        let grey;
        if(S instanceof Storm)
            grey = !find_next_storm(S);
        else
            grey = S>=UI.viewBasin.getSeason(-1);
        s.button('',false,18,grey);
        triangle(5,5,5,19,19,12);
    },function(){
        let s = stormInfoPanel.target;
        if(s instanceof Storm){
            let n = find_next_storm(s);
            if(n)
                stormInfoPanel.target = n;
        }else if(s<UI.viewBasin.getSeason(-1))
            stormInfoPanel.target++;
    });

    season_button = panel_timeline_container.append(false, INFO_PANEL_LEFT_BOUND+30, 3, stormInfoPanel.width-60, 24, function(s){ // Season button
        if(timeline.active())
            this.setBox(5*WIDTH/12, 32, WIDTH/6, 24);
        else
            this.setBox(INFO_PANEL_LEFT_BOUND+30, 3, stormInfoPanel.width-60, 24);
        let t = stormInfoPanel.target;
        if(t instanceof Storm)
            s.button(seasonName(t.statisticalSeason()),false,15);
        else
            this.hide();
    },function(){
        let t = stormInfoPanel.target;
        if(t instanceof Storm)
            stormInfoPanel.target = t.statisticalSeason();
    });
    
    panel_timeline_container.append(false,INFO_PANEL_LEFT_BOUND+30,stormInfoPanel.height-54,stormInfoPanel.width-60,24,function(s){ // info panel "Jump to" button
        if(timeline.active())
            this.setBox(WIDTH*0.95 - WIDTH/6, 32, WIDTH/6, 24);
        else
            this.setBox(INFO_PANEL_LEFT_BOUND+30,stormInfoPanel.height-54,stormInfoPanel.width-60,24);
        s.button("Jump to",false,15,!paused || stormInfoPanel.target===undefined);
    },function(){
        if(paused && stormInfoPanel.target!==undefined){
            let s = stormInfoPanel.target;
            let t;
            if(s instanceof Storm){
                if(s.enterTime) t = s.enterTime;
                else if(s.formationTime) t = s.formationTime;
                else t = s.birthTime;
                t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            }else{
                t = UI.viewBasin.seasonTick(s);
            }
            changeViewTick(t);
        }
    });

    best_track_button = panel_timeline_container.append(false,INFO_PANEL_LEFT_BOUND+30,3,stormInfoPanel.width-60,24,function(s){ // timeline "View Best Track" button
        let target = stormInfoPanel.target;
        if(timeline.active() && target instanceof Storm){
            this.setBox(3*WIDTH/5,32,WIDTH/6,24);
            s.button(best_track_view ? "View Intensity Graph" : "View Best Track",false,15);
        }else
            this.hide();
    },function(){
        let target = stormInfoPanel.target;
        if(timeline.active() && target instanceof Storm){
            best_track_view = !best_track_view;
            best_track_page = 0;
        }
    });
    
    stormInfoPanel.append(false,30,stormInfoPanel.height-27,stormInfoPanel.width-60,24,function(s){ // show season summary timeline button
        s.button("View Timeline",false,15);
    },function(){
        timeline.view();
    });

    timeline = (function(){
        const BOX_WIDTH = WIDTH;
        const BOX_HEIGHT = (HEIGHT-topBar.height-bottomBar.height)*2/3;
        let months = 12;
        let sMonth = 0;
        let parts = [];
        let builtAt;
        let builtFor;
        let active = false;
        let best_track_previous_button;
        let best_track_next_button;

        const BEST_TRACK_ROWS_PER_PAGE = 14;
        const BEST_TRACK_HEADER_Y = 56;
        const BEST_TRACK_FIRST_ROW_Y = 82;
        const BEST_TRACK_ROW_HEIGHT = 16;

        function best_track_entries(target){
            let entries = [];
            if(!(target instanceof Storm)) return entries;
            for(let i=0;i<target.record.length;i++){
                let tick = target.get_tick_from_record_index(i);
                if(target.formationTime!==undefined && tick<target.formationTime) continue;
                if(target.dissipationTime!==undefined && tick>=target.dissipationTime) break;
                let data = target.record[i];
                if(data instanceof StormData) entries.push({tick:tick,data:data});
            }
            return entries;
        }

        function best_track_page_count(target){
            return max(1,ceil(best_track_entries(target).length/BEST_TRACK_ROWS_PER_PAGE));
        }

        function format_best_track_coordinate(value,positive,negative){
            return round(abs(value)*10)/10 + '\u00B0' + (value<0 ? negative : positive);
        }

        function render_best_track(target){
            let entries = best_track_entries(target);
            let pageCount = max(1,ceil(entries.length/BEST_TRACK_ROWS_PER_PAGE));
            best_track_page = constrain(best_track_page,0,pageCount-1);

            text('Best track of ' + target.getFullNameByTick('peak'),BOX_WIDTH*0.5,BOX_HEIGHT*0.03);
            textSize(12);
            textAlign(LEFT,CENTER);
            let timeX = BOX_WIDTH*0.05;
            let latitudeX = BOX_WIDTH*0.34;
            let longitudeX = BOX_WIDTH*0.49;
            let windX = BOX_WIDTH*0.67;
            let pressureX = BOX_WIDTH*0.82;
            text('Date/Time',timeX,BEST_TRACK_HEADER_Y);
            text('Latitude',latitudeX,BEST_TRACK_HEADER_Y);
            text('Longitude',longitudeX,BEST_TRACK_HEADER_Y);
            text('Wind',windX,BEST_TRACK_HEADER_Y);
            text('Pressure',pressureX,BEST_TRACK_HEADER_Y);
            stroke(COLORS.UI.text);
            line(timeX,BEST_TRACK_HEADER_Y+11,BOX_WIDTH*0.9,BEST_TRACK_HEADER_Y+11);
            noStroke();

            let first = best_track_page*BEST_TRACK_ROWS_PER_PAGE;
            let last = min(entries.length,first+BEST_TRACK_ROWS_PER_PAGE);
            for(let i=first;i<last;i++){
                let entry = entries[i];
                let coord = entry.data.coord();
                let y = BEST_TRACK_FIRST_ROW_Y+(i-first)*BEST_TRACK_ROW_HEIGHT;
                text(formatDate(UI.viewBasin.tickMoment(entry.tick)),timeX,y);
                text(format_best_track_coordinate(coord.latitude,'N','S'),latitudeX,y);
                text(format_best_track_coordinate(coord.longitude,'E','W'),longitudeX,y);
                text(displayWindspeed(entry.data.windSpeed),windX,y);
                text(entry.data.pressure + ' hPa',pressureX,y);
            }

            textAlign(CENTER,BOTTOM);
            if(entries.length<1)
                text('No best track data available',BOX_WIDTH*0.5,BOX_HEIGHT-7);
            else if(pageCount>1)
                text('Page ' + (best_track_page+1) + ' / ' + pageCount,BOX_WIDTH*0.5,BOX_HEIGHT-7);
        }

        function build(){
            parts = [];
            let plotWidth = BOX_WIDTH*0.9;
            let target = stormInfoPanel.target;
            if(target!==undefined && !(target instanceof Storm)){
                let gen = s=>{
                    let TCs = [];
                    let beginSeasonTick;
                    let endSeasonTick;
                    for(let sys of s.forSystems()){
                        if(sys.inBasinTC && (UI.viewBasin.getSeason(sys.enterTime)===target || UI.viewBasin.getSeason(sys.enterTime)<target && (sys.exitTime===undefined || UI.viewBasin.getSeason(sys.exitTime-1)>=target))){
                            TCs.push(sys);
                            let dissTime = sys.exitTime || UI.viewBasin.tick;
                            if(beginSeasonTick===undefined || sys.enterTime<beginSeasonTick) beginSeasonTick = sys.enterTime;
                            if(endSeasonTick===undefined || dissTime>endSeasonTick) endSeasonTick = dissTime;
                        }
                    }
                    for(let n=0;n<TCs.length-1;n++){
                        let t0 = TCs[n];
                        let t1 = TCs[n+1];
                        if(t0.enterTime>t1.enterTime){
                            TCs[n] = t1;
                            TCs[n+1] = t0;
                            if(n>0) n -= 2;
                        }
                    }
                    let sMoment = UI.viewBasin.tickMoment(beginSeasonTick);
                    sMonth = sMoment.month();
                    sMoment.startOf('month');
                    let beginPlotTick = UI.viewBasin.tickFromMoment(sMoment);
                    let eMoment = UI.viewBasin.tickMoment(endSeasonTick);
                    eMoment.endOf('month');
                    let endPlotTick = UI.viewBasin.tickFromMoment(eMoment);
                    months = eMoment.diff(sMoment,'months') + 1;
                    for(let t of TCs){
                        let part = {};
                        part.storm = t;
                        part.segments = [];
                        part.label = t.getNameByTick(-2);
                        let aSegment;
                        for(let q=0;q<t.record.length;q++){
                            let rt = ceil(t.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS + q*ADVISORY_TICKS;
                            let d = t.record[q];
                            if(tropOrSub(d.type)&&land.inBasin(d.coord())){
                                let clsn = UI.viewBasin.getScale(UI.viewBasin.mainSubBasin).get(d);
                                if(!aSegment){
                                    aSegment = {};
                                    part.segments.push(aSegment);
                                    aSegment.startTick = rt;
                                    aSegment.maxCat = clsn;
                                    aSegment.fullyTrop = (d.type===TROP);
                                }
                                if(clsn > aSegment.maxCat) aSegment.maxCat = clsn;
                                aSegment.fullyTrop = aSegment.fullyTrop || (d.type===TROP);
                                aSegment.endTick = rt;
                            }else if(aSegment) aSegment = undefined;
                        }
                        for(let q=0;q<part.segments.length;q++){
                            let seg = part.segments[q];
                            seg.startX = map(seg.startTick,beginPlotTick,endPlotTick,0,plotWidth);
                            seg.endX = map(seg.endTick,beginPlotTick,endPlotTick,0,plotWidth);
                        }
                        let rowFits;
                        part.row = -1;
                        textSize(12);
                        let thisLabelZone = textWidth(part.label) + 6;
                        do{
                            part.row++;
                            rowFits = true;
                            for(let q=0;q<parts.length;q++){
                                let p = parts[q];
                                let otherLabelZone = textWidth(p.label) + 6;
                                let thisS = part.segments[0].startX;
                                let thisE = part.segments[part.segments.length-1].endX + thisLabelZone;
                                let otherS = p.segments[0].startX;
                                let otherE = p.segments[p.segments.length-1].endX + otherLabelZone;
                                if(p.row===part.row){
                                    if(thisS>=otherS && thisS<=otherE ||
                                        thisE>=otherS && thisE<=otherE ||
                                        otherS>=thisS && otherS<=thisE ||
                                        otherE>=thisS && otherE<=thisE) rowFits = false;
                                }
                            }
                        }while(!rowFits);
                        parts.push(part);
                    }
                };
                if(UI.viewBasin.fetchSeason(target)) gen(UI.viewBasin.fetchSeason(target));
                else{
                    months = 12;
                    sMonth = 0;
                    UI.viewBasin.fetchSeason(target,false,false,s=>{
                        gen(s);
                    });
                }
            }else{
                months = 12;
                sMonth = 0;
            }
            builtFor = target;
            builtAt = UI.viewBasin.tick;
        }

        const lBound = BOX_WIDTH*0.05;
        const rBound = BOX_WIDTH*0.95;
        const tBound = BOX_HEIGHT*0.2;
        const bBound = BOX_HEIGHT*0.93;
        const maxRowFit = Math.floor((bBound-tBound)/15);

        timelineBox = timeline_container.append(false,0,0,BOX_WIDTH,BOX_HEIGHT,function(s){
            let target = stormInfoPanel.target;
            if(!(target instanceof Storm)){
                best_track_view = false;
                best_track_page = 0;
            }
            let showingBestTrack = best_track_view && target instanceof Storm;
            let pageCount = showingBestTrack ? best_track_page_count(target) : 1;
            if(target instanceof Storm)
                best_track_button.show();
            else
                best_track_button.hide();
            if(showingBestTrack && pageCount>1){
                best_track_previous_button.show();
                best_track_next_button.show();
            }else{
                best_track_previous_button.hide();
                best_track_next_button.hide();
            }
            if(target!==builtFor || (UI.viewBasin.tick!==builtAt && (UI.viewBasin.getSeason(builtAt)===target || UI.viewBasin.getSeason(builtAt)===(target+1)))) build();
            fill(COLORS.UI.box);
            noStroke();
            s.fullRect();
            fill(COLORS.UI.text);
            textAlign(CENTER,TOP);
            textSize(18);
            if(target === undefined)
                text('No timeline selected', BOX_WIDTH * 0.5, BOX_HEIGHT * 0.03);
            else if(target instanceof Storm){
                if(showingBestTrack){
                    season_button.show();
                    render_best_track(target);
                    return;
                }
                text('Intensity graph of ' + target.getFullNameByTick('peak'), BOX_WIDTH * 0.5, BOX_HEIGHT * 0.03);
                season_button.show();
                const intensity_right_bound = BOX_WIDTH*0.90;
                let begin_tick = target.enterTime;
                let end_tick = target.exitTime || UI.viewBasin.tick;
                let max_wind;
                let min_pressure;
                let max_pressure;
                for(let t = begin_tick; t <= end_tick; t += ADVISORY_TICKS){
                    let data = target.getStormDataByTick(t);
                    if(data){
                        let w = data.windSpeed;
                        if(max_wind === undefined || w > max_wind)
                            max_wind = w;
                        if(Number.isFinite(data.pressure)){
                            if(min_pressure === undefined || data.pressure < min_pressure)
                                min_pressure = data.pressure;
                            if(max_pressure === undefined || data.pressure > max_pressure)
                                max_pressure = data.pressure;
                        }
                    }
                }
                let scale = UI.viewBasin.getScale(UI.viewBasin.mainSubBasin);
                if(scale.measure === SCALE_MEASURE_ONE_MIN_KNOTS || scale.measure === SCALE_MEASURE_TEN_MIN_KNOTS){
                    let color = scale.getColor(0);
                    let y0 = bBound;
                    for(let i = 1; i < scale.classifications.length; i++){
                        let threshold = scale.classifications[i].threshold;
                        let y1 = map(threshold, 0, max_wind, bBound, tBound, true);
                        fill(red(color), green(color), blue(color), 90);
                        rect(lBound, y1, intensity_right_bound - lBound, y0 - y1);
                        color = scale.getColor(i);
                        y0 = y1;
                        if(threshold > max_wind)
                            break;
                        if(i === scale.classifications.length - 1 && threshold < max_wind){
                            fill(red(color), green(color), blue(color), 90);
                            rect(lBound, tBound, intensity_right_bound - lBound, y0 - tBound);
                        }
                    }
                }
                let pressure_axis_min;
                let pressure_axis_max;
                let pressure_tick_inc;
                const pressure_color = color(0,51,102);
                if(Number.isFinite(min_pressure) && Number.isFinite(max_pressure)){
                    pressure_axis_min = floor(min_pressure/5)*5;
                    pressure_axis_max = ceil(max_pressure/5)*5;
                    if(pressure_axis_min === pressure_axis_max){
                        pressure_axis_min -= 5;
                        pressure_axis_max += 5;
                    }
                    pressure_tick_inc = max(5,ceil((pressure_axis_max-pressure_axis_min)/25)*5);
                    pressure_axis_min = floor(pressure_axis_min/pressure_tick_inc)*pressure_tick_inc;
                    pressure_axis_max = ceil(pressure_axis_max/pressure_tick_inc)*pressure_tick_inc;
                }
                stroke(COLORS.UI.text);
                line(lBound,bBound,intensity_right_bound,bBound);
                line(intensity_right_bound,bBound,intensity_right_bound,tBound);
                if(pressure_axis_min !== undefined){
                    const pressure_axis_x = constrain(intensity_right_bound,0,BOX_WIDTH);
                    const pressure_tick_x = constrain(pressure_axis_x+BOX_WIDTH*0.008,pressure_axis_x,BOX_WIDTH);
                    const pressure_label_x = constrain(min(BOX_WIDTH-31,pressure_axis_x+BOX_WIDTH*0.05),0,BOX_WIDTH);
                    const pressure_tick_count = floor((pressure_axis_max-pressure_axis_min)/pressure_tick_inc);
                    stroke(pressure_color);
                    strokeWeight(1);
                    line(pressure_axis_x,bBound,pressure_axis_x,tBound);
                    fill(pressure_color);
                    textSize(12);
                    textAlign(RIGHT,CENTER);
                    for(let i = 0; i <= pressure_tick_count; i++){
                        let pressure = pressure_axis_min+i*pressure_tick_inc;
                        let y = constrain(map(pressure,pressure_axis_min,pressure_axis_max,bBound,tBound,true),tBound,bBound);
                        line(pressure_axis_x,y,pressure_tick_x,y);
                        noStroke();
                        text(pressure,pressure_label_x,y);
                        stroke(pressure_color);
                    }
                    noStroke();
                    textSize(11);
                    textAlign(RIGHT,BOTTOM);
                    text('hPa',pressure_label_x,max(12,tBound-4));
                }
                textSize(13);
                fill(COLORS.UI.text);
                for(let m = UI.viewBasin.tickMoment(begin_tick).startOf('day'); UI.viewBasin.tickFromMoment(m) <= end_tick; m.add(1, 'd')){
                    stroke(COLORS.UI.text);
                    let x = map(UI.viewBasin.tickFromMoment(m), begin_tick, end_tick, lBound, intensity_right_bound, true);
                    line(x, bBound, x, tBound);
                    noStroke();
                    text(m.date(), x, bBound + BOX_HEIGHT * 0.02);
                }
                textAlign(RIGHT, CENTER);
                let y_axis_inc = ceil((max_wind / 10) / 5) * 5;
                for(let i = 0; i <= max_wind; i += y_axis_inc){
                    stroke(COLORS.UI.text);
                    let y = map(i, 0, max_wind, bBound, tBound);
                    line(lBound - BOX_WIDTH * 0.008, y, lBound, y);
                    noStroke();
                    let unitLocalizedWind = [i, ktsToMph(i, WINDSPEED_ROUNDING), ktsToKmh(i, WINDSPEED_ROUNDING)][simSettings.speedUnit];
                    text(unitLocalizedWind, lBound - BOX_WIDTH * 0.01, y);
                }
                for(let t0 = begin_tick, t1 = t0 + ADVISORY_TICKS; t1 <= end_tick; t0 = t1, t1 += ADVISORY_TICKS){
                    let w0 = target.getStormDataByTick(t0).windSpeed;
                    let w1;
                    if(target.getStormDataByTick(t1))
                        w1 = target.getStormDataByTick(t1).windSpeed;
                    else
                        w1 = w0;
                    let x0 = map(t0, begin_tick, end_tick, lBound, intensity_right_bound);
                    let y0 = map(w0, 0, max_wind, bBound, tBound);
                    let x1 = map(t1, begin_tick, end_tick, lBound, intensity_right_bound);
                    let y1 = map(w1, 0, max_wind, bBound, tBound);
                    if(tropOrSub(target.getStormDataByTick(t0).type))
                        stroke(COLORS.UI.text);
                    else
                        stroke('#CCC');
                    strokeWeight(5);
                    point(x0, y0);
                    strokeWeight(2);
                    line(x0, y0, x1, y1);
                }
                strokeWeight(1);
                if(pressure_axis_min !== undefined){
                    let pressure_points = [];
                    let pressure_segments = [];
                    let previous_pressure_point;
                    for(let t = begin_tick; t <= end_tick; t += ADVISORY_TICKS){
                        let data = target.getStormDataByTick(t);
                        if(!data || !Number.isFinite(data.pressure)){
                            previous_pressure_point = undefined;
                            continue;
                        }
                        let x = begin_tick === end_tick ? lBound : map(t,begin_tick,end_tick,lBound,intensity_right_bound,true);
                        let y = map(data.pressure,pressure_axis_min,pressure_axis_max,bBound,tBound,true);
                        let plotPoint = {
                            x: constrain(x,lBound,intensity_right_bound),
                            y: constrain(y,tBound,bBound)
                        };
                        pressure_points.push(plotPoint);
                        if(previous_pressure_point)
                            pressure_segments.push([previous_pressure_point,plotPoint]);
                        previous_pressure_point = plotPoint;
                    }
                    stroke(pressure_color);
                    strokeWeight(2);
                    noFill();
                    for(let segment of pressure_segments)
                        line(segment[0].x,segment[0].y,segment[1].x,segment[1].y);
                    strokeWeight(5);
                    for(let plotPoint of pressure_points)
                        point(plotPoint.x,plotPoint.y);
                }
                strokeWeight(1);
            }else{
                text('Timeline of ' + seasonName(target), BOX_WIDTH * 0.5, BOX_HEIGHT * 0.03);
                stroke(COLORS.UI.text);
                line(lBound,bBound,rBound,bBound);
                line(lBound,bBound,lBound,tBound);
                textSize(13);
                let M = ['J','F','M','A','M','J','J','A','S','O','N','D'];
                for(let i=0;i<months;i++){
                    stroke(COLORS.UI.text);
                    let x0 = map(i+1,0,months,lBound,rBound);
                    let x1 = map(i+0.5,0,months,lBound,rBound);
                    line(x0,bBound,x0,tBound);
                    noStroke();
                    text(M[(i+sMonth)%12],x1,bBound+BOX_HEIGHT*0.02);
                }
                noStroke();
                for(let i=0;i<parts.length;i++){
                    let p = parts[i];
                    let y = tBound+(p.row % maxRowFit)*15;
                    let mx = getMouseX()-this.getX();
                    let my = getMouseY()-this.getY();
                    textSize(12);
                    if(mx>=lBound+p.segments[0].startX && mx<lBound+p.segments[p.segments.length-1].endX+textWidth(p.label)+6 && my>=y && my<y+10) stroke(255);
                    else noStroke();
                    for(let j=0;j<p.segments.length;j++){
                        let S = p.segments[j];
                        fill(UI.viewBasin.getScale(UI.viewBasin.mainSubBasin).getColor(S.maxCat,!S.fullyTrop));
                        rect(lBound+S.startX,y,max(S.endX-S.startX,1),10);
                    }
                    let labelLeftBound = lBound + p.segments[p.segments.length-1].endX;
                    fill(COLORS.UI.text);
                    textAlign(LEFT,CENTER);
                    text(p.label,labelLeftBound+3,y+5);
                }
            }
        },function(){
            if(best_track_view) return;
            let newTarget;
            for(let i=parts.length-1;i>=0;i--){
                let p = parts[i];
                let y = tBound+(p.row % maxRowFit)*15;
                let mx = getMouseX()-this.getX();
                let my = getMouseY()-this.getY();
                textSize(12);
                if(mx>=lBound+p.segments[0].startX && mx<lBound+p.segments[p.segments.length-1].endX+textWidth(p.label)+6 && my>=y && my<y+10){
                    newTarget = p.storm;
                    break;
                }
            }
            if(newTarget) stormInfoPanel.target = newTarget;
        },false);

        timelineBox.append(false,timelineBox.width-27,0,27,timelineBox.height,function(s){
            s.button('',false,18);
            triangle(11,timelineBox.height/2-6,11,timelineBox.height/2+6,16,timelineBox.height/2);
        },function(){
            timelineBox.hide();
            stormInfoPanel.show();
            active = false;
            best_track_view = false;
            best_track_page = 0;
        });

        best_track_previous_button = timelineBox.append(false,BOX_WIDTH/2-80,BOX_HEIGHT-27,24,24,function(s){
            s.button('',false,18,best_track_page<1);
            triangle(19,5,19,19,5,12);
        },function(){
            if(best_track_page>0) best_track_page--;
        });

        best_track_next_button = timelineBox.append(false,BOX_WIDTH/2+56,BOX_HEIGHT-27,24,24,function(s){
            let target = stormInfoPanel.target;
            let pageCount = target instanceof Storm ? best_track_page_count(target) : 1;
            s.button('',false,18,best_track_page>=pageCount-1);
            triangle(5,5,5,19,19,12);
        },function(){
            let target = stormInfoPanel.target;
            let pageCount = target instanceof Storm ? best_track_page_count(target) : 1;
            if(best_track_page<pageCount-1) best_track_page++;
        });

        const public = {};

        public.active = function(){
            return active;
        };

        public.view = function(){
            stormInfoPanel.hide();
            timelineBox.show();
            active = true;
            best_track_view = false;
            best_track_page = 0;
        };

        public.reset = function(){
            active = false;
            builtAt = -1;
            best_track_view = false;
            best_track_page = 0;
        };

        return public;
    })();
    
    let returntomainmenu = function(p){
        sideMenu.hide();
        panel_timeline_container.hide();
        timeline.reset();
        primaryWrapper.hide();
        land.clear();
        for(let t in UI.viewBasin.seasonExpirationTimers) clearTimeout(UI.viewBasin.seasonExpirationTimers[t]);
        for(let s in UI.viewBasin.subBasins){
            let sb = UI.viewBasin.subBasins[s];
            if(sb instanceof SubBasin && sb.mapOutline) sb.mapOutline.remove();
        }
        let wait = ()=>{
            UI.viewBasin = undefined;
            if(typeof clearAircraftRecon==='function') clearAircraftRecon();
            mainMenu.show();
        };
        if(p instanceof Promise) p.then(wait);
        else wait();
    };

    sideMenu = primaryWrapper.append(false,0,topBar.height,WIDTH/4,HEIGHT-topBar.height-bottomBar.height,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        text("Menu",this.width/2,10);
    },true,false);

    sideMenu.append(false,5,30,sideMenu.width-10,25,function(s){ // Save and return to main menu button
        s.button("Save and Return to Main Menu",false,15);
    },function(){
        if(UI.viewBasin.saveName===AUTOSAVE_SAVE_NAME) saveBasinAsPanel.invoke(true);
        else{
            returntomainmenu(UI.viewBasin.save());
        }
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Return to main menu w/o saving button
        s.button("Return to Main Menu w/o Saving",false,15);
    },function(){
        areYouSure.dialog(returntomainmenu);
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Save basin button
        let txt = "Save Basin";
        if(UI.viewBasin.tick===UI.viewBasin.lastSaved) txt += " [Saved]";
        s.button(txt,false,15);
    },function(){
        if(UI.viewBasin.saveName===AUTOSAVE_SAVE_NAME) saveBasinAsPanel.invoke();
        else UI.viewBasin.save();
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Save basin as button
        s.button("Save Basin As...",false,15);
    },function(){
        saveBasinAsPanel.invoke();
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Settings menu button
        s.button("Settings",false,15);
    },function(){
        primaryWrapper.hide();
        settingsMenu.show();
        paused = true;
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Designation system editor menu button
        s.button("Edit Designations",false,15);
    },function(){
        desig_editor_definition.refresh();
        primaryWrapper.hide();
        desigSystemEditor.show();
        paused = true;
    }).append(false,0,30,sideMenu.width-10,25,function(s){  // Basin seed button
        s.button('Basin Seed',false,15);
    },function(){
        seedBox.toggleShow();
        if(seedBox.showing) seedBox.clicked();
    });

    saveBasinAsPanel = sideMenu.append(false,sideMenu.width,0,sideMenu.width*3/4,100,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        text("Save Basin As...",this.width/2,10);
        stroke(0);
        line(0,0,0,this.height);
    },true,false);

    let saveBasinAsTextBox = saveBasinAsPanel.append(false,5,40,saveBasinAsPanel.width-10,25,[15,32,function(){
        let n = this.value;
        if(n!=='' && n!==AUTOSAVE_SAVE_NAME){
            if(n===UI.viewBasin.saveName){
                UI.viewBasin.save();
                saveBasinAsPanel.hide();
            }else{
                let f = ()=>{
                    let p = UI.viewBasin.saveAs(n);
                    saveBasinAsPanel.hide();
                    if(saveBasinAsPanel.exit) returntomainmenu(p);
                };
                db.saves.where(':id').equals(n).count().then(c=>{
                    if(c>0) areYouSure.dialog(f,'Overwrite "'+n+'"?');
                    else f();
                });
            }
        }
    }]);

    saveBasinAsTextBox.append(false,0,30,saveBasinAsPanel.width-10,25,function(s){
        let n = UI.focusedInput===saveBasinAsTextBox ? /* textInput */UI.inputData.value : saveBasinAsTextBox.value;
        let grey = n==='' || n===AUTOSAVE_SAVE_NAME;
        s.button('Ok',false,15,grey);
    },function(){
        saveBasinAsTextBox.enterFunc();
    });

    saveBasinAsPanel.invoke = function(exit){
        saveBasinAsPanel.exit = exit;
        saveBasinAsPanel.toggleShow();
        saveBasinAsTextBox.value = UI.viewBasin.saveName===AUTOSAVE_SAVE_NAME ? '' : UI.viewBasin.saveName;
    };

    seedBox = primaryWrapper.append(false,WIDTH/2-100,HEIGHT/2-15,200,30,[18,undefined,function(){  // textbox for copying the basin seed
        this.value = UI.viewBasin.seed.toString();
    }],function(){
        /* textInput */UI.inputData.value = this.value = UI.viewBasin.seed.toString();
        // textInput.setSelectionRange(0,textInput.value.length);
        UI.inputData.selectionStart = 0;
        UI.inputData.selectionEnd = UI.inputData.value.length;
    },false);

    stormImageryPanel = primaryWrapper.append(false,
        WIDTH-STORM_IMAGERY_PANEL_WIDTH-6,36,
        STORM_IMAGERY_PANEL_WIDTH,STORM_IMAGERY_PANEL_HEIGHT,
        function(s){
            fill(COLORS.UI.box);
            noStroke();
            s.fullRect();
            if(!stormImageryIsAvailable(selectedStorm)) return;
            let title = selectedStorm.getFullNameByTick(UI.viewBasin.tick);
            if(!title) title = 'Selected cyclone';
            if(title.length>35) title = title.slice(0,34)+'…';
            fill(COLORS.UI.text);
            textAlign(LEFT,TOP);
            textSize(15);
            text(title,10,5);
            renderStormImageryPanel(this);
        },function(){},false);

    let imageryTabWidth = (STORM_IMAGERY_PANEL_WIDTH-28)/4;
    let renderImageryTab = function(s,label,tab){
        noStroke();
        fill(stormImageryTab===tab ? COLORS.UI.buttonHover : COLORS.UI.buttonBox);
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(13);
        text(label,this.width/2,this.height/2);
    };
    stormImageryCloudsTab = stormImageryPanel.append(false,8,32,imageryTabWidth,27,function(s){
        renderImageryTab.call(this,s,'Clouds','clouds');
    },function(){
        stormImageryTab = 'clouds';
    });
    stormImageryIrBdTab = stormImageryPanel.append(false,12+imageryTabWidth,32,imageryTabWidth,27,function(s){
        renderImageryTab.call(this,s,'IR-BD','irBd');
    },function(){
        stormImageryTab = 'irBd';
    });
    stormImageryBaseScanTab = stormImageryPanel.append(false,16+imageryTabWidth*2,32,imageryTabWidth,27,function(s){
        renderImageryTab.call(this,s,'Base scan','baseScan');
    },function(){
        stormImageryTab = 'baseScan';
    });
    stormImagerySarTab = stormImageryPanel.append(false,20+imageryTabWidth*3,32,imageryTabWidth,27,function(s){
        renderImageryTab.call(this,s,'SAR wind','sar');
    },function(){
        stormImageryTab = 'sar';
    });
    stormImageryPanel.append(false,STORM_IMAGERY_PANEL_WIDTH-29,3,24,24,function(s){
        s.button('X',false,22);
    },function(){
        selectStorm();
        refreshTracks(true);
    });

    // The polar-satellite product is an additional viewer. The original
    // imagery panel remains in place and keeps all of its existing tabs.
    polarSatellitePanel = primaryWrapper.append(false,
        WIDTH-STORM_IMAGERY_PANEL_WIDTH*2-12,36,
        STORM_IMAGERY_PANEL_WIDTH,STORM_IMAGERY_PANEL_HEIGHT,
        function(s){
            fill(COLORS.UI.box);
            noStroke();
            s.fullRect();
            if(!stormImageryIsAvailable(selectedStorm)) return;
            let title = selectedStorm.getFullNameByTick(polarSatelliteSnapshot.tick);
            if(!title) title = 'Selected cyclone';
            title = 'Polar satellite · HD · '+title;
            if(title.length>35) title = title.slice(0,34)+'…';
            fill(COLORS.UI.text);
            textAlign(LEFT,TOP);
            textSize(13);
            text(title,10,5);
            textSize(10);
            text('6-hour snapshot: '+formatDate(UI.viewBasin.tickMoment(
                polarSatelliteSnapshot.tick)),10,20);
            renderPolarSatelliteImageryPanel(this);
        },function(){},false);

    let polarImageryTabGap = 4;
    let polarImageryTabWidth = (STORM_IMAGERY_PANEL_WIDTH-16-
        polarImageryTabGap*3)/4;
    let renderPolarImageryTab = function(s,label,tab){
        noStroke();
        fill(polarSatelliteTab===tab ? COLORS.UI.buttonHover : COLORS.UI.buttonBox);
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(label.length>8 ? 10 : 12);
        text(label,this.width/2,this.height/2);
    };
    polarSatelliteCloudsTab = polarSatellitePanel.append(false,8,32,
        polarImageryTabWidth,27,function(s){
            renderPolarImageryTab.call(this,s,'Clouds','clouds');
        },function(){
            polarSatelliteTab = 'clouds';
        });
    polarSatelliteIrBdTab = polarSatellitePanel.append(false,
        8+polarImageryTabWidth+polarImageryTabGap,32,polarImageryTabWidth,27,function(s){
            renderPolarImageryTab.call(this,s,'IR-BD','irBd');
        },function(){
            polarSatelliteTab = 'irBd';
        });
    polarSatelliteBaseScanTab = polarSatellitePanel.append(false,
        8+2*(polarImageryTabWidth+polarImageryTabGap),32,
        polarImageryTabWidth,27,function(s){
            renderPolarImageryTab.call(this,s,'Base scan','baseScan');
        },function(){
            polarSatelliteTab = 'baseScan';
        });
    polarSatelliteSarTab = polarSatellitePanel.append(false,
        8+3*(polarImageryTabWidth+polarImageryTabGap),32,
        polarImageryTabWidth,27,function(s){
            renderPolarImageryTab.call(this,s,'SAR wind','sar');
        },function(){
            polarSatelliteTab = 'sar';
        });
    polarSatellitePanel.append(false,STORM_IMAGERY_PANEL_WIDTH-29,3,24,24,
        function(s){
            s.button('X',false,22);
        },function(){
            polarSatelliteOpen = false;
            resetStormPolarSatelliteRasters();
            updatePolarSatellitePanel();
        });
    updateStormImageryTabs();
    updatePolarSatellitePanel();

    helpBox = primaryWrapper.append(false,WIDTH/8,HEIGHT/8,3*WIDTH/4,3*HEIGHT/4,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        textSize(15);
        text(HELP_TEXT,10,10);
    },true,false);

    helpBox.append(false,helpBox.width-30,10,20,20,function(s){
        s.button("X",false,22);
    },function(){
        helpBox.hide();
    });

    // Added last so the measurement panel stays above the rest of the map UI.
    let observationBuoyPanel = primaryWrapper.append(false,0,0,WIDTH,HEIGHT,function(){
        if(!helpBox.showing) renderObservationBuoy();
    });

    observationBuoyCloseButton = observationBuoyPanel.append(false,0,0,24,24,function(s){
        s.button('X',false,22);
    },function(){
        clearObservationBuoy(false);
    },false);

    if(typeof initAircraftReconUI==='function')
        initAircraftReconUI(topBar,primaryWrapper,dateIndicator);
};

function mouseInCanvas(){
    return coordinateInCanvas(getMouseX(),getMouseY());
}

function mouseClicked(){
    if(mouseInCanvas() && waitingFor<1){
        UI.click();
        return false;
    }
}

function selectStorm(s){
    // The polar product is a manual snapshot tied to the selected cyclone.
    // Changing the selection closes only that extra viewer; the original
    // imagery panel continues to follow the normal selection behavior.
    polarSatelliteOpen = false;
    polarSatelliteSnapshot = undefined;
    stormImageryHighDefinition = false;
    resetStormPolarSatelliteRasters();
    if(typeof clearAircraftRecon==='function') clearAircraftRecon();
    if(s instanceof Storm){
        selectedStorm = s;
        stormInfoPanel.target = s;
        if(panel_timeline_container && panel_timeline_container.showing)
            panel_timeline_container.hide();
    }else selectedStorm = undefined;
    updateStormImageryPanel();
    updatePolarSatellitePanel();
}

function keyPressed(){
    // console.log("keyPressed: " + key + " / " + keyCode);
    const k = key.toLowerCase();
    keyRepeatFrameCounter = -1;
    if(/* document.activeElement === textInput */ UI.focusedInput){
        switch(keyCode){
            case ESCAPE:
                // textInput.value = UI.focusedInput.value;
                // textInput.blur();
                UI.focusedInput = undefined;
                break;
            case ENTER:
                let u = UI.focusedInput;
                // textInput.blur();
                u.value = UI.inputData.value;
                UI.focusedInput = undefined;
                if(u.enterFunc) u.enterFunc();
                break;
            case UP_ARROW:
                UI.setInputCursorPosition(0, keyIsDown(SHIFT));
                break;
            case DOWN_ARROW:
                UI.setInputCursorPosition(UI.inputData.value.length, keyIsDown(SHIFT));
                break;
            // these are handled by keyRepeat(); break then return false so evt.preventDefault() is called
            case LEFT_ARROW:
            case RIGHT_ARROW:
            case BACKSPACE:
            case DELETE:
                break;
            default:
                if(keyIsDown(CONTROL)){
                    switch(k){
                        case 'x':
                            if(UI.inputData.selectionStart !== UI.inputData.selectionEnd){
                                navigator.clipboard.writeText(UI.inputData.value.slice(UI.inputData.selectionStart, UI.inputData.selectionEnd));
                                UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.selectionStart) + UI.inputData.value.slice(UI.inputData.selectionEnd, UI.inputData.value.length);
                                UI.setInputCursorPosition(UI.inputData.selectionStart);
                            }
                            break;
                        case 'c':
                            if(UI.inputData.selectionStart !== UI.inputData.selectionEnd)
                                navigator.clipboard.writeText(UI.inputData.value.slice(UI.inputData.selectionStart, UI.inputData.selectionEnd));
                            break;
                        case 'v':
                            navigator.clipboard.readText().then(v => {
                                if(!UI.inputData.maxLength || UI.inputData.value.length + v.length - (UI.inputData.selectionEnd - UI.inputData.selectionStart) <= UI.inputData.maxLength){
                                    UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.selectionStart) + v + UI.inputData.value.slice(UI.inputData.selectionEnd, UI.inputData.value.length);
                                    UI.setInputCursorPosition(UI.inputData.selectionStart + v.length);
                                }
                            });
                            break;
                        default:
                            return;
                    }
                }
                return;
        }
    }else{
        switch(k){
            case " ":
                if(UI.viewBasin && primaryWrapper.showing){
                    paused = !paused;
                    lastUpdateTimestamp = performance.now();
                }
                break;
            case "a":
                if(UI.viewBasin && paused && primaryWrapper.showing) UI.viewBasin.advanceSim();
                break;
            case "b":
                if(UI.viewBasin && primaryWrapper.showing) clearObservationBuoy(true);
                break;
            case "w":
                simSettings.setShowStrength("toggle");
                break;
            case "e":
                if(UI.viewBasin) UI.viewBasin.env.displayNext();
                break;
            case "f":
                simSettings.setShowWindFields("toggle");
                break;
            case "v":
                simSettings.setShowStormIcons("toggle");
                break;
            case "t":
                simSettings.setTrackMode("incmod",4);
                refreshTracks(true);
                break;
            case "m":
                simSettings.setShowMagGlass("toggle");
                if(UI.viewBasin) UI.viewBasin.env.updateMagGlass();
                break;
            case 'u':
                simSettings.setSpeedUnit("incmod", 3);
                break;
            case 'c':
                simSettings.setColorScheme("incmod", COLOR_SCHEMES.length);
                refreshTracks(true);
                break;
            default:
                switch(keyCode){
                    case KEY_LEFT_BRACKET:
                    if(simSpeed > MIN_SPEED)
                        simSpeed--;
                    break;
                    case KEY_RIGHT_BRACKET:
                    if(simSpeed < MAX_SPEED)
                        simSpeed++;
                    break;
                    case KEY_F11:
                    toggleFullscreen();
                    break;
                    default:
                    return;
                }
        }
    }
    return false;
}

function keyRepeat(){
    if(UI.focusedInput){
        switch(keyCode){
            case LEFT_ARROW:
                if(keyIsDown(LEFT_ARROW)){
                    let i;
                    if(keyIsDown(CONTROL))
                        i = UI.inputData.value.lastIndexOf(' ', UI.inputData.cursor - 2) + 1;
                    else if(UI.inputData.selectionStart !== UI.inputData.selectionEnd && !keyIsDown(SHIFT))
                        i = UI.inputData.selectionStart;
                    else
                        i = UI.inputData.cursor - 1;
                    UI.setInputCursorPosition(Math.max(0, i), keyIsDown(SHIFT));
                }
                break;
            case RIGHT_ARROW:
                if(keyIsDown(RIGHT_ARROW)){
                    let i;
                    if(keyIsDown(CONTROL)){
                        i = UI.inputData.value.indexOf(' ', UI.inputData.cursor + 1);
                        if(i === -1)
                            i = UI.inputData.value.length;
                    }else if(UI.inputData.selectionStart !== UI.inputData.selectionEnd && !keyIsDown(SHIFT))
                        i = UI.inputData.selectionEnd;
                    else
                        i = UI.inputData.cursor + 1;
                    UI.setInputCursorPosition(Math.min(UI.inputData.value.length, i), keyIsDown(SHIFT));
                }
                break;
            case BACKSPACE:
                if(keyIsDown(BACKSPACE)){
                    if(UI.inputData.selectionStart !== UI.inputData.selectionEnd){
                        UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.selectionStart) + UI.inputData.value.slice(UI.inputData.selectionEnd, UI.inputData.value.length);
                        UI.setInputCursorPosition(UI.inputData.selectionStart);
                    }else if(UI.inputData.cursor > 0){
                        UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.cursor - 1) + UI.inputData.value.slice(UI.inputData.cursor, UI.inputData.value.length);
                        UI.setInputCursorPosition(UI.inputData.cursor - 1);
                    }
                }
                break;
            case DELETE:
                if(keyIsDown(DELETE)){
                    if(UI.inputData.selectionStart !== UI.inputData.selectionEnd){
                        UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.selectionStart) + UI.inputData.value.slice(UI.inputData.selectionEnd, UI.inputData.value.length);
                        UI.setInputCursorPosition(UI.inputData.selectionStart);
                    }else if(UI.inputData.cursor < UI.inputData.value.length){
                        UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.cursor) + UI.inputData.value.slice(UI.inputData.cursor + 1, UI.inputData.value.length);
                    }
                }
                break;
            default:
                if(UI.inputData.insert && (!UI.inputData.maxLength || UI.inputData.value.length + UI.inputData.insert.length - (UI.inputData.selectionEnd - UI.inputData.selectionStart) <= UI.inputData.maxLength)){
                    UI.inputData.value = UI.inputData.value.slice(0, UI.inputData.selectionStart) + UI.inputData.insert + UI.inputData.value.slice(UI.inputData.selectionEnd, UI.inputData.value.length);
                    UI.setInputCursorPosition(UI.inputData.selectionStart + UI.inputData.insert.length);
                }
        }
    }
    else if(UI.viewBasin instanceof Basin && paused && primaryWrapper.showing){
        if(keyCode===LEFT_ARROW && viewTick>=ADVISORY_TICKS){
            changeViewTick(ceil(viewTick/ADVISORY_TICKS-1)*ADVISORY_TICKS);
        }else if(keyCode===RIGHT_ARROW){
            let t;
            if(viewTick<UI.viewBasin.tick-ADVISORY_TICKS) t = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
            else t = UI.viewBasin.tick;
            changeViewTick(t);
        }
    }
}

function keyTyped(){
    // console.log(`keyTyped: ${key} / ${keyCode}`);
    if(UI.focusedInput){
        UI.inputData.insert = key;
        return false;
    }
}

function keyReleased(){
    UI.inputData.insert = '';
}

function changeViewTick(t){
    let oldS = UI.viewBasin.getSeason(viewTick);
    viewTick = t;
    let newS = UI.viewBasin.getSeason(viewTick);
    let finish = ()=>{
        refreshTracks(oldS!==newS);
        UI.viewBasin.env.displayLayer();
        updateStormImageryPanel();
    };
    let requisites = s=>{
        let arr = [];
        let allFound = true;
        for(let i=0;i<s.systems.length;i++){
            let r = s.systems[i];
            if(r instanceof StormRef && (r.lastApplicableAt===undefined || r.lastApplicableAt>=viewTick || simSettings.trackMode===2)){
                arr.push(r.season);
                allFound = allFound && UI.viewBasin.fetchSeason(r.season);
            }
        }
        if(allFound) finish();
        else{
            for(let i=0;i<arr.length;i++){
                arr[i] = UI.viewBasin.fetchSeason(arr[i],false,false,true);
            }
            Promise.all(arr).then(finish);
        }
    };
    if(UI.viewBasin.fetchSeason(viewTick,true)){
        requisites(UI.viewBasin.fetchSeason(viewTick,true));
    }else UI.viewBasin.fetchSeason(viewTick,true,false,s=>{
        requisites(s);
    });
    updateStormImageryPanel();
}

// function deviceTurned(){
//     toggleFullscreen();
// }

function wrapText(str,w){
    let newStr = "";
    for(let i = 0, j = 0;i<str.length;i=j){
        if(str.charAt(i)==='\n'){
            i++;
            j++;
            newStr += '\n';
            continue;
        }
        j = str.indexOf('\n',i);
        if(j===-1) j = str.length;
        let line = str.slice(i,j);
        while(textWidth(line)>w){
            let k=0;
            while(textWidth(line.slice(0,k))<=w) k++;
            k--;
            if(k<1){
                newStr += line.charAt(0) + '\n';
                line = line.slice(1);
                continue;
            }
            let l = line.lastIndexOf(' ',k-1);
            if(l!==-1){
                newStr += line.slice(0,l) + '\n';
                line = line.slice(l+1);
                continue;
            }
            let sub = line.slice(0,k);
            l = sub.search(/\W(?=\w*$)/);
            if(l!==-1){
                newStr += line.slice(0,l+1) + '\n';
                line = line.slice(l+1);
                continue;
            }
            newStr += sub + '\n';
            line = line.slice(k);
        }
        newStr += line;
    }
    return newStr;
}

function countTextLines(str){
    let l = 1;
    for(let i=0;i<str.length;i++) if(str.charAt(i)==='\n') l++;
    return l;
}

function ktsToMph(k,rnd){
    let val = k*1.15078;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function ktsToKmh(k,rnd){
    let val = k*1.852;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function displayWindspeed(kts, rnd){
    if(!rnd)
        rnd = WINDSPEED_ROUNDING;
    let value = [kts, ktsToMph(kts,rnd), ktsToKmh(kts,rnd)][simSettings.speedUnit];
    let unitLabel = ['kts', 'mph', 'km/h'][simSettings.speedUnit];
    return `${value} ${unitLabel}`;
}

function oneMinToTenMin(w,rnd){
    let val = w*7/8;    // simple ratio
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function mbToInHg(mb,rnd){
    let val = mb*0.02953;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

// converts a radians-from-east angle into a degrees-from-north heading with compass direction for display formatting
function compassHeading(rad){
    // force rad into range of zero to two-pi
    if(rad < 0)
        rad = 2*PI - (-rad % (2*PI));
    else
        rad = rad % (2*PI);
    // convert heading from radians-from-east to degrees-from-north
    let heading = map(rad,0,2*PI,90,450) % 360;
    let compass;
    // calculate compass direction
    if(heading < 11.25)
        compass = 'N';
    else if(heading < 33.75)
        compass = 'NNE';
    else if(heading < 56.25)
        compass = 'NE';
    else if(heading < 78.75)
        compass = 'ENE';
    else if(heading < 101.25)
        compass = 'E';
    else if(heading < 123.75)
        compass = 'ESE';
    else if(heading < 146.25)
        compass = 'SE';
    else if(heading < 168.75)
        compass = 'SSE';
    else if(heading < 191.25)
        compass = 'S';
    else if(heading < 213.75)
        compass = 'SSW';
    else if(heading < 236.25)
        compass = 'SW';
    else if(heading < 258.75)
        compass = 'WSW';
    else if(heading < 281.25)
        compass = 'W';
    else if(heading < 303.75)
        compass = 'WNW';
    else if(heading < 326.25)
        compass = 'NW';
    else if(heading < 348.75)
        compass = 'NNW';
    else
        compass = 'N';
    heading = round(heading);
    return heading + '\u00B0 '/* degree sign */ + compass;
}

function damageDisplayNumber(d){
    if(d===0) return "none";
    if(d<50000000) return "minimal";
    if(d<1000000000) return "$ " + (round(d/1000)/1000) + " M";
    if(d<1000000000000) return "$ " + (round(d/1000000)/1000) + " B";
    return "$ " + (round(d/1000000000)/1000) + " T";
}

function formatDate(m){
    if(m instanceof moment){
        const f = 'HH[z] MMM DD';
        let str = m.format(f);
        let y = m.year();
        let bce;
        if(y<1){
            y = 1-y;
            bce = true;
        }
        str += ' ' + zeroPad(y,4);
        if(bce) str += ' B.C.E.';
        return str;
    }
}

function seasonName(y,h){
    if(h===undefined) h = UI.viewBasin instanceof Basin && UI.viewBasin.SHem;
    let str = '';
    let eraYear = yr=>{
        if(yr<1) return 1-yr;
        return yr;
    };
    const bce = ' B.C.E.';
    if(h){
        str += zeroPad(eraYear(y-1),4);
        if(y===1) str += bce;
        str += '-' + zeroPad(eraYear(y)%100,2);
        if(y<1) str += bce;
        return str;
    }
    str += zeroPad(eraYear(y),4);
    if(y<1) str += bce;
    return str;
}
