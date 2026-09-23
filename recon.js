// Aircraft reconnaissance is a viewer-side observation product. It samples
// the live simulation along a Hurricane Hunter pass and presents the result
// in the same visual language as an NHC vortex message: a flight track,
// dropsonde releases, a center fix, and wind profiles.

let aircraftRecon;
let aircraftReconPanel;
let aircraftReconCloseButton;
let aircraftReconButton;
let aircraftReconMissionCount = 0;

const AIRCRAFT_RECON_PANEL_WIDTH = 928;
const AIRCRAFT_RECON_PANEL_HEIGHT = 468;
// A replacement eyewall can be only a few map pixels apart. Twenty-five
// points made the transect skip the moat and one of the two wind maxima, so
// keep the flight-level product at roughly one nautical-mile resolution.
const AIRCRAFT_RECON_SAMPLE_COUNT = 161;
const AIRCRAFT_RECON_PROFILE_PALETTE = [
    [190,90,0], [0,125,150], [190,55,65], [50,130,70],
    [120,75,170], [170,130,0], [190,65,135], [55,105,190]
];

function aircraftReconAvailable(){
    return typeof Basin !== 'undefined' && UI.viewBasin instanceof Basin &&
        UI.viewBasin.viewingPresent() &&
        typeof Storm !== 'undefined' && selectedStorm instanceof Storm &&
        typeof ActiveSystem !== 'undefined' &&
        selectedStorm.current instanceof ActiveSystem &&
        selectedStorm.basin===UI.viewBasin;
}

function reconClamp(value,minimum,maximum){
    return Math.max(minimum,Math.min(maximum,value));
}

function reconField(basin,name,x,y,tick,fallback){
    let value = basin.env.get(name,x,y,tick);
    return value===null || value===undefined ||
        (typeof value==='number' && !Number.isFinite(value)) ? fallback : value;
}

function reconWind(basin,x,y,tick,fallback,targetStorm){
    // Query the same target-storm field used by the recon mission instead of
    // summing every nearby cyclone. EnvField.get() has no target-storm
    // argument, so call the map function directly with hemisphere-normalized
    // coordinates when that API is available.
    let value = typeof basin.env.getSurfaceWind==='function' ?
        basin.env.getSurfaceWind(
            x,
            typeof basin.hemY==='function' ? basin.hemY(y) : y,
            tick,
            undefined,
            targetStorm
        ) : basin.env.get('surfaceWind',x,y,tick);
    if(value && typeof value.mag==='function'){
        return {
            speed: Math.max(0,value.mag()),
            heading: typeof value.heading==='function' ? value.heading() : 0
        };
    }
    return {speed:Math.max(0,fallback || 0),heading:0};
}

function reconStormSystem(basin,storm,tick){
    if(!basin || !basin.env ||
        typeof basin.env.getPressureSystems!=='function') return null;
    try{
        let systems = basin.env.getPressureSystems(tick,storm);
        if(!Array.isArray(systems) || systems.length===0) return null;
        return systems.find(system=>system.storm===storm) || systems[0];
    }catch(error){
        // Historical/hand-built test basins may not expose the descriptor
        // cache. The rest of the recon product can still use field samples.
        return null;
    }
}

function reconMapScales(basin){
    if(typeof MAP_TYPES==='undefined' || !MAP_TYPES[basin.mapType]) return null;
    let mapData = MAP_TYPES[basin.mapType];
    if(mapData.form!=='earth' && MAP_TYPES[6]) mapData = MAP_TYPES[6];
    let longitudeSpan = mapData.east-mapData.west;
    if(longitudeSpan<=0) longitudeSpan += 360;
    let latitudeSpan = Math.abs(mapData.north-mapData.south);
    if(longitudeSpan<=0 || latitudeSpan<=0) return null;
    return {
        longitudeScale:WIDTH/longitudeSpan,
        latitudeScale:HEIGHT/latitudeSpan
    };
}

function reconDoubleWallVisible(system){
    if(!system) return false;
    if(typeof simulatedEyewallDoubleWallVisible==='function')
        return simulatedEyewallDoubleWallVisible(system);
    let phase = Number.isFinite(system.eyewallCycle) ? system.eyewallCycle : 0;
    let handoff = Number.isFinite(system.eyewallReplacementHandoff) ?
        system.eyewallReplacementHandoff : 0;
    let failure = Math.max(
        Number.isFinite(system.eyewallFailure) ? system.eyewallFailure : 0,
        0.72*(Number.isFinite(system.eyewallFailureEvent) ?
            system.eyewallFailureEvent : 0)
    );
    return phase>0 && phase<1 || handoff>0.001 || failure>0.05;
}

function reconSmoothStep(edge0,edge1,value){
    if(edge1<=edge0) return value>=edge1 ? 1 : 0;
    let t = reconClamp((value-edge0)/(edge1-edge0),0,1);
    return t*t*(3-2*t);
}

// The map wind field is deliberately compact, while an aircraft transect is
// an analysis product. Preserve the two physical wall maxima in that product
// even when the map-to-nautical-mile conversion leaves both walls between two
// raster pixels. This is only enabled for the same replacement/failure states
// that make the imagery show a double eyewall.
function reconDoubleWallFactor(basin,system,position,center,tick){
    if(!reconDoubleWallVisible(system)) return 1;
    let scales = reconMapScales(basin);
    if(!scales) return 1;

    let systemX = Number.isFinite(system.x) ? system.x : center.x;
    let systemY = Number.isFinite(system.y) ? system.y :
        (typeof basin.hemY==='function' ? basin.hemY(center.y) : center.y);
    let normalizedY = typeof basin.hemY==='function' ?
        basin.hemY(position.y) : position.y;
    let latitudeCosine = Number.isFinite(system.latitudeCosine) ?
        system.latitudeCosine : 1;
    let dx = (position.x-systemX)/scales.longitudeScale*60*latitudeCosine;
    let dy = (normalizedY-systemY)/scales.latitudeScale*60;
    let radiusNm = Math.hypot(dx,dy);
    let rmw = Number.isFinite(system.radiusOfMaxWind) ?
        Math.max(1,system.radiusOfMaxWind) : 1;
    let normalizedRadius = radiusNm/rmw;
    let angle = Math.atan2(dy,dx);

    let replacementRadii = typeof simulatedEyewallRadii==='function' ?
        simulatedEyewallRadii(system,angle,true,tick) : null;
    let physicalOuter = replacementRadii &&
        Number.isFinite(replacementRadii.physicalOuter) ?
        replacementRadii.physicalOuter :
        Number.isFinite(system.eyewallOuterRadius) ?
            system.eyewallOuterRadius : 1.55;
    physicalOuter = Math.max(1.25,physicalOuter);

    let phase = Number.isFinite(system.eyewallCycle) ?
        reconClamp(system.eyewallCycle,0,1) : 0;
    let memory = Number.isFinite(system.eyewallReplacementMemory) ?
        reconClamp(system.eyewallReplacementMemory,0,1) : 0;
    let failure = Math.max(
        Number.isFinite(system.eyewallFailure) ? system.eyewallFailure : 0,
        0.72*(Number.isFinite(system.eyewallFailureEvent) ?
            system.eyewallFailureEvent : 0)
    );
    let active = phase>0 && phase<1;
    let transfer = active ? reconSmoothStep(0.04,0.48,phase) : 1;
    let closure = active ? reconSmoothStep(0.80,1,phase) : 0;
    let settled = memory>0 || failure>0;
    let outerWeight = active ? transfer*(1-closure)+
        (settled ? closure : 0) : 1;
    let outerRadius = 1+(physicalOuter-1)*outerWeight;
    outerRadius = Math.max(1.25,outerRadius);

    let visualFactor = typeof simulatedEyewallReplacementVisualFactor==='function' ?
        reconClamp(simulatedEyewallReplacementVisualFactor(system),0,1) : 1;
    let wallStrength = reconClamp(Math.max(
        active ? 0.72 : 0.50,
        visualFactor,
        reconClamp(failure,0,1)
    ),0,1);
    let structure = reconClamp(Math.max(
        active ? transfer*(1-closure) : 0,
        0.38*memory,
        0.25*failure,
        visualFactor
    ),0,1);
    let innerWidth = 0.13+0.035*structure;
    let outerWidth = 0.16+0.055*structure;
    let innerPeak = Math.exp(-0.5*Math.pow(
        (normalizedRadius-1)/innerWidth,2
    ));
    let outerPeak = Math.exp(-0.5*Math.pow(
        (normalizedRadius-outerRadius)/outerWidth,2
    ));
    let moatWidth = Math.max(0.10,(outerRadius-1)*0.18);
    let moat = Math.exp(-0.5*Math.pow(
        (normalizedRadius-(1+outerRadius)*0.5)/moatWidth,2
    ));
    return Math.max(0.72,1+wallStrength*(
        0.42*innerPeak+0.50*outerPeak-0.18*moat
    ));
}

function reconCoordinateLabel(value,isLatitude){
    if(!Number.isFinite(value)) return '—';
    let hemisphere = isLatitude ? (value>=0 ? 'N' : 'S') : (value>=0 ? 'E' : 'W');
    return Math.abs(value).toFixed(2)+'°'+hemisphere;
}

function reconWindLabel(value){
    return displayWindspeed(Math.round(value || 0),1);
}

function reconRandomSource(seed){
    let state = Math.floor(Math.abs(seed*1000003))>>>0;
    return function(){
        state = (state+0x6D2B79F5)|0;
        let value = state;
        value = Math.imul(value^(value>>>15),value|1);
        value ^= value+Math.imul(value^(value>>>7),value|61);
        return ((value^(value>>>14))>>>0)/4294967296;
    };
}

function reconRandomInteger(random,minimum,maximum){
    return minimum+Math.floor(random()*(maximum-minimum+1));
}

function reconDropPlans(samples,count,maxWindIndex,minPressureIndex,random){
    let plans = [];
    let usedIndexes = new Set();
    let addPlan = function(focus,anchor,spread){
        let sampleIndex;
        for(let attempt=0;attempt<32;attempt++){
            let offset = reconRandomInteger(random,-spread,spread);
            let candidate = reconClamp(anchor+offset,0,samples.length-1);
            if(!usedIndexes.has(candidate)){
                sampleIndex = candidate;
                break;
            }
        }
        if(sampleIndex===undefined){
            for(let distance=0;distance<samples.length;distance++){
                let candidates = [anchor-distance,anchor+distance];
                sampleIndex = candidates.find(candidate=>
                    candidate>=0 && candidate<samples.length &&
                    !usedIndexes.has(candidate)
                );
                if(sampleIndex!==undefined) break;
            }
        }
        if(sampleIndex===undefined) return;
        usedIndexes.add(sampleIndex);
        plans.push({sampleIndex,focus});
    };

    // Prioritize both important parts of the pass, while allowing the sonde
    // to drift a few samples away from the exact modeled extrema.
    addPlan('eyewall-gust',maxWindIndex,2);
    addPlan('pressure-minimum',minPressureIndex,3);

    while(plans.length<count){
        let focus = random()<0.5 ? 'eyewall-gust' : 'pressure-minimum';
        let anchor = focus==='eyewall-gust' ? maxWindIndex : minPressureIndex;
        let spread = reconRandomInteger(random,5,18);
        addPlan(focus,anchor,spread);
    }
    return plans;
}

function reconProfileForSample(sample,seed,seaSurfaceTemperature,moisture,focus,coordinate){
    const heights = [0,0.15,0.5,1,1.5,2,2.5,3];
    let surface = Math.max(0,sample.sfmrWind);
    let flight = Math.max(0,sample.flightWind);
    // A dropsonde can catch a short-lived gust while descending through the
    // lowest few hundred metres. Keep the enhancement deterministic per
    // sonde, and let some soundings remain close to the mean wind.
    let gustFactor = 1+0.08*(0.5+0.5*Math.sin(seed*1.31+sample.index*0.73));
    let gustBase = Math.max(
        surface,
        flight,
        Number.isFinite(sample.surfaceWind) ? sample.surfaceWind : 0
    );
    let gust = gustBase*gustFactor;
    let levels = heights.map(height=>{
        let flightBlend = 1-Math.exp(-height/0.42);
        let lowLevelMaximum = Math.exp(-Math.pow((height-0.45)/0.48,2));
        let gustBlend = Math.exp(-Math.pow(height/0.22,2));
        let wind = surface+(flight-surface)*flightBlend+
            (gust-surface)*gustBlend+
            flight*0.085*lowLevelMaximum+
            Math.sin(seed+height*2.4)*1.1;
        let temperature = seaSurfaceTemperature-6.3*height+
            Math.sin(seed+height)*0.25;
        let dewpoint = temperature-(1.1+2.1*(1-moisture));
        return {
            height,
            wind:Math.max(0,wind),
            temperature,
            dewpoint
        };
    });
    return {
        sampleIndex:sample.index,
        focus,
        // Keep the table tied to the exact wind and pressure samples shown in
        // the transect plot instead of independently perturbing either value.
        windSpeed:sample.flightWind,
        pressure:sample.pressure,
        distance:sample.distance,
        coordinate,
        levels
    };
}

function performAircraftRecon(){
    if(!aircraftReconAvailable()) return false;

    let basin = UI.viewBasin;
    let stormData = selectedStorm.current;
    if(!stormData || !stormData.pos) return false;

    let center = typeof stormData.pos.copy==='function' ?
        stormData.pos.copy() : createVector(stormData.pos.x,stormData.pos.y);
    let targetSystem = reconStormSystem(basin,selectedStorm,basin.tick);
    let missionNumber = ++aircraftReconMissionCount;
    let seed = (selectedStorm.id || 1)*0.731 + basin.tick*0.017 + missionNumber*1.913;
    let passAngle = (Math.sin(seed)+1)*Math.PI;
    let passDirection = createVector(Math.cos(passAngle),Math.sin(passAngle));
    let halfLength = reconClamp(112+stormData.windSpeed*0.92,140,238);
    let start = p5.Vector.add(center,p5.Vector.mult(passDirection,-halfLength));
    let end = p5.Vector.add(center,p5.Vector.mult(passDirection,halfLength));
    let samples = [];
    let seaSurfaceTemperature = reconField(
        basin,'SST',center.x,center.y,basin.tick,26
    );
    let centralMoisture = reconField(
        basin,'moisture',center.x,center.y,basin.tick,0.5
    );

    for(let i=0;i<AIRCRAFT_RECON_SAMPLE_COUNT;i++){
        let fraction = i/(AIRCRAFT_RECON_SAMPLE_COUNT-1);
        let rawX = start.x+(end.x-start.x)*fraction;
        let rawY = start.y+(end.y-start.y)*fraction;
        let position = createVector(
            reconClamp(rawX,0,WIDTH-1),
            reconClamp(rawY,0,HEIGHT-1)
        );
        let pressure = reconField(
            basin,'pressure',position.x,position.y,basin.tick,stormData.pressure
        );
        let wind = reconWind(
            basin,
            position.x,
            position.y,
            basin.tick,
            stormData.windSpeed,
            selectedStorm
        );
        let shear = reconField(basin,'shear',position.x,position.y,basin.tick,null);
        let shearMagnitude = shear && typeof shear.mag==='function' ? shear.mag() : 0;
        let moisture = reconField(basin,'moisture',position.x,position.y,basin.tick,centralMoisture);
        samples.push({
            index:i,
            fraction,
            position,
            distance:(fraction-0.5)*halfLength*2,
            pressure,
            heading:wind.heading,
            // Keep the raw field sample so the mission can be calibrated to
            // the selected storm's advertised maximum surface wind below. The
            // environment field is a lower-level circulation proxy and may
            // otherwise under-read the live storm intensity.
            rawSurfaceWind:wind.speed*reconDoubleWallFactor(
                basin,
                targetSystem,
                position,
                center,
                basin.tick
            ),
            shear:shearMagnitude,
            moisture
        });
    }

    // Aircraft observations must be internally consistent with the storm
    // being investigated. The simulated surface-wind field can be smoother
    // than the storm's headline intensity (especially at the eye center),
    // so use its shape but normalize the peak to the current storm wind.
    // This keeps a 165 kt surface-wind storm from producing a 90 kt
    // "maximum" pass while preserving the spatial variation along the flight
    // track.
    let rawPeak = Math.max(...samples.map(sample=>sample.rawSurfaceWind));
    let targetPeak = Number.isFinite(stormData.windSpeed) ?
        Math.max(0,stormData.windSpeed) : rawPeak;
    let windCalibration = rawPeak>0 ? targetPeak/rawPeak : 1;
    for(let sample of samples){
        sample.surfaceWind = sample.rawSurfaceWind*windCalibration;
        let sfmrFactor = 0.94+0.035*Math.sin(seed+sample.index*0.61);
        // NHC's reduction factor is applied to the flight-level wind to
        // estimate the surface wind: surface = flight * R. Therefore the
        // flight-level observation is the calibrated surface value divided
        // by R, with a deterministic R in the 0.87–0.92 range.
        let flightToSurfaceFactor = 0.895+0.025*Math.cos(
            seed*0.7+sample.index*0.47
        );
        sample.sfmrWind = Math.max(0,sample.surfaceWind*sfmrFactor);
        sample.flightWind = flightToSurfaceFactor>0 ?
            Math.max(0,sample.surfaceWind/flightToSurfaceFactor) :
            sample.surfaceWind;
    }

    let minimumPressureSample = samples[0];
    let maximumFlightSample = samples[0];
    let maximumSfmrSample = samples[0];
    for(let sample of samples){
        if(sample.pressure<minimumPressureSample.pressure) minimumPressureSample = sample;
        if(sample.flightWind>maximumFlightSample.flightWind) maximumFlightSample = sample;
        if(sample.sfmrWind>maximumSfmrSample.sfmrWind) maximumSfmrSample = sample;
    }

    let centerCoord = Coordinate.convertFromXY(
        basin.mapType,
        minimumPressureSample.position.x,
        minimumPressureSample.position.y
    );
    // Vary the release count and exact release points per pass. At least one
    // sonde targets the eyewall wind maximum and one targets the pressure
    // minimum; every release still records both variables.
    let dropRandom = reconRandomSource(seed+missionNumber*31.7);
    let dropCount = reconRandomInteger(dropRandom,5,8);
    let dropPlans = reconDropPlans(
        samples,
        dropCount,
        maximumFlightSample.index,
        minimumPressureSample.index,
        dropRandom
    );
    let dropIndexes = dropPlans.map(plan=>plan.sampleIndex);
    let dropsondes = [];
    for(let i=0;i<dropPlans.length;i++){
        let plan = dropPlans[i];
        let sample = samples[plan.sampleIndex];
        let coordinate = Coordinate.convertFromXY(
            basin.mapType,
            sample.position.x,
            sample.position.y
        );
        dropsondes.push(reconProfileForSample(
            sample,
            seed+i*1.7,
            reconField(basin,'SST',sample.position.x,sample.position.y,basin.tick,seaSurfaceTemperature),
            sample.moisture,
            plan.focus,
            coordinate
        ));
    }

    let xs = samples.map(sample=>sample.position.x);
    let ys = samples.map(sample=>sample.position.y);
    let minX = Math.max(0,Math.min(...xs)-38);
    let maxX = Math.min(WIDTH,Math.max(...xs)+38);
    let minY = Math.max(0,Math.min(...ys)-38);
    let maxY = Math.min(HEIGHT,Math.max(...ys)+38);
    if(maxX-minX<150){
        let midX = (minX+maxX)/2;
        minX = reconClamp(midX-75,0,WIDTH-150);
        maxX = minX+150;
    }
    if(maxY-minY<150){
        let midY = (minY+maxY)/2;
        minY = reconClamp(midY-75,0,HEIGHT-150);
        maxY = minY+150;
    }

    let name = selectedStorm.getFullNameByTick(basin.tick) || 'Selected cyclone';
    let missionAircraft = missionNumber%2 ? 'AF309 · WC-130J' : 'NOAA-42 · WP-3D';
    aircraftRecon = {
        basin,
        storm:selectedStorm,
        tick:basin.tick,
        name,
        missionNumber,
        missionAircraft,
        passAngle,
        passHeading:compassHeading(passAngle),
        samples,
        dropsondes,
        dropIndexes,
        centerIndex:minimumPressureSample.index,
        centerCoord,
        minPressure:minimumPressureSample.pressure,
        maxFlightLevelWind:maximumFlightSample.flightWind,
        maxSfmrWind:maximumSfmrSample.sfmrWind,
        maximumFlightIndex:maximumFlightSample.index,
        maximumSfmrIndex:maximumSfmrSample.index,
        shear:minimumPressureSample.shear,
        seaSurfaceTemperature,
        mapBounds:{minX,maxX,minY,maxY}
    };

    if(typeof panel_timeline_container!=='undefined' && panel_timeline_container)
        panel_timeline_container.hide();
    if(typeof sideMenu!=='undefined' && sideMenu) sideMenu.hide();
    if(typeof saveBasinAsPanel!=='undefined' && saveBasinAsPanel) saveBasinAsPanel.hide();
    if(typeof helpBox!=='undefined' && helpBox) helpBox.hide();
    if(typeof stormImageryPanel!=='undefined' && stormImageryPanel) stormImageryPanel.hide();
    if(typeof polarSatellitePanel!=='undefined' && polarSatellitePanel) polarSatellitePanel.hide();
    if(aircraftReconPanel) aircraftReconPanel.show();
    return true;
}

function closeAircraftRecon(){
    if(aircraftReconPanel) aircraftReconPanel.hide();
    if(typeof updateStormImageryPanel==='function') updateStormImageryPanel();
    if(typeof updatePolarSatellitePanel==='function') updatePolarSatellitePanel();
}

function clearAircraftRecon(){
    aircraftRecon = undefined;
    if(aircraftReconPanel) aircraftReconPanel.hide();
}

function reconCard(x,y,w,h){
    noStroke();
    fill(255,70);
    rect(x,y,w,h);
    stroke(70,90);
    strokeWeight(1);
    rect(x,y,w,h);
}

function reconProfileColor(index){
    let profileColor = AIRCRAFT_RECON_PROFILE_PALETTE[
        index%AIRCRAFT_RECON_PROFILE_PALETTE.length
    ];
    return color(profileColor[0],profileColor[1],profileColor[2]);
}

function reconMetric(x,y,w,h,label,value,accent){
    reconCard(x,y,w,h);
    noStroke();
    fill(COLORS.UI.greyText);
    textAlign(LEFT,TOP);
    textSize(10);
    text(label,x+10,y+8);
    fill(accent || 255);
    textSize(16);
    text(value,x+10,y+27);
}

function renderReconTrackMap(recon,x,y,w,h){
    reconCard(x,y,w,h);
    noStroke();
    fill(255,95);
    rect(x+1,y+1,w-2,h-2);
    let bounds = recon.mapBounds;
    let left = x+26;
    let right = x+w-14;
    let top = y+23;
    let bottom = y+h-17;
    let toX = value=>map(value,bounds.minX,bounds.maxX,left,right,true);
    let toY = value=>map(value,bounds.minY,bounds.maxY,top,bottom,true);

    stroke(80,95);
    strokeWeight(1);
    for(let i=0;i<=4;i++){
        let gx=lerp(left,right,i/4);
        let gy=lerp(top,bottom,i/4);
        line(gx,top,gx,bottom);
        line(left,gy,right,gy);
    }
    noFill();
    stroke(0,115,130);
    strokeWeight(2.5);
    beginShape();
    for(let sample of recon.samples)
        vertex(toX(sample.position.x),toY(sample.position.y));
    endShape();

    let maxWind = Math.max(...recon.samples.map(sample=>sample.sfmrWind));
    for(let sample of recon.samples){
        let px=toX(sample.position.x);
        let py=toY(sample.position.y);
        noStroke();
        fill(sample.index===recon.centerIndex ? color(210,145,0) : color(0,95,115));
        ellipse(px,py,sample.sfmrWind===maxWind ? 7 : 4,sample.sfmrWind===maxWind ? 7 : 4);
    }
    for(let index of recon.dropIndexes){
        let sample=recon.samples[index];
        let px=toX(sample.position.x);
        let py=toY(sample.position.y);
        noStroke();
        fill(175,105,0);
        triangle(px-5,py-4,px+5,py-4,px,py+5);
    }

    let centerX=toX(recon.samples[recon.centerIndex].position.x);
    let centerY=toY(recon.samples[recon.centerIndex].position.y);
    noFill();
    stroke(210,145,0);
    strokeWeight(1.5);
    ellipse(centerX,centerY,22,22);
    noStroke();
    fill(120,80,0);
    textAlign(CENTER,CENTER);
    textSize(9);
    text('C',centerX,centerY);

    let aircraftSample=recon.samples[recon.samples.length-1];
    let aircraftX=toX(aircraftSample.position.x);
    let aircraftY=toY(aircraftSample.position.y);
    push();
    translate(aircraftX,aircraftY);
    rotate(recon.passAngle);
    noStroke();
    fill(COLORS.UI.text);
    triangle(8,0,-6,-4,-6,4);
    pop();

    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(11);
    text('Flight track · dropsonde releases',x+10,y+6);
    fill(COLORS.UI.greyText);
    textSize(9);
    text('C = pressure minimum',x+10,y+h-13);
}

function renderReconProfile(recon,x,y,w,h){
    reconCard(x,y,w,h);
    noStroke();
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(11);
    text('Dropsonde wind profiles · all releases',x+10,y+7);
    fill(COLORS.UI.greyText);
    textSize(9);
    text('Near-surface gust and vertical wind profile',x+10,y+21);

    let left=x+45;
    let right=x+w-15;
    let top=y+42;
    let bottom=y+h-23;
    let maxWind=Math.ceil(Math.max(...recon.dropsondes.flatMap(drop=>
        drop.levels.map(level=>level.wind)
    ),40)/20)*20;
    stroke(80,95);
    strokeWeight(1);
    for(let i=0;i<=4;i++){
        let gx=lerp(left,right,i/4);
        line(gx,top,gx,bottom);
        noStroke();
        fill(COLORS.UI.greyText);
        textAlign(CENTER,TOP);
        text(Math.round(maxWind*i/4),gx,bottom+4);
        stroke(80,95);
    }
    for(let height=0;height<=3;height++){
        let gy=map(height,0,3,bottom,top);
        line(left,gy,right,gy);
        noStroke();
        fill(COLORS.UI.greyText);
        textAlign(RIGHT,CENTER);
        text(height,left-5,gy);
        stroke(80,95);
    }
    noFill();
    for(let i=0;i<recon.dropsondes.length;i++){
        let profile=recon.dropsondes[i];
        let profileColor = reconProfileColor(i);
        stroke(profileColor);
        strokeWeight(2);
        beginShape();
        for(let level of profile.levels)
            vertex(map(level.wind,0,maxWind,left,right,true),map(level.height,0,3,bottom,top,true));
        endShape();
        let last=profile.levels[profile.levels.length-1];
        noStroke();
        fill(profileColor);
        ellipse(map(last.wind,0,maxWind,left,right,true),map(last.height,0,3,bottom,top,true),5,5);
    }
    fill(COLORS.UI.greyText);
    textAlign(RIGHT,BOTTOM);
    textSize(9);
    text('Wind speed (kt)',right,bottom+18);
    textAlign(LEFT,TOP);
    text('Height (km)',left,top-13);
}

function renderReconDropsondeReadings(recon,x,y,w,h){
    reconCard(x,y,w,h);
    noStroke();
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(11);
    text('All dropsondes · '+recon.dropsondes.length+' releases',x+10,y+5);
    fill(COLORS.UI.greyText);
    textSize(8);
    text('Center '+
        reconCoordinateLabel(recon.centerCoord.latitude,true)+' '+
        reconCoordinateLabel(recon.centerCoord.longitude,false)+' · Shear '+
        Math.round(recon.shear*10)/10+' kt · '+recon.samples.length+' HDOB samples',
        x+10,y+19);

    let headerY=y+31;
    fill(COLORS.UI.greyText);
    textSize(8.5);
    textAlign(LEFT,TOP);
    text('ID',x+10,headerY);
    textAlign(RIGHT,TOP);
    text('Flight wind',x+157,headerY);
    text('Pressure',x+260,headerY);
    text('Position',x+w-10,headerY);
    stroke(80,90);
    strokeWeight(1);
    line(x+10,y+42,x+w-10,y+42);

    for(let i=0;i<recon.dropsondes.length;i++){
        let profile=recon.dropsondes[i];
        let rowY=y+46+i*11;
        let profileColor=reconProfileColor(i);
        noStroke();
        fill(profileColor);
        rect(x+10,rowY+2,6,6);
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        textSize(9);
        text('S'+String(i+1).padStart(2,'0'),x+21,rowY);
        textAlign(RIGHT,TOP);
        fill(190,55,35);
        text(reconWindLabel(profile.windSpeed),x+157,rowY);
        fill(25,105,165);
        text((Math.round(profile.pressure*10)/10).toFixed(1)+' hPa',x+260,rowY);
        fill(COLORS.UI.text);
        let coordinate=profile.coordinate;
        let position=coordinate ?
            reconCoordinateLabel(coordinate.latitude,true)+' '+
                reconCoordinateLabel(coordinate.longitude,false) :
            (Math.round(profile.distance*10)/10)+' nm along pass';
        text(position,x+w-10,rowY);
    }
}

function renderReconTransect(recon,x,y,w,h){
    reconCard(x,y,w,h);
    noStroke();
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(11);
    text('High-density observations along pass',x+10,y+7);
    fill(COLORS.UI.greyText);
    textSize(9);
    text('Flight-level wind and minimum sea-level pressure',x+10,y+21);

    let left=x+42;
    let right=x+w-43;
    let top=y+42;
    let bottom=y+h-23;
    let maxWind=Math.ceil(Math.max(...recon.samples.map(sample=>sample.flightWind),40)/20)*20;
    let pressures=recon.samples.map(sample=>sample.pressure);
    let pressureMin=Math.floor((Math.min(...pressures)-2)/5)*5;
    let pressureMax=Math.ceil((Math.max(...pressures)+2)/5)*5;
    if(pressureMin===pressureMax){pressureMin-=5;pressureMax+=5;}
    stroke(80,95);
    strokeWeight(1);
    for(let i=0;i<=4;i++){
        let gx=lerp(left,right,i/4);
        line(gx,top,gx,bottom);
        noStroke();
        fill(190,55,35);
        textAlign(CENTER,TOP);
        text(Math.round(maxWind*i/4),gx,bottom+4);
        fill(25,105,165);
        textAlign(CENTER,BOTTOM);
        let pressure=Math.round(pressureMax-(pressureMax-pressureMin)*i/4);
        text(pressure,gx,top-4);
        stroke(80,95);
    }
    for(let sample of recon.samples){
        let px=map(sample.fraction,0,1,left,right);
        if(sample.index===recon.centerIndex){
            stroke(190,135,0,160);
            line(px,top,px,bottom);
        }
    }
    noFill();
    stroke(190,55,35);
    strokeWeight(2);
    beginShape();
    for(let sample of recon.samples)
        vertex(map(sample.fraction,0,1,left,right),map(sample.flightWind,0,maxWind,bottom,top,true));
    endShape();
    stroke(25,105,165);
    strokeWeight(2);
    beginShape();
    for(let sample of recon.samples)
        vertex(map(sample.fraction,0,1,left,right),map(sample.pressure,pressureMin,pressureMax,bottom,top,true));
    endShape();
    for(let sample of recon.samples){
        let px=map(sample.fraction,0,1,left,right);
        noStroke();
        fill(190,55,35);
        ellipse(px,map(sample.flightWind,0,maxWind,bottom,top,true),3,3);
        fill(25,105,165);
        ellipse(px,map(sample.pressure,pressureMin,pressureMax,bottom,top,true),3,3);
    }
    // Keep the legend on the right side of the header. The chart title uses
    // the left side, so both remain readable even at the compact panel width.
    textSize(9);
    fill(190,55,35);
    textAlign(RIGHT,TOP);
    text('Flight wind',x+w-140,y+7);
    fill(25,105,165);
    text('Pressure',x+w-10,y+7);
    fill(COLORS.UI.greyText);
    textAlign(RIGHT,BOTTOM);
    text('Pass distance (nm)',right,bottom+18);
    textAlign(LEFT,TOP);
    text('kt',left-30,bottom+4);
    textAlign(RIGHT,TOP);
    text('hPa',right+35,top-3);
}

function renderAircraftRecon(panel){
    if(!aircraftRecon) return;
    let recon=aircraftRecon;
    colorMode(RGB);
    noStroke();
    fill(COLORS.UI.box);
    panel.schematics().fullRect();
    fill(COLORS.UI.text);
    textAlign(LEFT,TOP);
    textSize(15);
    text('Aircraft recon · vortex data message',18,7);
    textSize(11);
    fill(COLORS.UI.greyText);
    text(recon.name+'  ·  '+recon.missionAircraft+'  ·  '+formatDate(recon.basin.tickMoment(recon.tick)),18,27);
    textAlign(RIGHT,TOP);
    text('Simulated observation',panel.width-42,8);
    text('Pass heading '+recon.passHeading,panel.width-42,25);

    renderReconTrackMap(recon,18,58,468,201);
    let cardX=500;
    reconMetric(cardX,58,199,58,'Min pressure',
        Math.round(recon.minPressure*10)/10+' hPa',color(25,105,165));
    reconMetric(cardX+207,58,199,58,'Max flight-level wind',
        reconWindLabel(recon.maxFlightLevelWind),color(190,90,0));
    renderReconDropsondeReadings(recon,cardX,124,406,135);

    renderReconProfile(recon,18,273,468,178);
    renderReconTransect(recon,500,273,406,178);
    fill(COLORS.UI.greyText);
    textAlign(LEFT,BOTTOM);
    textSize(9);
    text('Model-derived flight-level, SFMR proxy, and dropsonde profile · not a live NOAA feed',18,panel.height-7);
}

function initAircraftReconUI(topBar,wrapper,dateIndicator){
    if(aircraftReconPanel) return;

    aircraftReconButton=topBar.append(false,285,3,128,24,function(s){
        let unavailable=!aircraftReconAvailable();
        this.setBox(Math.max(285,dateIndicator.width+145),3,128,24);
        s.button(aircraftRecon ? 'Recon again' : 'Aircraft recon',true,12,unavailable);
    },function(){
        performAircraftRecon();
    });

    aircraftReconPanel=wrapper.append(false,16,36,
        AIRCRAFT_RECON_PANEL_WIDTH,AIRCRAFT_RECON_PANEL_HEIGHT,function(s){
            renderAircraftRecon(this);
        },function(){},false);
    aircraftReconCloseButton=aircraftReconPanel.append(false,
        AIRCRAFT_RECON_PANEL_WIDTH-31,5,24,24,function(s){
            s.button('X',false,21);
        },function(){
            closeAircraftRecon();
        });
}
