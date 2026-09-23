const WIND_RADIUS_SAMPLE_COUNT = 48;
const WIND_RADIUS_CONFIGS = WIND_IMPACT_LEVELS.map((level,index)=>({
    threshold:level.threshold,
    softLimit:[420,260,180][index]
}));
const WIND_RADIUS_GEOMETRY = Array.from({length:WIND_RADIUS_SAMPLE_COUNT},(_,sample)=>{
    let angle = -Math.PI+sample*2*Math.PI/WIND_RADIUS_SAMPLE_COUNT;
    return {angle,sin:Math.sin(angle),cos:Math.cos(angle)};
});
const WIND_IMPACT_GEOMETRY = Array.from({length:WIND_RADIUS_SAMPLE_COUNT},(_,sample)=>{
    let angle = -Math.PI+(sample+0.5)*2*Math.PI/WIND_RADIUS_SAMPLE_COUNT;
    return {sin:Math.sin(angle),cos:Math.cos(angle)};
});

class Storm{
    constructor(basin,data){
        this.basin = basin instanceof Basin && basin;
        this.current = data instanceof ActiveSystem && data;
        this.id = undefined;
        if(this.current) basin.fetchSeason(-1,true,true).addSystem(this);

        this.TC = false;
        this.inBasinTC = false;
        this.sbData = {};

        this.rotation = random(TAU);
        this.rotationUpdateTimestamp = performance.now();

        this.designations = {};
        this.designations.primary = [];
        this.designations.secondary = [];

        this.birthTime = this.current ? basin.tick : undefined;     // tick formed as a disturbance/low
        this.formationTime = undefined;                             // tick formed as a TC
        this.enterTime = undefined;                                 // tick formed in/entered basin as a TC
        this.exitTime = undefined;                                  // tick degenerated in/left basin as a TC
        this.dissipationTime = undefined;                           // tick degenerated/dissipated as a TC
        this.deathTime = undefined;                                 // tick completely dissipated/left map

        this.record = [];
        this.peak = undefined;
        this.windPeak = undefined;
        this.ACE = 0;
        this.deaths = 0;
        this.damage = 0;
        this.landfalls = 0;
        this.windRadiiCache = undefined;
        if(!this.current && data instanceof LoadData) this.load(data);
    }

    originSeason(){
        return this.basin.getSeason(this.birthTime);
    }

    statisticalSeason(){
        if(this.inBasinTC)
            return this.basin.getSeason(this.enterTime);
        else
            return this.originSeason();
    }

    aliveAt(t){
        return t >= this.birthTime && (!!this.current || t < this.deathTime);
    }

    getStormDataByTick(t,allowCurrent){
        if(!this.aliveAt(t)) return null;
        if(t===this.basin.tick){
            if(allowCurrent) return this.current;
            return this.record.length>0 ? this.record[this.record.length-1] : null;
        }
        return this.record[floor(t/ADVISORY_TICKS)-ceil(this.birthTime/ADVISORY_TICKS)];
    }

    get_tick_from_record_index(i){
        return (ceil(this.birthTime / ADVISORY_TICKS) + i) * ADVISORY_TICKS;
    }

    getNameByTick(t){
        let D = this.designations;
        let str = '';
        if(this.aliveAt(t)){
            let p;
            let s = [];
            let snamed;
            for(let i=0;i<D.primary.length;i++){
                let d = D.primary[i];
                if(!(d instanceof Designation)) continue;
                let e = d.activeAt(t);
                if(e){
                    if(!p) p = d;
                    else if(!p.isName() && d.isName()) p = d;
                    else if(e>p.activeAt(t) && (!p.isName() || d.isName())) p = d;
                }
            }
            for(let i=0;i<D.secondary.length;i++){
                let d = D.secondary[i];
                if(!(d instanceof Designation)) continue;
                if(d.activeAt(t)){
                    if(d.isName() && !snamed){
                        s = [];
                        snamed = true;
                    }
                    if(d.isName() || !snamed) s.push(d);
                }
            }
            s.sort((a,b)=>a.effectiveTicks[0]-b.effectiveTicks[0]);
            let ii;
            for(let i=s.length-1;i>=0;i--){
                if(p && p.isName()) break;
                if(s[i].isName() || !p){
                    p = s[i];
                    ii = i;
                }
            }
            if(ii!==undefined) s.splice(ii,1);
            if(p){
                str += p.value;
                if(s.length>0 && (snamed || !p.isName())){
                    str += ' (';
                    for(let i=0;i<s.length;i++){
                        if(i>0) str += ', ';
                        str += s[i].value;
                    }
                    str += ')';
                }
            }
        }else{
            let p = [];
            let s = [];
            let pnamed;
            let snamed;
            for(let i=0;i<D.primary.length;i++){
                let d = D.primary[i];
                if(!(d instanceof Designation)) continue;
                if(d.isName() && !pnamed){
                    p = [];
                    pnamed = true;
                }
                if(d.isName() || !pnamed) p.push(d);
            }
            p.sort((a,b)=>a.effectiveTicks[0]-b.effectiveTicks[0]);
            for(let i=0;i<D.secondary.length;i++){
                let d = D.secondary[i];
                if(!(d instanceof Designation)) continue;
                if(d.isName() && !snamed){
                    s = [];
                    snamed = true;
                }
                if(d.isName() || !snamed) s.push(d);
            }
            s.sort((a,b)=>a.effectiveTicks[0]-b.effectiveTicks[0]);
            let ii;
            for(let i=s.length-1;i>=0;i--){
                if(p.length>0 && pnamed) break;
                if(s[i].isName() || p.length<1){
                    p = [];
                    p.push(s[i]);
                    if(s[i].isName()) pnamed = true;
                    ii = i;
                }
            }
            if(ii!==undefined) s.splice(ii,1);
            for(let i=0;i<p.length;i++){
                if(i>0) str += '-';
                if(t===-2) str += p[i].truncate();
                else str += p[i].value;
            }
            if(s.length>0 && (snamed || !pnamed) && t!==-2){
                str += ' (';
                for(let i=0;i<s.length;i++){
                    if(i>0) str += ', ';
                    str += s[i].value;
                }
                str += ')';
            }
        }
        return str;
    }

    getFullNameByTick(t){
        let basin = this.basin;
        let data = t==="peak" ? this.windPeak : this.getStormDataByTick(t);
        let name = this.getNameByTick(t==='peak' ? -1 : t);
        let ty = data ? data.type : null;
        let clsnNom = data ? basin.getScale(land.getSubBasin(data.coord())).getStormNom(data) : null;
        let hasbeenTC;
        if(t==='peak') hasbeenTC = this.TC;
        else if(t>=this.formationTime) hasbeenTC = true;
        else hasbeenTC = false;
        let str = '';
        if(!name) str += 'Unnamed ';
        switch(ty){
            case TROP:
            case SUBTROP:
            case MONSOON:
                str += clsnNom;
                if(name) str += ' ' + name;
                break;
            case TROPWAVE:
                if(hasbeenTC){
                    if(name) str += 'Remnants of ' + name;
                    else str += 'Remnant Low';
                }else{
                    if(name) str += 'Invest ' + name;
                    else str += 'Tropical Wave';
                }
                break;
            case EXTROP:
                let bomb = t!=="peak" && this.isBombCyclone(t);
                if(hasbeenTC){
                    str += bomb ? 'Post-Tropical Bomb Cyclone' : 'Post-Tropical Cyclone';
                    if(name) str += ' ' + name;
                }else{
                    if(bomb) str += 'Bomb Cyclone';
                    else if(name) str += 'Invest ' + name;
                    else str += 'Extratropical Cyclone';
                    if(bomb && name) str += ' ' + name;
                }
                break;
        }
        return str;
    }

    isBombCyclone(t){
        if(!Number.isFinite(t)) return false;
        let data = this.getStormDataByTick(t,true);
        if(!(data instanceof StormData) || data.type!==EXTROP) return false;

        // The Bergeron definition is a 24 h pressure fall of 24 hPa at 60°,
        // adjusted by latitude. Clamp the latitude used by the definition so
        // unusually low-latitude systems are not labelled from a tiny fall.
        let previous = this.getStormDataByTick(t-24,true);
        if(!(previous instanceof StormData)) return false;
        let latitude = constrain(abs(data.coord().latitude),25,60);
        let threshold = 24*Math.sin(latitude*Math.PI/180)/Math.sin(60*Math.PI/180);
        return previous.pressure-data.pressure>=threshold;
    }

    getWindFieldContext(tick,data){
        if(!(data instanceof StormData))
            data = this.getStormDataByTick(tick,true);
        if(!(data instanceof StormData)) return null;

        let previousData;
        let motionTicks = ADVISORY_TICKS;
        if(tick===this.basin.tick && this.current){
            let previousIndex = this.record.length-1;
            if(tick%ADVISORY_TICKS===0) previousIndex--;
            if(previousIndex>=0){
                previousData = this.record[previousIndex];
                motionTicks = tick-this.get_tick_from_record_index(previousIndex);
            }
        }else{
            let index = floor(tick/ADVISORY_TICKS)-ceil(this.birthTime/ADVISORY_TICKS);
            if(index>0 && this.record[index-1]){
                previousData = this.record[index-1];
                motionTicks = this.get_tick_from_record_index(index)-
                    this.get_tick_from_record_index(index-1);
            }
        }
        return {data,previousData,motionTicks};
    }

    getWindFieldModel(data,previousData,motionTicks=ADVISORY_TICKS){
        if(!(data instanceof StormData)) return null;

        // Keep the continuous map wind and the reported wind-radius polygons
        // on the same physical model. In particular, pressure breadth is part
        // of the effective RMW; using the raw RMW here creates a tight radial
        // bullseye in the map while the 34/50/64 kt contours sit farther out.
        let motionX = 0;
        let motionY = 0;
        if(previousData instanceof StormData){
            let currentCoord = data.coord();
            let previousCoord = previousData.coord();
            let longitudeDelta = currentCoord.longitude-previousCoord.longitude;
            if(longitudeDelta>180) longitudeDelta -= 360;
            else if(longitudeDelta<-180) longitudeDelta += 360;
            let averageLatitude = (currentCoord.latitude+previousCoord.latitude)/2;
            let hours = max(1,motionTicks*TICK_DURATION/3600000);
            motionX = longitudeDelta*60*Math.cos(averageLatitude*Math.PI/180)/hours;
            motionY = -(currentCoord.latitude-previousCoord.latitude)*60/hours;
            let motionMagnitude = Math.hypot(motionX,motionY);
            if(motionMagnitude>30){
                motionX *= 30/motionMagnitude;
                motionY *= 30/motionMagnitude;
            }
        }

        let maximumWind = data.windSpeed;
        let pressureDeficit = max(1,1010-data.pressure);
        let expectedDeficit = max(8,(maximumWind-25)*0.78);
        let pressureBreadth = constrain(
            Math.sqrt(pressureDeficit/expectedDeficit),
            0.72,data.type===EXTROP ? 1.75 : 1.45
        );
        let radiusOfMaxWind = Number.isFinite(data.radiusOfMaxWind) ?
            data.radiusOfMaxWind : StormData.estimateRadiusOfMaxWind(
                data.pressure,maximumWind,data.type
            );
        let typeFactor = data.type===MONSOON ? 1.4 :
            data.type===EXTROP ? 1.18 : 1;
        let effectiveInnerRadius = radiusOfMaxWind*pressureBreadth*typeFactor;
        let decayExponent = constrain(
            (data.type===EXTROP ? 0.54 : 0.62)/pressureBreadth,
            0.34,0.78
        );
        let circulationDirection = this.basin.SHem ? -1 : 1;
        let radiusFactor = angle=>{
            // One shared low-frequency sector shape keeps the color field
            // from becoming a stack of perfect circles, while using the same
            // shape for all thresholds keeps it aligned with the wind rings.
            let smoothAmplitude = data.type===MONSOON ? 0.19 :
                data.type===EXTROP ? 0.17 : 0.13;
            let phase = data.pos.x*0.035+data.pos.y*0.021;
            let sectorShape = 0.70*Math.sin(phase+angle*2)+
                0.20*Math.cos(phase*0.71-angle)+
                0.10*Math.sin(phase*1.37+angle*3);
            let smoothBias = smoothAmplitude*sectorShape;
            return constrain(
                1+smoothBias,
                data.type===MONSOON ? 0.72 : data.type===EXTROP ? 0.76 : 0.80,
                data.type===MONSOON ? 1.28 : data.type===EXTROP ? 1.24 : 1.20
            );
        };

        return {
            maximumWind,
            motionX,
            motionY,
            pressureBreadth,
            effectiveInnerRadius,
            decayExponent,
            circulationDirection,
            radiusFactor
        };
    }

    getWindRadii(data,previousData,motionTicks=ADVISORY_TICKS){
        if(!(data instanceof StormData) || !Number.isInteger(data.type) || data.type<0 || data.type>=STORM_TYPES) return [];

        let previousX = previousData instanceof StormData ? previousData.pos.x : undefined;
        let previousY = previousData instanceof StormData ? previousData.pos.y : undefined;
        let cacheKey = [data.pos.x,data.pos.y,data.pressure,data.windSpeed,data.type,
            data.radiusOfMaxWind,previousX,previousY,motionTicks];
        let cached = this.windRadiiCache;
        if(cached && cached.key.every((value,index)=>value===cacheKey[index]))
            return cached.value;

        let model = this.getWindFieldModel(data,previousData,motionTicks);
        if(!model) return [];
        let {
            maximumWind,motionX,motionY,effectiveInnerRadius,decayExponent,
            circulationDirection,radiusFactor
        } = model;
        let configs = WIND_RADIUS_CONFIGS;
        let sampleCount = WIND_RADIUS_SAMPLE_COUNT;
        let motionMagnitudeSq = sq(motionX)+sq(motionY);

        let result = [];
        for(let level=0;level<configs.length;level++){
            let config = configs[level];
            // The reported maximum wind already represents the strongest wind
            // anywhere in the system. Motion may shape a qualifying wind field,
            // but it must never create a threshold above that reported maximum.
            if(maximumWind<config.threshold) continue;
            // Keep extreme-mode wind fields usable without pinning every large
            // storm to exactly the same radius. Past the former hard limit the
            // radius continues to grow logarithmically instead of being clipped.
            let radii = [];
            let hasThresholdWind = false;
            for(let sample=0;sample<sampleCount;sample++){
                let geometry = WIND_RADIUS_GEOMETRY[sample];
                let angle = geometry.angle;
                // Tangential cyclone-relative wind: counter-clockwise in the
                // northern hemisphere and clockwise in the southern hemisphere.
                let tangentX = circulationDirection*geometry.sin;
                let tangentY = -circulationDirection*geometry.cos;
                let alongMotion = motionX*tangentX+motionY*tangentY;
                let discriminant = sq(alongMotion)+sq(config.threshold)-motionMagnitudeSq;
                let requiredCycloneWind = discriminant>0 ?
                    -alongMotion+Math.sqrt(discriminant) : 0;
                let radius = 0;
                if(requiredCycloneWind<=maximumWind){
                    radius = effectiveInnerRadius*pow(maximumWind/max(1,requiredCycloneWind),1/decayExponent);
                    hasThresholdWind = true;
                }
                let factor = radiusFactor(angle);
                radius *= factor;
                if(radius>config.softLimit)
                    radius = config.softLimit*(1+0.35*Math.log(radius/config.softLimit));
                radii.push(round(radius/5)*5);
            }
            if(hasThresholdWind) result.push({threshold:config.threshold,radii});
        }
        this.windRadiiCache = {key:cacheKey,value:result};
        return result;
    }

    getWindImpact(data,previousData,motionTicks=ADVISORY_TICKS){
        if(!(data instanceof StormData)) return null;

        let windFields = this.getWindRadii(data,previousData,motionTicks);
        if(windFields.length<1) return null;

        let fieldsByThreshold = {};
        for(let field of windFields) fieldsByThreshold[field.threshold] = field;
        let outerField = fieldsByThreshold[WIND_IMPACT_LEVELS[0].threshold];
        if(!outerField || !outerField.radii || outerField.radii.length<1) return null;

        // Convert the wind radii from nautical miles to the map's x/y scale.
        // The exposure calculation itself stays in nautical-mile area so its
        // normalization is independent of the selected map projection.
        let mapData = MAP_TYPES[this.basin.mapType];
        if(mapData.form!=='earth') mapData = MAP_TYPES[6];
        let longitudeSpan = mapData.east-mapData.west;
        if(longitudeSpan<=0) longitudeSpan += 360;
        let latitudeSpan = abs(mapData.north-mapData.south);
        let longitudeScale = WIDTH/longitudeSpan;
        let latitudeScale = HEIGHT/latitudeSpan;
        let latitudeCosine = max(0.25,Math.cos(data.coord().latitude*Math.PI/180));

        let damageExposure = 0;
        let deathExposure = 0;
        let sampleCount = outerField.radii.length;
        let sectorAngle = TAU/sampleCount;
        let fields = WIND_IMPACT_LEVELS.map(level=>({
            level,
            field:fieldsByThreshold[level.threshold]
        }));
        let accumulateBand = (level,innerRadius,outerRadius,geometry)=>{
            if(outerRadius<=innerRadius) return;
            for(let radialSample=0;radialSample<WIND_IMPACT_RADIAL_SAMPLES;radialSample++){
                let f0 = radialSample/WIND_IMPACT_RADIAL_SAMPLES;
                let f1 = (radialSample+1)/WIND_IMPACT_RADIAL_SAMPLES;
                let radius0 = lerp(innerRadius,outerRadius,f0);
                let radius1 = lerp(innerRadius,outerRadius,f1);
                // Equal-area radial midpoint; this avoids over-weighting the
                // outer edge of a large ring.
                let sampleRadius = Math.sqrt((sq(radius0)+sq(radius1))/2);
                let radiusX = sampleRadius/(60*latitudeCosine)*longitudeScale;
                let radiusY = sampleRadius/60*latitudeScale;
                let x = data.pos.x+geometry.cos*radiusX;
                let y = data.pos.y+geometry.sin*radiusY;
                let population = land.populationAtXY(x,y);
                if(!population) continue;

                let area = 0.5*(sq(radius1)-sq(radius0))*sectorAngle;
                let normalizedArea = area/WIND_IMPACT_REFERENCE_AREA;
                damageExposure += population*normalizedArea*level.damageMultiplier;
                deathExposure += population*normalizedArea*level.deathMultiplier;
            }
        };

        for(let sample=0;sample<sampleCount;sample++){
            // Use the middle of each angular sector for area sampling rather
            // than reusing the polygon vertices used for rendering.
            let geometry = WIND_IMPACT_GEOMETRY[sample];
            let outerRadius = max(0,outerField.radii[sample] || 0);
            let middleRadius = fields[1].field ?
                max(0,fields[1].field.radii[sample] || 0) : 0;
            let innerRadius = fields[2].field ?
                max(0,fields[2].field.radii[sample] || 0) : 0;

            // Wind fields should be nested, but clamping here prevents a
            // smoothed edge from producing a negative ring or double-count.
            middleRadius = min(outerRadius,middleRadius);
            innerRadius = min(middleRadius,innerRadius);
            accumulateBand(fields[0].level,middleRadius,outerRadius,geometry);
            accumulateBand(fields[1].level,innerRadius,middleRadius,geometry);
            accumulateBand(fields[2].level,0,innerRadius,geometry);
        }

        return {damageExposure,deathExposure};
    }

    getWindFieldQuadrants(level){
        if(!level || !level.radii || typeof level.radii.length!=="number") return [];

        let sampleCount = level.radii.length;
        let quadrants = [];
        for(let quadrant=0;quadrant<WIND_FIELD_QUADRANT_COUNT;quadrant++){
            let start = floor(quadrant*sampleCount/WIND_FIELD_QUADRANT_COUNT);
            let end = floor((quadrant+1)*sampleCount/WIND_FIELD_QUADRANT_COUNT);
            let total = 0;
            for(let sample=start;sample<end;sample++) total += max(0,level.radii[sample] || 0);
            let count = max(1,end-start);
            quadrants.push(round(total/count/WINDSPEED_ROUNDING)*WINDSPEED_ROUNDING);
        }
        return quadrants;
    }

    getJMAWindFieldCircle(level){
        if(!level || !level.radii || level.radii.length<1) return null;

        let sampleCount = level.radii.length;
        let radiusTotal = 0;
        let offsetXTotal = 0;
        let offsetYTotal = 0;
        for(let sample=0;sample<sampleCount;sample++){
            let radius = max(0,level.radii[sample] || 0);
            let angle = -PI+sample*TAU/sampleCount;
            radiusTotal += radius;
            offsetXTotal += radius*cos(angle);
            offsetYTotal += radius*sin(angle);
        }

        let radius = radiusTotal/sampleCount;
        let offsetX = 2*offsetXTotal/sampleCount;
        let offsetY = 2*offsetYTotal/sampleCount;
        let offsetMagnitude = Math.hypot(offsetX,offsetY);
        let maxOffset = radius*WIND_FIELD_JMA_MAX_ECCENTRICITY;
        if(offsetMagnitude>maxOffset && offsetMagnitude>0){
            let scale = maxOffset/offsetMagnitude;
            offsetX *= scale;
            offsetY *= scale;
        }

        return {
            radius:round(radius/WINDSPEED_ROUNDING)*WINDSPEED_ROUNDING,
            offsetX,
            offsetY
        };
    }

    renderWindField(){
        if(!this.aliveAt(viewTick)) return;
        let data = this.getStormDataByTick(viewTick,true);
        if(!(data instanceof StormData)) return;

        let context = this.getWindFieldContext(viewTick,data);
        let previousData = context ? context.previousData : undefined;
        let motionTicks = context ? context.motionTicks : ADVISORY_TICKS;

        let radii = this.getWindRadii(data,previousData,motionTicks);
        if(radii.length<1) return;

        let mapData = MAP_TYPES[this.basin.mapType];
        if(mapData.form!=='earth') mapData = MAP_TYPES[6];
        let longitudeSpan = mapData.east-mapData.west;
        if(longitudeSpan<=0) longitudeSpan += 360;
        let latitudeSpan = abs(mapData.north-mapData.south);
        let latitude = data.coord().latitude;
        let longitudeScale = WIDTH/longitudeSpan;
        let latitudeScale = HEIGHT/latitudeSpan;
        let latitudeCosine = max(0.25,Math.cos(latitude*Math.PI/180));
        let styles = {
            34: {fill:[255,215,0,46], stroke:[255,220,0,225]},
            50: {fill:[255,153,0,58], stroke:[255,160,0,235]},
            64: {fill:[255, 92,0,70], stroke:[255,108,0,245]}
        };
        let fieldStyle = Number.isInteger(simSettings.windFieldStyle) &&
            simSettings.windFieldStyle>=0 && simSettings.windFieldStyle<WIND_FIELD_STYLE_COUNT ?
            simSettings.windFieldStyle : WIND_FIELD_STYLE_NHC;

        windFields.push();
        // Environment fields use hemisphere-normalized coordinates. Use the
        // same center here so Southern Hemisphere wind rings do not mirror
        // away from the color field.
        windFields.translate(data.pos.x,this.basin.hemY(data.pos.y));
        windFields.strokeWeight(1.5);
        if(fieldStyle===WIND_FIELD_STYLE_JMA){
            // JMA represents the wind field with one outer (34 kt) circle and
            // an inner 64 kt circle for the hurricane-force wind area.
            // Its center is displaced toward the stronger side of the
            // underlying asymmetric field, so it can be eccentric to the
            // storm center while remaining a simple circle in geographic
            // distance.
            let jmaLevels = [radii[0]];
            let galeLevel = radii.find(level=>level.threshold===64);
            if(galeLevel) jmaLevels.push(galeLevel);
            for(let level of jmaLevels){
                if(!level) continue;
                let style = level.threshold===64 ?
                    {fill:[255,0,0,70],stroke:[255,0,0,245]} : styles[level.threshold];
                let circle = this.getJMAWindFieldCircle(level);
                if(circle && circle.radius>0){
                    let radiusX = circle.radius/(60*latitudeCosine)*longitudeScale;
                    let radiusY = circle.radius/60*latitudeScale;
                    let offsetX = circle.offsetX/(60*latitudeCosine)*longitudeScale;
                    let offsetY = circle.offsetY/60*latitudeScale;
                    windFields.fill(...style.fill);
                    windFields.stroke(...style.stroke);
                    windFields.ellipse(offsetX,offsetY,radiusX*2,radiusY*2);
                }
            }
        }else{
            let previousQuadrants;
            for(let level of radii){
                let style = styles[level.threshold];
                windFields.fill(...style.fill);
                windFields.stroke(...style.stroke);
                windFields.beginShape();
                if(fieldStyle===WIND_FIELD_STYLE_JTWC){
                    // JTWC uses one radius for each of the NW, NE, SE, and SW
                    // quadrants. Draw a short circular arc for each quadrant;
                    // the repeated boundary points also keep the quadrant
                    // divisions visible when adjacent radii differ.
                    let quadrants = this.getWindFieldQuadrants(level);
                    if(previousQuadrants)
                        for(let quadrant=0;quadrant<quadrants.length;quadrant++)
                            quadrants[quadrant] = min(quadrants[quadrant],previousQuadrants[quadrant]);
                    previousQuadrants = quadrants;
                    for(let quadrant=0;quadrant<WIND_FIELD_QUADRANT_COUNT;quadrant++){
                        let radius = quadrants[quadrant];
                        let startAngle = -PI+quadrant*PI/2;
                        for(let step=0;step<=WIND_FIELD_QUADRANT_ARC_SAMPLES;step++){
                            let angle = startAngle+step*PI/2/WIND_FIELD_QUADRANT_ARC_SAMPLES;
                            let radiusX = radius/(60*latitudeCosine)*longitudeScale;
                            let radiusY = radius/60*latitudeScale;
                            windFields.vertex(cos(angle)*radiusX,sin(angle)*radiusY);
                        }
                    }
                }else{
                    // NHC style: retain the smooth 48-point asymmetric
                    // boundary generated by getWindRadii().
                    for(let sample=0;sample<level.radii.length;sample++){
                        let radius = level.radii[sample];
                        let radiusX = radius/(60*latitudeCosine)*longitudeScale;
                        let radiusY = radius/60*latitudeScale;
                        let geometry = WIND_RADIUS_GEOMETRY[sample];
                        windFields.vertex(geometry.cos*radiusX,geometry.sin*radiusY);
                    }
                }
                windFields.endShape(CLOSE);
            }
        }
        windFields.pop();
    }

    renderIcon(){
        if(this.aliveAt(viewTick)){
            let basin = this.basin;
            let adv = this.getStormDataByTick(viewTick);
            let advC = this.getStormDataByTick(viewTick,true);
            let advX = adv ? adv : advC;
            let pr = advC.pressure;
            let st = advC.windSpeed;
            let pos = advC.pos;
            let sb = land.getSubBasin(advX.coord());
            let scale = basin.getScale(sb);
            let scaleIconData = scale.getIcon(advX);
            let ty = advX.type;
            let name = this.getNameByTick(viewTick);
            let showPressureCenter = basin.env.displaying>=0 &&
                basin.env.fieldList[basin.env.displaying]==='pressure';
            let timestamp = performance.now();
            this.rotation -= 0.001 * (timestamp - this.rotationUpdateTimestamp) * pow(1.0115, min(270,st));
            this.rotationUpdateTimestamp = timestamp;
            let drawArms = ()=>{
                let a = scaleIconData.arms;
                if(tropOrSub(ty) && a){
                    stormIcons.push();
                    if(basin.SHem) stormIcons.scale(1,-1);
                    stormIcons.rotate(this.rotation);
                    for(let i=0;i<a;i++){
                        if(i>0) stormIcons.rotate(2*PI/a);
                        stormIcons.beginShape();
                        stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                        stormIcons.bezierVertex(DIAMETER*5/8,-DIAMETER,-DIAMETER*1/2,-DIAMETER*7/8,-DIAMETER*1/2,0);
                        stormIcons.vertex(0,0);
                        stormIcons.bezierVertex(-DIAMETER*1/4,-DIAMETER*5/8,DIAMETER*5/8,-DIAMETER,DIAMETER*5/8,-DIAMETER);
                        stormIcons.endShape();
                    }
                    stormIcons.pop();
                }
            };
            let drawMonsoonIcon = selectedOutline=>{
                let iconColor = selectedOutline ? 255 : COLORS.storm[MONSOON];
                stormIcons.push();
                stormIcons.noFill();
                stormIcons.stroke(iconColor);
                stormIcons.strokeWeight(selectedOutline ? 2.5 : 1.5);
                stormIcons.arc(0,0,DIAMETER*MONSOON_ICON.circulationWidth,DIAMETER*MONSOON_ICON.circulationHeight,-PI*0.12,PI*0.72);
                stormIcons.arc(0,0,DIAMETER*MONSOON_ICON.circulationWidth,DIAMETER*MONSOON_ICON.circulationHeight,PI*0.88,PI*1.72);
                stormIcons.pop();
                stormIcons.noStroke();
                stormIcons.fill(iconColor);
                stormIcons.ellipse(0,0,DIAMETER*(selectedOutline ? MONSOON_ICON.selectedDiameter : MONSOON_ICON.centerDiameter));
                if(!selectedOutline){
                    stormIcons.fill(brightness(COLORS.storm[MONSOON])<75 ? 240 : 0);
                    stormIcons.textSize(showPressureCenter ? 8 : 6.5);
                    stormIcons.text(showPressureCenter ? "L" : MONSOON_ICON.symbol,0,0);
                }
            };
            stormIcons.push();
            stormIcons.translate(pos.x,pos.y);
            stormIcons.textAlign(CENTER,CENTER);
            if(ty===MONSOON){
                if(selectedStorm===this) drawMonsoonIcon(true);
                drawMonsoonIcon(false);
            }else{
                if(selectedStorm===this){
                    stormIcons.noFill();
                    stormIcons.stroke(255);
                    if(ty===EXTROP){
                        stormIcons.textSize(10);
                        stormIcons.text("L",0,0);
                    }else stormIcons.ellipse(0,0,DIAMETER);
                    drawArms();
                }
                stormIcons.fill(scaleIconData.color);
                stormIcons.noStroke();
                if(ty!==EXTROP) stormIcons.ellipse(0,0,DIAMETER);
                drawArms();
                if(ty===EXTROP){
                    stormIcons.fill(COLORS.storm.extL);
                    stormIcons.textSize(10);
                }else{
                    stormIcons.fill(brightness(scaleIconData.color)<75 ? 240 : 0);
                    stormIcons.textSize(8);
                }
                stormIcons.text(showPressureCenter ? "L" : (tropOrSub(ty) ? scaleIconData.symbol : "L"),0,0);
            }
            stormIcons.textStyle(NORMAL);
            stormIcons.fill(0);
            if(simSettings.showStrength || showPressureCenter){
                stormIcons.textSize(10);
                let intensityLabel = simSettings.showStrength ?
                    `${displayWindspeed(floor(st), 1)}\n${floor(pr)} hPa` : `${floor(pr)} hPa`;
                stormIcons.text(intensityLabel,0,DIAMETER + 5);
            }
            if(name){
                stormIcons.textAlign(LEFT,CENTER);
                stormIcons.textSize(14);
                stormIcons.text(name,DIAMETER,0);
            }
            stormIcons.pop();
        }
    }

    renderTrack(newestSegment){
        if(simSettings.trackMode!==3){
            if(this.inBasinTC || simSettings.trackMode===1){
                if(newestSegment){
                    if(this.record.length>1 && (selectedStorm===this || selectedStorm===undefined)){
                        let t = (this.record.length-2)*ADVISORY_TICKS+ceil(this.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS;
                        let adv = this.record[this.record.length-2];
                        let col = this.basin.getScale(land.getSubBasin(adv.coord())).getColor(adv);
                        tracks.stroke(col);
                        let pos = adv.pos;
                        let nextPos = this.record[this.record.length-1].pos;
                        if(simSettings.trackMode===1 || (t>=this.formationTime && (!this.dissipationTime || t<this.dissipationTime))) tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
                    }
                }else if(this.aliveAt(viewTick) || simSettings.trackMode===2 || selectedStorm===this){
                    for(let n=0;n<this.record.length-1;n++){
                        let t = n*ADVISORY_TICKS+ceil(this.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS;
                        if(simSettings.trackMode!==1){
                            if(t<this.formationTime) continue;
                            if(t>=this.dissipationTime) break;
                        }
                        let adv = this.record[n];
                        let col = this.basin.getScale(land.getSubBasin(adv.coord())).getColor(adv);
                        tracks.stroke(col);
                        let pos = adv.pos;
                        let nextPos = this.record[n+1].pos;
                        tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
                    }
                }
            }
            if(selectedStorm===this && this.basin.viewingPresent() && this.current){
                forecastTracks.clear();
                const points = this.current.trackForecast;
                let p0;
                // A newly spawned live system can be selected before its first
                // advisory is recorded. In that state `record` is empty, so
                // there is no historical point to seed the forecast from.
                // Use the live position instead and wait quietly if the
                // forecast ensemble has not produced any points yet.
                let lastRecord = this.record.length>0 ?
                    this.record[this.record.length-1] : undefined;
                let p1 = lastRecord && lastRecord.pos ? lastRecord.pos :
                    this.current.pos;
                if(!p1 || !(points instanceof Array) || points.length===0)
                    return;
                let rVec = createVector(0);
                let r0 = 0;
                let r1 = 0.01;
                for(let hour of [12, 24, 36, 48, 60, 72, 96, 120]){
                    const n = hour / ADVISORY_TICKS - 1;
                    if(!points[n]) break;
                    r0 = r1;
                    r1 = hour * 0.7 / 2;
                    p0 = p1;
                    p1 = points[n];
                    forecastTracks.circle(p1.x, p1.y, r1 * 2);
                    forecastTracks.beginShape();
                    rVec.set(p1.x, p1.y);
                    rVec.sub(p0.x, p0.y);
                    rVec.rotate(PI / 2);
                    rVec.setMag(r0);
                    forecastTracks.vertex(p0.x + rVec.x, p0.y + rVec.y);
                    rVec.rotate(PI);
                    forecastTracks.vertex(p0.x + rVec.x, p0.y + rVec.y);
                    rVec.setMag(r1);
                    forecastTracks.vertex(p1.x + rVec.x, p1.y + rVec.y);
                    rVec.rotate(PI);
                    forecastTracks.vertex(p1.x + rVec.x, p1.y + rVec.y);
                    forecastTracks.endShape();
                }
                
                forecastTracks.erase(128, 0);
                forecastTracks.rect(0, 0, WIDTH, HEIGHT);
                forecastTracks.noErase();
            }
        }
    }

    updateStats(data){
        let basin = this.basin;
        let w = data.windSpeed;
        let p = data.pressure;
        let type = data.type;
        let year = basin.getSeason(-1);
        let cSeason = basin.fetchSeason(year,false,true);
        let prevAdvisory = this.record.length>0 ? this.record[this.record.length-1] : undefined;
        let sub = land.getSubBasin(data.coord());
        let prevSub = prevAdvisory ? land.getSubBasin(prevAdvisory.coord()) : sub;
        let wasTCB4Update = prevAdvisory ? tropOrSub(prevAdvisory.type) : false;
        let isTropical = tropOrSub(type);
        let inBasinTropical = isTropical && basin.subInBasin(sub);
        let prevInBasinTropical = wasTCB4Update && basin.subInBasin(prevSub);
        if(!this.TC && isTropical){
            this.TC = true;
            this.formationTime = basin.tick;
            this.peak = undefined;
            this.windPeak = undefined;
        }
        if(!this.inBasinTC && inBasinTropical){
            this.inBasinTC = true;
            this.enterTime = basin.tick;
            this.peak = undefined;
            this.windPeak = undefined;
            this.ACE = 0;
            this.damage = 0;
            this.deaths = 0;
            this.landfalls = 0;
            if(wasTCB4Update) refreshTracks(true);
        }
        let newACE = 0;
        if(w>=ACE_WIND_THRESHOLD && (inBasinTropical || (isTropical && !this.inBasinTC))){
            newACE = pow(w,2)/ACE_DIVISOR;
            this.ACE += newACE;
            this.ACE = round(this.ACE*ACE_DIVISOR)/ACE_DIVISOR;
        }
        for(let subId of basin.forSubBasinChain(sub)){
            let sb = basin.subBasins[subId];
            let classification = basin.getScale(subId).get(data);
            // update classification counters and most intense storm for sub-basin
            if(basin.subInBasin(subId)){
                let stats = cSeason.stats(subId);
                let cCounters = stats.classificationCounters;
                if(isTropical){
                    for(let i=0;i<=classification;i++){
                        if(!this.subBasinData(subId,year,i,true)) cCounters[i]++;
                    }
                    stats.update_most_intense(cSeason, this, data);
                }
                stats.addACE(newACE);
            }
            // apply secondary (PAGASA-style) designations
            if(sb instanceof SubBasin && sb.designationSystem){
                let ds = sb.designationSystem;
                let desArray = this.designations.secondary;
                let numThresh = basin.getScale(subId).numberingThreshold;
                if(ds.numbering.threshold!==undefined) numThresh = ds.numbering.threshold;
                let nameThresh = basin.getScale(subId).namingThreshold;
                if(ds.naming.threshold!==undefined) nameThresh = ds.naming.threshold;
                if(ds.secondary){
                    if(ds.numbering.enabled && isTropical && classification>=numThresh && !this.subBasinData(subId,year,'num',true)){
                        let desig = ds.getNewNum();
                        if(desig) desArray.push(desig);
                    }
                    if(ds.naming.mainLists.length>0 && isTropical && classification>=nameThresh && !this.subBasinData(subId,year,'name',true)){
                        let desig = ds.getNewName();
                        if(desig) desArray.push(desig);
                    }
                }
            }
        }
        // apply primary designations
        let primaryDesSBs = basin.relevantPrimaryDesignationSubBasins(sub);
        let numberingSB = basin.subBasins[primaryDesSBs.numbering];
        let namingSB = basin.subBasins[primaryDesSBs.naming];
        let numberingDS;
        let namingDS;
        if(numberingSB instanceof SubBasin) numberingDS = numberingSB.designationSystem;
        if(namingSB instanceof SubBasin) namingDS = namingSB.designationSystem;
        let desArray = this.designations.primary;
        let designated;
        let subId;
        let ds;
        let classification;
        let threshold;
        let flag;
        for(let isNaming=0;isNaming<=1;isNaming++){
            if(isNaming){
                subId = primaryDesSBs.naming;
                threshold = basin.getScale(subId).namingThreshold;
                if(!namingDS){
                    if(isTropical && !this.subBasinData(sub,year,'name',true)) designated = true;
                    continue;
                }
                ds = namingDS.naming;
                flag = 'name';
            }else{
                subId = primaryDesSBs.numbering;
                threshold = basin.getScale(subId).numberingThreshold;
                if(!numberingDS){
                    if(isTropical && !this.subBasinData(sub,year,'num',true)) designated = true;
                    continue;
                }
                ds = numberingDS.numbering;
                flag = 'num';
            }
            classification = basin.getScale(subId).get(data);
            if(ds.threshold!==undefined) threshold = ds.threshold;
            let altPre = primaryDesSBs.altPre;
            let altSuf = primaryDesSBs.altSuf;
            if(isTropical && classification>=threshold && !this.subBasinData(subId,year,flag,true)){
                let findold = false;
                let keep = false;
                switch(ds.crossingMode){
                    case DESIG_CROSSMODE_ALWAYS:
                        findold = true;
                        break;
                    case DESIG_CROSSMODE_REGEN:
                    case DESIG_CROSSMODE_STRICT_REGEN:
                        // let a = data;
                        // for(let i=this.record.length-1;i>=0;i--){
                        //     if(tropOrSub(this.record[i].type)) a = this.record[i];
                        //     else break;
                        // }
                        // let lastFormedSB = land.getSubBasin(a.pos.x,a.pos.y);
                        // lastFormedSB = basin.relevantPrimaryDesignationSubBasins(lastFormedSB);
                        // if(isNaming) lastFormedSB = lastFormedSB.naming;
                        // else lastFormedSB = lastFormedSB.numbering;
                        // if(lastFormedSB!==subId) keep = true;
                        // else if(ds.crossingMode===DESIG_CROSSMODE_REGEN) findold = true;
                        // break;
                    case DESIG_CROSSMODE_KEEP:
                        keep = true;
                        break;
                }
                let reused = false;
                if(findold){
                    for(let i=0;i<desArray.length;i++){
                        let d = desArray[i];
                        if(d.subBasin===subId && (isNaming ? d.isName() : !d.isName())){
                            d.show(basin.tick);
                            reused = true;
                            designated = true;
                            break;
                        }
                    }
                }else if(keep){
                    for(let i=0;i<desArray.length;i++){
                        let d = desArray[i];
                        if(d.activeAt(basin.tick) && (isNaming ? d.isName() : !d.isName())){
                            reused = true;
                            designated = true;
                            break;
                        }
                    }
                }
                if(!reused){
                    let desig;
                    if(isNaming) desig = namingDS.getNewName();
                    else desig = numberingDS.getNewNum(altPre,altSuf);
                    if(desig){
                        desArray.push(desig);
                        designated = true;
                    }
                }
            }
        }
        if(designated){
            for(let i=0;i<desArray.length;i++){
                let d = desArray[i];
                let dSubId = d.subBasin;
                subId = d.isName() ? primaryDesSBs.naming : primaryDesSBs.numbering;
                if(dSubId!==subId && d.activeAt(basin.tick)){
                    // let dsb = basin.subBasins[dSubId];
                    // if(dsb instanceof SubBasin && dsb.designationSystem){
                    //     let dds = dsb.designationSystem;
                    //     let cm;
                    //     if(d.isName()) cm = dds.naming.crossingMode;
                    //     else cm = dds.numbering.crossingMode;
                    // }
                    flag = d.isName() ? 'name' : 'num';
                    this.subBasinData(dSubId,year,flag,false);
                }
            }
        }

        if(wasTCB4Update && !isTropical) this.dissipationTime = basin.tick;
        if(!wasTCB4Update && isTropical){
            this.dissipationTime = undefined;
            if(this.formationTime!==basin.tick) refreshTracks(true);
        }
        if(prevInBasinTropical && !inBasinTropical) this.exitTime = basin.tick;
        if(!prevInBasinTropical && inBasinTropical) this.exitTime = undefined;
        if((!this.inBasinTC && (!this.TC || isTropical)) || inBasinTropical){
            if(!this.peak)
                this.peak = data;
            else if(p < this.peak.pressure)
                this.peak = data;
            
            if(!this.windPeak)
                this.windPeak = data;
            else if(w > this.windPeak.windSpeed)
                this.windPeak = data;
        }
        cSeason.modified = true;
        basin.fetchSeason(this.originSeason(),false,true).modified = true;
    }

    subBasinData(sub,season,c,set){
        if(!this.sbData[sub]) this.sbData[sub] = {};
        let l = this.sbData[sub];
        if(typeof c === 'number'){
            if(!l.classLog) l.classLog = {};
            l = l.classLog;
            if(!l[season]) l[season] = {};
            l = l[season];
            let v = l[c];
            if(set!==undefined) l[c] = set;
            return v;
        }
        if(c==='num'){
            let v = l.numFlag;
            if(set!==undefined) l.numFlag = set;
            return v;
        }
        if(c==='name'){
            let v = l.nameFlag;
            if(set!==undefined) l.nameFlag = set;
            return v;
        }
    }

    save(){
        let obj = {};
        for(let p of [
            'id',
            'birthTime',
            'deaths',
            'damage',
            'landfalls'
        ]) obj[p] = this[p];
        obj.record = StormData.saveArr(this.record);
        obj.designations = {};
        obj.designations.primary = [];
        obj.designations.secondary = [];
        let P = this.designations.primary;
        let S = this.designations.secondary;
        for(let i=0;i<P.length;i++){
            obj.designations.primary.push(P[i].save());
        }
        for(let i=0;i<S.length;i++){
            obj.designations.secondary.push(S[i].save());
        }
        if(this.current) obj.sbData = this.sbData;
        return obj;
    }

    load(loadData){
        if(loadData instanceof LoadData){
            let basin = this.basin;
            let nameNum;
            let namedTime;
            let depNum;
            let designations;
            if(loadData.format>=FORMAT_WITH_INDEXEDDB){
                let obj = loadData.value;
                this.record = StormData.loadArr(basin,loadData.sub(obj.record));
                for(let p of [
                    'id',
                    'birthTime',
                    'deaths',
                    'damage',
                    'landfalls'
                ]) this[p] = obj[p];
                if(!this.birthTime) this.birthTime = 0;
                if(!this.deaths) this.deaths = 0;
                if(!this.damage) this.damage = 0;
                if(!this.landfalls) this.landfalls = 0;
                if(obj.depressionNum!==undefined) depNum = obj.depressionNum;
                if(obj.nameNum!==undefined) nameNum = obj.nameNum;
                if(obj.designations!==undefined) designations = obj.designations;
                if(obj.sbData){
                    this.sbData = obj.sbData;
                    if(loadData.format<FORMAT_WITH_SCALES){     // convert from pre-v0.2 values
                        for(let sub in this.sbData){
                            let l = this.sbData[sub].classLog;
                            if(l){
                                for(let s in l){
                                    let l1 = l[s];
                                    let l2 = {};
                                    for(let c in l1){
                                        let n = +c;
                                        if(l1[c]!==undefined){
                                            l2[Scale.convertOldValue(n)] = l1[c];
                                            if(c==='5') l2['6'] = l1[c];
                                        }
                                    }
                                    l[s] = l2;
                                }
                            }
                        }
                    }
                }
            }else{
                let data = loadData.value;
                data = data.split(".");
                let numData = decodeB36StringArray(data[0]);
                this.record = StormData.loadArr(basin,loadData.sub(data[1]));
                this.damage = numData.pop()*DAMAGE_DIVISOR || 0;
                this.deaths = numData.pop() || 0;
                this.birthTime = numData.pop() || 0;
                nameNum = numData.pop();
                if(nameNum<0) nameNum = undefined;
                depNum = numData.pop();
                if(depNum<0) depNum = undefined;
                this.id = numData.pop() || 0;
            }
            for(let i=0;i<this.record.length;i++){
                let d = this.record[i];
                let sub = land.getSubBasin(d.coord());
                let trop = tropOrSub(d.type);
                let inBasinTrop = trop && basin.subInBasin(sub);
                let t = (i+ceil(this.birthTime/ADVISORY_TICKS))*ADVISORY_TICKS;
                let yr = basin.getSeason(t);
                if(trop && !this.formationTime) this.formationTime = t;
                if(trop && this.dissipationTime) this.dissipationTime = undefined;
                if(!trop && this.formationTime && !this.dissipationTime) this.dissipationTime = t;
                if(inBasinTrop && !this.enterTime) this.enterTime = t;
                if(inBasinTrop && this.exitTime) this.exitTime = undefined;
                if(!inBasinTrop && this.enterTime && !this.exitTime) this.exitTime = t;
                let clsn = Scale.extendedSaffirSimpson.get(d);  // hardcoded to extended Saffir-Simpson since this is only used for backwards-compatibility
                if(inBasinTrop && !namedTime && clsn>=1) namedTime = t;  // backwards-compatibility name conversion
                if(loadData.format<FORMAT_WITH_STORM_SUBBASIN_DATA && inBasinTrop){
                    for(let subId of basin.forSubBasinChain(sub)){
                        for(let j=0;j<=clsn;j++) this.subBasinData(subId,yr,j,true);
                    }
                    this.subBasinData(this.basin.mainSubBasin,yr,'num',true);
                    if(clsn>=1) this.subBasinData(this.basin.mainSubBasin,yr,'name',true);
                }
                if(trop && !this.TC){
                    this.TC = true;
                    this.peak = undefined;
                    this.windPeak = undefined;
                }
                if(inBasinTrop && !this.inBasinTC){
                    this.inBasinTC = true;
                    this.peak = undefined;
                    this.windPeak = undefined;
                    this.ACE = 0;
                }
                if((!this.inBasinTC && (!this.TC || trop)) || inBasinTrop){
                    if(!this.peak)
                        this.peak = d;
                    else if(d.pressure < this.peak.pressure)
                        this.peak = d;

                    if(!this.windPeak)
                        this.windPeak = d;
                    else if(d.windSpeed > this.windPeak.windSpeed)
                        this.windPeak = d;
                }
                if(d.windSpeed>=ACE_WIND_THRESHOLD && (inBasinTrop || (trop && !this.inBasinTC))){
                    this.ACE *= ACE_DIVISOR;
                    this.ACE += pow(d.windSpeed,2);
                    this.ACE /= ACE_DIVISOR;
                }
            }
            this.ACE = round(this.ACE*ACE_DIVISOR)/ACE_DIVISOR;
            for(let a of basin.activeSystems){
                if(a.storm instanceof StormRef){
                    if(a.storm.season === loadData.season && a.storm.refId === this.id){
                        this.current = a;
                        a.storm = this;
                    }
                }
            }
            if(!this.current) this.deathTime = (this.record.length-1+ceil(this.birthTime/ADVISORY_TICKS))*ADVISORY_TICKS+1;
            if(this.TC && !this.dissipationTime) this.dissipationTime = this.deathTime;
            if(this.inBasinTC && !this.exitTime) this.exitTime = this.dissipationTime;
            if(designations){
                let P = designations.primary;
                let S = designations.secondary;
                for(let i=0;i<P.length;i++){
                    this.designations.primary.push(new Designation(loadData.sub(P[i])));
                }
                for(let i=0;i<S.length;i++){
                    this.designations.secondary.push(new Designation(loadData.sub(S[i])));
                }
            }else{
                let sb = basin.subBasins[this.basin.mainSubBasin];
                if(sb instanceof SubBasin && sb.designationSystem){     // converts pre-v20191004a designations; needs testing
                    if(nameNum!==undefined){
                        let desig = sb.designationSystem.getName(namedTime,basin.getSeason(namedTime),nameNum);
                        if(desig) this.designations.primary.push(desig);
                    }
                    if(depNum!==undefined){
                        let desig = sb.designationSystem.getNum(this.enterTime,depNum);
                        if(desig) this.designations.primary.push(desig);
                    }
                }
            }
        }
    }
}

class StormRef{
    constructor(basin,s){
        if(basin instanceof Basin) this.basin = basin;
        if(s instanceof Storm){
            this.season = s.originSeason();
            this.refId = s.id;
            this.lastApplicableAt = s.deathTime;
            this.ref = undefined;
        }else if(s instanceof LoadData){
            this.season = undefined;
            this.refId = undefined;
            this.ref = undefined;
            this.lastApplicableAt = undefined;
            this.load(s);
        }
    }

    fetch(){
        let basin = this.basin;
        if(this.ref && basin.seasons[this.season]) return this.ref;
        let seas = basin.fetchSeason(this.season);
        if(seas) this.ref = seas.fetchSystemById(this.refId);
        else{
            basin.fetchSeason(this.season,false,false,s=>{
                this.ref = s.fetchSystemById(this.refId);
            });
            return null;
        }
        return this.ref;
    }

    save(){
        let obj = {};
        for(let p of ['refId','season','lastApplicableAt']) obj[p] = this[p];
        return obj;
    }

    load(data){
        if(data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                for(let p of ['refId','season','lastApplicableAt']) this[p] = data.value[p];
            }else{
                let str = data.value;
                let arr = decodeB36StringArray(str);
                this.season = arr.pop();
                this.refId = arr.pop();
            }
        }
    }
}

class StormData{
    constructor(basin,x,y,p,w,t,radiusOfMaxWind,circulationSize,eyeType,eyeDiameter){
        if(basin instanceof Basin) this.basin = basin;
        this.pos = undefined;
        this.pressure = undefined;
        this.windSpeed = undefined; // in knots
        this.type = undefined;
        this.radiusOfMaxWind = undefined; // nautical miles
        this.circulationSize = undefined; // structural size level: 0 (TINY) to 6 (HUGE), with 1-5 as the standard levels
        this.eyeType = EYE_TYPE_MEDIUM;
        this.eyeDiameter = undefined; // nautical miles; clear-eye diameter
        if(x instanceof LoadData){
            this.load(x,y);
        }else{
            this.pos = createVector(x,y);
            this.pressure = p;
            this.windSpeed = w;
            this.type = t<STORM_TYPES ? t : EXTROP;
            this.radiusOfMaxWind = Number.isFinite(radiusOfMaxWind) ? radiusOfMaxWind :
                StormData.estimateRadiusOfMaxWind(p,w,this.type);
            this.circulationSize = StormData.constrainCirculationSize(
                circulationSize===undefined ? StormData.radiusToCirculationSize(this.radiusOfMaxWind,this.type) : circulationSize
            );
            let resolvedEyeType = Number.isFinite(eyeType) ? eyeType :
                Number.isFinite(eyeDiameter) ? StormData.eyeTypeForDiameter(eyeDiameter) :
                    EYE_TYPE_MEDIUM;
            this.eyeType = StormData.constrainEyeType(resolvedEyeType);
            this.eyeDiameter = StormData.constrainEyeDiameter(
                eyeDiameter,
                this.eyeType
            );
        }
    }

    static radiusBounds(type){
        return type===MONSOON ? [45,110] : type===EXTROP ? [18,140] : [7,90];
    }

    static constrainCirculationSize(level){
        return constrain(round(Number.isFinite(level) ? level : 3),0,6);
    }

    static constrainEyeType(type){
        return constrain(round(Number.isFinite(type) ? type : EYE_TYPE_MEDIUM),0,EYE_TYPE_COUNT-1);
    }

    static eyeTypeProfile(type){
        return EYE_TYPE_DEFS[StormData.constrainEyeType(type)];
    }

    static eyeTypeLabel(type){
        return StormData.eyeTypeProfile(type).label;
    }

    static eyeTypeDiameterLabel(type){
        return StormData.eyeTypeProfile(type).diameterLabel;
    }

    static eyeTypeForDiameter(diameter){
        if(!Number.isFinite(diameter)) return EYE_TYPE_MEDIUM;
        for(let i=0;i<EYE_TYPE_DEFS.length;i++){
            if(diameter<EYE_TYPE_DEFS[i].diameterMax || i===EYE_TYPE_DEFS.length-1)
                return i;
        }
        return EYE_TYPE_GIANT;
    }

    static defaultEyeDiameter(type){
        return StormData.eyeTypeProfile(type).typicalDiameter;
    }

    static constrainEyeDiameter(diameter,type){
        let profile = StormData.eyeTypeProfile(type);
        return constrain(
            Number.isFinite(diameter) ? diameter : profile.typicalDiameter,
            profile.diameterMin,
            profile.diameterMax
        );
    }

    static randomEyeType(windSpeed){
        // Medium eyes remain the climatological default. Compact eyes become
        // more common in already-developed systems, reflecting their link to
        // rapid intensification without making every major cyclone pinhole-
        // sized. The returned type is a persistent storm characteristic.
        let maturity = constrain(
            (Number.isFinite(windSpeed) ? windSpeed : 30)-34,
            0,100
        )/100;
        let weights = [
            0.08+0.10*maturity,
            0.17+0.07*maturity,
            0.48-0.04*maturity,
            0.22-0.11*maturity,
            0.05-0.02*maturity
        ];
        let roll = typeof random==='function' ? random() : 0.5;
        for(let i=0;i<weights.length;i++){
            if(roll<weights[i]) return i;
            roll -= weights[i];
        }
        return EYE_TYPE_MEDIUM;
    }

    static randomEyeDiameter(type){
        let profile = StormData.eyeTypeProfile(type);
        return typeof random==='function' ?
            random(profile.diameterMin,profile.diameterMax) :
            profile.typicalDiameter;
    }

    static circulationSizeLabel(level){
        level = StormData.constrainCirculationSize(level);
        if(level<1) return 'TINY (<1)';
        if(level>5) return 'HUGE (>5)';
        return 'Level ' + level + ' / 5';
    }

    static randomCirculationSize(){
        let outlierRoll = random();
        if(outlierRoll<0.03) return 0;
        if(outlierRoll>0.97) return 6;
        return floor(random(1,6));
    }

    static radiusToCirculationSize(radius,type){
        let bounds = StormData.radiusBounds(type);
        let level = map(radius,bounds[0],bounds[1],1,5);
        // Radii outside the five standard levels are retained as the two
        // named structural outliers instead of being folded into level 1/5.
        if(level<1) return 0;
        if(level>5) return 6;
        return StormData.constrainCirculationSize(level);
    }

    static circulationSizeToRadius(level,type){
        let bounds = StormData.radiusBounds(type);
        level = StormData.constrainCirculationSize(level);
        if(level<1) return map(level,0,1,bounds[0]*0.5,bounds[0]);
        if(level>5) return map(level,5,6,bounds[1],bounds[1]*1.5);
        return map(level,1,5,bounds[0],bounds[1]);
    }

    static estimateRadiusOfMaxWind(p,w,t){
        let wind = Number.isFinite(w) ? w : 30;
        let pressure = Number.isFinite(p) ? p : 1010;
        let climatologicalRadius = map(constrain(wind,20,160),20,160,52,12);
        let expectedDeficit = max(8,(wind-25)*0.78);
        let pressureDeficit = max(1,1010-pressure);
        let breadth = constrain(Math.sqrt(pressureDeficit/expectedDeficit),0.75,1.35);
        let typeFactor = t===MONSOON ? 1.65 : t===SUBTROP ? 1.25 : t===EXTROP ? 1.65 : 1;
        return StormData.constrainRadiusOfMaxWind(climatologicalRadius*breadth*typeFactor,t);
    }

    static constrainRadiusOfMaxWind(radius,type){
        let bounds = StormData.radiusBounds(type);
        return constrain(radius,bounds[0]*0.5,bounds[1]*1.5);
    }

    static minimumCenterSeparation(system0,system1){
        let type0 = system0 && system0.type!==undefined ? system0.type : EXTROP;
        let type1 = system1 && system1.type!==undefined ? system1.type : EXTROP;
        let extropical0 = type0===EXTROP;
        let extropical1 = type1===EXTROP;
        let monsoon0 = type0===MONSOON;
        let monsoon1 = type1===MONSOON;

        // Cold-core lows and monsoon depressions represent broad circulations;
        // the former 50 px blanket limit allowed two synoptic-scale centers to
        // be generated almost on top of one another.
        if(extropical0 && extropical1) return 115;
        if(extropical0 || extropical1) return 85;
        if(monsoon0 || monsoon1) return 95;
        return 50;
    }

    coord(){
        return Coordinate.convertFromXY(this.basin.mapType, this.pos);
    }

    save(){
        let obj = {};
        let {longitude, latitude} = this.coord();
        obj.pos = {longitude, latitude};
        for(let p of ['pressure','windSpeed','type','radiusOfMaxWind','circulationSize','eyeType','eyeDiameter']) obj[p] = this[p];
        return obj;
    }

    load(data,posInArr){
        if(data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                if(data.format >= FORMAT_WITH_LONG_LAT)
                    this.pos = Coordinate.convertToXY(this.basin.mapType, obj.pos.longitude, obj.pos.latitude);
                else
                    this.pos = createVector(obj.pos.x,obj.pos.y);
                for(let p of ['pressure','windSpeed','type']) this[p] = obj[p];
                this.radiusOfMaxWind = Number.isFinite(obj.radiusOfMaxWind) ? obj.radiusOfMaxWind :
                    StormData.estimateRadiusOfMaxWind(this.pressure,this.windSpeed,this.type);
                this.circulationSize = StormData.constrainCirculationSize(
                    obj.circulationSize===undefined ? StormData.radiusToCirculationSize(this.radiusOfMaxWind,this.type) : obj.circulationSize
                );
                this.eyeType = StormData.constrainEyeType(
                    obj.eyeType===undefined ?
                        StormData.eyeTypeForDiameter(obj.eyeDiameter) : obj.eyeType
                );
                this.eyeDiameter = StormData.constrainEyeDiameter(
                    obj.eyeDiameter,
                    this.eyeType
                );
            }else{
                let str = data.value;
                let arr = decodeB36StringArray(str);
                this.type = arr.pop();
                this.windSpeed = arr.pop();
                this.pressure = arr.pop();
                this.radiusOfMaxWind = StormData.estimateRadiusOfMaxWind(this.pressure,this.windSpeed,this.type);
                this.circulationSize = StormData.radiusToCirculationSize(this.radiusOfMaxWind,this.type);
                this.eyeType = EYE_TYPE_MEDIUM;
                this.eyeDiameter = StormData.defaultEyeDiameter(this.eyeType);
                if(posInArr) this.pos = posInArr;
                else{
                    let opts = {
                        p5Vec: true
                    };
                    this.pos = decodePoint(arr.pop(),opts);
                }
            }
        }
    }

    static saveArr(arr){
        let longitude = [];
        let latitude = [];
        let pressure = [];
        let windSpeed = [];
        let type = [];
        let radiusOfMaxWind = [];
        let circulationSize = [];
        let eyeType = [];
        let eyeDiameter = [];
        for(let d of arr){
            if(d instanceof StormData){
                let coord = d.coord();
                longitude.push(coord.longitude);
                latitude.push(coord.latitude);
                pressure.push(constrain(d.pressure,0,pow(2,16)-1));
                windSpeed.push(constrain(d.windSpeed,0,pow(2,16)-1));
                type.push(d.type);
                radiusOfMaxWind.push(d.radiusOfMaxWind);
                circulationSize.push(StormData.constrainCirculationSize(d.circulationSize));
                eyeType.push(StormData.constrainEyeType(d.eyeType));
                eyeDiameter.push(StormData.constrainEyeDiameter(d.eyeDiameter,d.eyeType));
            }
        }
        let obj = {};
        obj.pos = {longitude: new Float32Array(longitude), latitude: new Float32Array(latitude)};
        obj.pressure = new Uint16Array(pressure);
        obj.windSpeed = new Uint16Array(windSpeed);
        obj.type = new Uint8ClampedArray(type);
        obj.radiusOfMaxWind = new Float32Array(radiusOfMaxWind);
        obj.circulationSize = new Uint8ClampedArray(circulationSize);
        obj.eyeType = new Uint8ClampedArray(eyeType);
        obj.eyeDiameter = new Float32Array(eyeDiameter);
        return obj;
    }

    static loadArr(basin,data){
        if(basin instanceof Basin && data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                let arr = [];
                let x, y;
                if(data.format >= FORMAT_WITH_LONG_LAT){
                    let longitude = [...obj.pos.longitude];
                    let latitude = [...obj.pos.latitude];
                    x = [];
                    y = [];
                    for(let i = 0; i < longitude.length; i++){
                        let vec = Coordinate.convertToXY(basin.mapType, longitude[i], latitude[i]);
                        x.push(vec.x);
                        y.push(vec.y);
                    }
                }else{
                    x = [...obj.pos.x];
                    y = [...obj.pos.y];
                }
                let pressure = [...obj.pressure];
                let windSpeed = [...obj.windSpeed];
                let type = [...obj.type];
                let radiusOfMaxWind = obj.radiusOfMaxWind ? [...obj.radiusOfMaxWind] : undefined;
                let circulationSize = obj.circulationSize ? [...obj.circulationSize] : undefined;
                let eyeType = obj.eyeType ? [...obj.eyeType] : undefined;
                let eyeDiameter = obj.eyeDiameter ? [...obj.eyeDiameter] : undefined;
                for(let i=0;i<x.length;i++){
                    arr[i] = new StormData(
                        basin,x[i],y[i],pressure[i],windSpeed[i],type[i],
                        radiusOfMaxWind ? radiusOfMaxWind[i] : undefined,
                        circulationSize ? circulationSize[i] : undefined,
                        eyeType ? eyeType[i] : undefined,
                        eyeDiameter ? eyeDiameter[i] : undefined
                    );
                }
                return arr;
            }else{
                let str = data.value;
                let arr = str.split("/");
                let opts = {
                    p5Vec: true
                };
                let positions = decodePointArray(arr.shift(),opts);
                for(let i=0;i<arr.length;i++){
                    arr[i] = new StormData(basin,data.sub(arr[i]),positions[i]);
                }
                return arr;
            }
        }
    }
}

class ActiveSystem extends StormData{
    constructor(basin,data){
        if(!(basin instanceof Basin)) return;
        // if(data instanceof LoadData){
        //     super(basin);
        //     this.organization = undefined;
        //     this.lowerWarmCore = undefined;
        //     this.upperWarmCore = undefined;
        //     this.depth = undefined;
        // }else{
        //     let sType = spawn ? spawn.sType : undefined;
        //     if(sType==="x") ext = true;
        //     let subt = false;
        //     if(sType==="sd"){
        //         sType = "d";
        //         subt = true;
        //     }
        //     if(sType==="ss"){
        //         sType = "s";
        //         subt = true;
        //     }
        //     let x, y, tooClose;
        //     if(spawn){
        //         x = spawn.x;
        //         y = spawn.y;
        //     }else{
        //         do{
        //             tooClose = false;
        //             x = random()<0.2 && !ext ?
        //                     WIDTH-1:
        //                     random(0,WIDTH-1);
        //             y = basin.hemY(ext ? basin.env.get("jetstream",x,0,basin.tick)+random(-75,75) : random(HEIGHT*0.7,HEIGHT*0.9));
        //             for(let i=0;i<basin.activeSystems.length;i++){
        //                 let p = basin.activeSystems[i].pos;
        //                 if(sqrt(sq(x-p.x)+sq(y-p.y))<50) tooClose = true;
        //             }
        //         }while(tooClose);
        //     }
        //     let p = spawn ?
        //         sType==="x" ? 1005 :
        //         sType==="l" ? 1015 :
        //         sType==="d" ? 1005 :
        //         sType==="s" ? 995 :
        //         sType==="1" ? 985 :
        //         sType==="2" ? 975 :
        //         sType==="3" ? 960 :
        //         sType==="4" ? 945 :
        //         sType==="5" ? 925 :
        //         sType==='6' ? 890 :
        //         sType==='7' ? 840 :
        //         sType==='8' ? 800 :
        //         sType==='9' ? 765 :
        //         sType==='10' ? 730 :
        //         sType==='y' ? 690 : 1000 :
        //     random(1000,1020);
        //     let w = spawn ?
        //         sType==="x" ? 15 :
        //         sType==="l" ? 15 :
        //         sType==="d" ? 25 :
        //         sType==="s" ? 45 :
        //         sType==="1" ? 70 :
        //         sType==="2" ? 90 :
        //         sType==="3" ? 105 :
        //         sType==="4" ? 125 :
        //         sType==="5" ? 145 :
        //         sType==='6' ? 170 :
        //         sType==='7' ? 210 : 
        //         sType==='8' ? 270 :
        //         sType==='9' ? 330 :
        //         sType==='10' ? 400 :
        //         sType==='y' ? 440 : 35 :
        //     random(15,35);
        //     let ty = ext ? EXTROP : spawn ?
        //         sType==="l" ? TROPWAVE :
        //         subt ? SUBTROP : TROP :
        //     TROPWAVE;
        //     super(basin,x,y,p,w,ty);
        //     this.organization = ext ? 0 : spawn ? sType==="l" ? 0.2 : 1 : random(0,0.3);
        //     this.lowerWarmCore = ext ? 0 : subt ? 0.6 : 1;
        //     this.upperWarmCore = ext ? 0 : subt ? 0.5 : 1;
        //     this.depth = ext ? 1 : 0;
        // }
        super(basin);
        // Eyewall replacement is live simulation state only. It deliberately
        // is not part of StormData/advisory persistence.
        this.eyewallCycle = 0;
        // A completed replacement leaves a slightly larger, new eye instead
        // of restoring the pre-cycle size. This live-only memory is separate
        // from the active cycle phase and is not written to saves/advisories.
        this.eyewallReplacementMemory = 0;
        // The completed outer wall takes time to become the sole dominant
        // signature in derived imagery. This handoff is live-only and decays
        // after the physical replacement has already completed.
        this.eyewallReplacementHandoff = 0;
        // A failed replacement produces a short-lived structural event. The
        // event is live-only and decays after it has altered the eyewall.
        this.eyewallFailureEvent = 0;
        this.eyewallFailureEventMode = 0;
        this.eyewallFailureEventDuration = 18;
        // Landfall damage to the lower warm core fades gradually after the
        // storm returns over water. This is live-only state, like the eyewall
        // cycle, and is intentionally not written into advisories or saves.
        this.landWarmCoreDamage = 0;
        // Instantaneous land interaction (direct crossing or a weaker
        // peripheral brush). It is refreshed by the core algorithm each hour
        // and is deliberately not part of StormData/advisory persistence.
        this.landExposure = 0;
        // Deep convection has its own short-lived state instead of being
        // derived directly from wind speed. It is intentionally live-only;
        // the storm algorithm re-seeds it from the current structure when an
        // older save is loaded.
        this.convectiveActivity = undefined;
        // Rainbands are also live-only derived structure. Keeping their
        // activity separate from the imagery renderer means eyewall
        // replacement can be judged while no storm is selected.
        this.rainbandActivity = undefined;
        this.rainbandFormation = undefined;
        // A trough-phasing pulse is derived from the recent upper-level
        // outflow trend. It is live-only so saved advisories keep the physical
        // storm state while a reloaded storm can re-evaluate its environment.
        this.troughOutflowMemory = 0;
        this.troughOutflowBurst = 0;
        this.steering = createVector(0); // A vector that updates with the environmental steering
        this.interaction = {}; // Data for interaction with other storms (e.g. Fujiwhara)
        this.resetInteraction();
        this.kill = false;
        // this.trackForecast = {}; // Simple track forecast for now
        // this.trackForecast.stVec = createVector(0);
        // this.trackForecast.pVec = createVector(0);
        this.trackForecast/* .points */ = [];
        if(data instanceof LoadData){
            this.storm = undefined;
            this.load(data);
            // Older saves have no eye metadata. Give them the neutral middle
            // category and keep any stored diameter inside that category's
            // observed range.
            this.eyeType = StormData.constrainEyeType(this.eyeType);
            this.eyeDiameter = StormData.constrainEyeDiameter(
                this.eyeDiameter,
                this.eyeType
            );
            this.eyeDiameterBase = StormData.constrainEyeDiameter(
                Number.isFinite(this.eyeDiameterBase) ? this.eyeDiameterBase : this.eyeDiameter,
                this.eyeType
            );
        }else{
            let d = data || {};
            if(d.x instanceof Function || d.y instanceof Function){
                let x, y, tooClose;
                let spawnProfile = {type: d.type===undefined ? EXTROP : d.type};
                let count = 0;
                do{
                    tooClose = false;
                    if(d.x instanceof Function)
                        x = d.x(basin);
                    else
                        x = d.x || 0;
                    if(d.y instanceof Function)
                        y = d.y(basin,x);
                    else
                        y = d.y || 0;
                    for(let i=0;i<basin.activeSystems.length;i++){
                        let other = basin.activeSystems[i];
                        let p = other.pos;
                        let minimumSeparation = StormData.minimumCenterSeparation(spawnProfile,other);
                        if(sqrt(sq(x-p.x)+sq(y-p.y))<minimumSeparation) tooClose = true;
                    }
                    count++;
                }while(tooClose && count < 1000);
                this.pos.x = x;
                this.pos.y = y;
            }else{
                this.pos.x = d.x || 0;
                this.pos.y = d.y || 0;
            }
            this.pressure = d.pressure===undefined ? 1000 : d.pressure;
            this.windSpeed = d.windSpeed===undefined ? 30 : d.windSpeed;
            this.type = d.type===undefined ? EXTROP : d.type;
            let estimatedRadius = StormData.estimateRadiusOfMaxWind(this.pressure,this.windSpeed,this.type);
            let hasExplicitRadius = d.radiusOfMaxWind!==undefined;
            this.radiusOfMaxWind = hasExplicitRadius ?
                StormData.constrainRadiusOfMaxWind(d.radiusOfMaxWind,this.type) : estimatedRadius;
            this.circulationSize = StormData.constrainCirculationSize(
                d.circulationSize===undefined ?
                    hasExplicitRadius ? StormData.radiusToCirculationSize(this.radiusOfMaxWind,this.type) : StormData.randomCirculationSize() :
                    d.circulationSize
            );
            this.radiusOfMaxWind = StormData.circulationSizeToRadius(this.circulationSize,this.type);
            let resolvedEyeType = Number.isFinite(d.eyeType) ? d.eyeType :
                Number.isFinite(d.eyeDiameter) ? StormData.eyeTypeForDiameter(d.eyeDiameter) :
                    StormData.randomEyeType(this.windSpeed);
            this.eyeType = StormData.constrainEyeType(resolvedEyeType);
            this.eyeDiameter = StormData.constrainEyeDiameter(
                Number.isFinite(d.eyeDiameter) ? d.eyeDiameter :
                    StormData.randomEyeDiameter(this.eyeType),
                this.eyeType
            );
            this.eyeDiameterBase = StormData.constrainEyeDiameter(
                Number.isFinite(d.eyeDiameterBase) ? d.eyeDiameterBase : this.eyeDiameter,
                this.eyeType
            );
            if(!hasExplicitRadius){
                let sizeRatio = constrain(this.radiusOfMaxWind/estimatedRadius,0.82,1.18);
                this.pressure = 1010-(1010-this.pressure)*sizeRatio;
            }
            if(Number.isFinite(d.convectiveActivity))
                this.convectiveActivity = constrain(d.convectiveActivity,0,1);
            if(Number.isFinite(d.rainbandActivity))
                this.rainbandActivity = constrain(d.rainbandActivity,0,1);
            if(Number.isFinite(d.rainbandFormation))
                this.rainbandFormation = constrain(d.rainbandFormation,0,1);
            let activeAttribs = ACTIVE_ATTRIBS[basin.actMode] || ACTIVE_ATTRIBS.defaults;
            for(let v of activeAttribs)
                this[v] = d[v] || 0;
            this.storm = new Storm(basin,this);
            if(basin.tick%ADVISORY_TICKS===0) this.advisory();
        }
    }

    update(){
        this.basin.env.beginQueryCache();
        try{
            return this.updateWithEnvironmentCache();
        }finally{
            this.basin.env.endQueryCache();
        }
    }

    updateWithEnvironmentCache(){
        let basin = this.basin;

        let u = {};
        u.f = (field)=>basin.env.get(field,this.pos.x,this.pos.y,basin.tick);
        u.land = ()=>land.getAtXY(this.pos.x,this.pos.y);

        // this.getSteering();
        if(STORM_ALGORITHM[basin.actMode].steering)
            STORM_ALGORITHM[basin.actMode].steering(this,this.steering,u);
        else
            STORM_ALGORITHM.defaults.steering(this,this.steering,u);
        // this.steering.add(this.interaction.fuji);
        let prevland = u.land();
        this.pos.add(this.steering);

        if(STORM_ALGORITHM[basin.actMode].core)
            STORM_ALGORITHM[basin.actMode].core(this,u);
        else
            STORM_ALGORITHM.defaults.core(this,u);

        if(STORM_ALGORITHM[basin.actMode].typeDetermination)
            STORM_ALGORITHM[basin.actMode].typeDetermination(this,u);
        else
            STORM_ALGORITHM.defaults.typeDetermination(this,u);

        // The clear eye responds to the final intensity/type state for this
        // hourly step. Keep this separate from the broader RMW update: a
        // storm can tighten its eye without collapsing its whole circulation.
        if(typeof updateEyeDiameter==='function') updateEyeDiameter(this);
        
        let x = this.pos.x;
        let y = this.pos.y;
        let z = basin.tick;

        // let SST = basin.env.get("SST",x,y,z);
        // let jet = basin.env.get("jetstream",x,y,z);
        // jet = basin.hemY(y)-jet;
        let lnd = land.getAtXY(this.pos.x,this.pos.y);
        // let moisture = basin.env.get("moisture",x,y,z);
        // let shear = basin.env.get("shear",x,y,z).mag()+this.interaction.shear;
        
        // let targetWarmCore = (lnd ?
        //     this.lowerWarmCore :
        //     max(pow(map(SST,10,25,0,1,true),3),this.lowerWarmCore)
        // )*map(jet,0,75,sq(1-this.depth),1,true);
        // this.lowerWarmCore = lerp(this.lowerWarmCore,targetWarmCore,this.lowerWarmCore>targetWarmCore ? map(jet,0,75,0.4,0.06,true) : 0.04);
        // this.upperWarmCore = lerp(this.upperWarmCore,this.lowerWarmCore,this.lowerWarmCore>this.upperWarmCore ? 0.05 : 0.4);
        // this.lowerWarmCore = constrain(this.lowerWarmCore,0,1);
        // this.upperWarmCore = constrain(this.upperWarmCore,0,1);
        // let tropicalness = constrain(map(this.lowerWarmCore,0.5,1,0,1),0,this.upperWarmCore);
        // let nontropicalness = constrain(map(this.lowerWarmCore,0.75,0,0,1),0,1);

        // this.organization *= 100;
        // if(!lnd) this.organization += sq(map(SST,20,29,0,1,true))*3*tropicalness;
        // if(!lnd && this.organization<40) this.organization += lerp(0,3,nontropicalness);
        // // if(lnd) this.organization -= pow(10,map(lnd,0.5,1,-3,1));
        // // if(lnd && this.organization<70 && moisture>0.3) this.organization += pow(5,map(moisture,0.3,0.5,-1,1,true))*tropicalness;
        // this.organization -= pow(2,4-((HEIGHT-basin.hemY(y))/(HEIGHT*0.01)));
        // this.organization -= (pow(map(this.depth,0,1,1.17,1.31),shear)-1)*map(this.depth,0,1,4.7,1.2);
        // this.organization -= map(moisture,0,0.65,3,0,true)*shear;
        // this.organization += sq(map(moisture,0.6,1,0,1,true))*4;
        // this.organization -= pow(1.3,20-SST)*tropicalness;
        // this.organization = constrain(this.organization,0,100);
        // this.organization /= 100;

        // let targetPressure = 1010-25*log((lnd||SST<25)?1:map(SST,25,30,1,2))/log(1.17);
        // targetPressure = lerp(1010,targetPressure,pow(this.organization,3));
        // this.pressure = lerp(this.pressure,targetPressure,(this.pressure>targetPressure?0.05:0.08)*tropicalness);
        // this.pressure -= random(-3,3.5)*nontropicalness;
        // if(this.organization<0.3) this.pressure += random(-2,2.5)*tropicalness;
        // this.pressure += random(constrain(970-this.pressure,0,40))*nontropicalness;
        // this.pressure += 0.5*this.interaction.shear/(1+map(this.lowerWarmCore,0,1,4,0));
        // this.pressure += map(jet,0,75,5*pow(1-this.depth,4),0,true);

        // let targetWind = map(this.pressure,1030,900,1,160)*map(this.lowerWarmCore,1,0,1,0.6);
        // this.windSpeed = lerp(this.windSpeed,targetWind,0.15);

        // let targetDepth = map(
        //     this.upperWarmCore,
        //     0,1,
        //     1,map(
        //         this.organization,
        //         0,1,
        //         this.depth*pow(0.95,shear),max(map(this.pressure,1010,950,0,0.7,true),this.depth)
        //     )
        // );
        // this.depth = lerp(this.depth,targetDepth,0.05);

        // switch(this.type){
        //     case TROP:
        //         this.type = this.lowerWarmCore<0.55 ? EXTROP : ((this.organization<0.4 && this.windSpeed<50) || this.windSpeed<20) ? this.upperWarmCore<0.56 ? EXTROP : TROPWAVE : this.upperWarmCore<0.56 ? SUBTROP : TROP;
        //         break;
        //     case SUBTROP:
        //         this.type = this.lowerWarmCore<0.55 ? EXTROP : ((this.organization<0.4 && this.windSpeed<50) || this.windSpeed<20) ? this.upperWarmCore<0.57 ? EXTROP : TROPWAVE : this.upperWarmCore<0.57 ? SUBTROP : TROP;
        //         break;
        //     case TROPWAVE:
        //         this.type = this.lowerWarmCore<0.55 ? EXTROP : (this.organization<0.45 || this.windSpeed<25) ? this.upperWarmCore<0.56 ? EXTROP : TROPWAVE : this.upperWarmCore<0.56 ? SUBTROP : TROP;
        //         break;
        //     default:
        //         this.type = this.lowerWarmCore<0.6 ? EXTROP : (this.organization<0.45 || this.windSpeed<25) ? this.upperWarmCore<0.57 ? EXTROP : TROPWAVE : this.upperWarmCore<0.57 ? SUBTROP : TROP;
        // }

        if(this.kill || this.pos.x >= WIDTH || this.pos.x < 0 || this.pos.y >= HEIGHT || this.pos.y < 0){
            this.fetchStorm().deathTime = basin.tick;
            if(this.fetchStorm().TC && this.fetchStorm().dissipationTime===undefined) this.fetchStorm().dissipationTime = basin.tick;
            if(this.fetchStorm().inBasinTC && this.fetchStorm().exitTime===undefined) this.fetchStorm().exitTime = basin.tick;
            this.fetchStorm().current = undefined;
            return;
        }

        let currentStorm = this.fetchStorm();
        let rType = currentStorm.getStormDataByTick(basin.tick);
        rType = rType && rType.type;
        // Every classified cyclone can cause impacts. This includes
        // extratropical cyclones, tropical disturbances, and any additional
        // valid system types, rather than limiting losses to tropical and
        // subtropical cyclones.
        let lossType = rType===undefined || rType===null ? this.type : rType;
        if(Number.isInteger(lossType) && lossType>=0 && lossType<STORM_TYPES){
            let centerPopulation = lnd ? round(250000*(1+basin.hemY(y)/HEIGHT)*pow(0.8,map(lnd,0.5,1,0,30))) : 0;
            let damPot = pow(1.062,this.windSpeed)-1;   // damage potential
            let dedPot = pow(1.045,this.windSpeed)-1;    // death potential
            let m = pow(1.5,randomGaussian());      // modifier
            damPot *= m;
            dedPot *= m;

            let previousAdvisory = currentStorm.record.length>0 ?
                currentStorm.record[currentStorm.record.length-1] : undefined;
            let motionTicks = ADVISORY_TICKS;
            if(previousAdvisory instanceof StormData){
                let previousTick = currentStorm.get_tick_from_record_index(currentStorm.record.length-1);
                motionTicks = max(1,basin.tick-previousTick);
            }
            let impactData = this;
            let impactType = lossType;
            if(impactType!==this.type){
                // During a transition, use the last recorded system type
                // while retaining the active system's current intensity and
                // position for the wind field.
                impactData = new StormData(
                    basin,this.pos.x,this.pos.y,this.pressure,this.windSpeed,
                    impactType,this.radiusOfMaxWind,this.circulationSize,
                    this.eyeType,this.eyeDiameter
                );
            }
            let impact = currentStorm.getWindImpact(impactData,previousAdvisory,motionTicks);
            let dam;
            let ded;
            if(impact){
                // Keep a direct landfall at least as impactful as the old
                // center-point model, while adding any land reached by the
                // surrounding wind field.
                let damageExposure = max(impact.damageExposure,centerPopulation);
                let deathExposure = max(impact.deathExposure,centerPopulation);
                dam = damageExposure*damPot*3.3*pow(1.1,random(-1,1));
                ded = round(deathExposure*dedPot*0.0000017*pow(1.1,random(-1,1)));
            }else{
                // Preserve the existing center-point behavior for systems
                // below the first (34 kt) wind-circle threshold.
                dam = centerPopulation*damPot*3.3*pow(1.1,random(-1,1));
                ded = round(centerPopulation*dedPot*0.0000017*pow(1.1,random(-1,1)));
            }
            let lf = 0;
            if(!prevland && lnd) lf = 1;
            let sub = land.getSubBasinAtXY(x,y);
            if(!this.fetchStorm().inBasinTC || basin.subInBasin(sub)){
                currentStorm.damage += dam;
                currentStorm.damage = round(currentStorm.damage*100)/100;
                currentStorm.deaths += ded;
                currentStorm.landfalls += lf;
            }
            let seas = basin.fetchSeason(-1,true,true);
            for(let subId of basin.forSubBasinChain(sub)){
                if(basin.subInBasin(subId)){
                    let s = seas.stats(subId);
                    s.damage += dam;
                    s.damage = round(s.damage*100)/100;
                    s.deaths += ded;
                    s.landfalls += lf;
                }
            }
            seas.modified = true;
        }

        this.resetInteraction();
        if(basin.tick%ADVISORY_TICKS===0) this.advisory();
    }

    advisory(){
        let x = floor(this.pos.x);
        let y = floor(this.pos.y);
        let p = floor(this.pressure);
        let w = round(this.windSpeed/WINDSPEED_ROUNDING)*WINDSPEED_ROUNDING;
        let ty = this.type;
        let adv = new StormData(
            this.basin,x,y,p,w,ty,this.radiusOfMaxWind,this.circulationSize,
            this.eyeType,this.eyeDiameter
        );
        this.fetchStorm().updateStats(adv);
        this.fetchStorm().record.push(adv);
        // this.fetchStorm().renderTrack(true);
    }

    // getSteering(){
    //     let basin = this.basin;
    //     let l = basin.env.get("LLSteering",this.pos.x,this.pos.y,basin.tick);
    //     let u = basin.env.get("ULSteering",this.pos.x,this.pos.y,basin.tick);
    //     let d = sqrt(this.depth);
    //     let x = lerp(l.x,u.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
    //     let y = lerp(l.y,u.y,d);
    //     this.steering.set(x,y);
    //     this.steering.add(this.interaction.fuji); // Fujiwhara
    // }

    interact(that,first){   // Deals with multi-system interactions (i.e. Fujiwhara)
        let basin = this.basin;

        let interactionAdd;
        if(STORM_ALGORITHM[basin.actMode].interaction)
            interactionAdd = STORM_ALGORITHM[basin.actMode].interaction(this, that);
        else
            interactionAdd = STORM_ALGORITHM.defaults.interaction(this, that);
        for(let k in interactionAdd){
            if(interactionAdd[k] instanceof p5.Vector)
                this.interaction[k].add(interactionAdd[k]);
            else
                this.interaction[k] += interactionAdd[k];
        }
        
        // let v = createVector();
        // v.set(this.pos);
        // v.sub(that.pos);
        // let m = v.mag();
        // let r = map(that.lowerWarmCore,0,1,150,50);
        // if(m<r && m>0){
        //     v.rotate(basin.hem(-TAU/4+((3/m)*TAU/16)));
        //     v.setMag(map(m,r,0,0,map(constrain(that.pressure,990,1030),1030,990,0.2,2.2)));
        //     this.interaction.fuji.add(v);
        //     this.interaction.shear += map(m,r,0,0,map(that.pressure,1030,900,0,6));
        //     if((m<map(this.pressure,1030,1000,r/5,r/15) || m<5) && this.pressure>that.pressure) this.kill = true;
        // }

        if(first) that.interact(this);
    }

    resetInteraction(){
        let basin = this.basin;
        let i = this.interaction = {};
        // i.fuji.set(0);
        // i.shear = 0;

        let init;
        if(STORM_ALGORITHM[basin.actMode].interactionInit)
            init = STORM_ALGORITHM[basin.actMode].interactionInit;
        else
            init = STORM_ALGORITHM.defaults.interactionInit;
        for(let k in init){
            if(init[k])
                i[k] = createVector();
            else
                i[k] = 0;
        }
    }

    static updateTrackForecasts(basin){
        let forecastStates = [];

        // Clone the active set once and advance it as one forecast ensemble.
        // Previously every storm repeated this full N-system integration.
        for(let source of basin.activeSystems){
            if(!source || !source.pos) continue;
            source.trackForecast/* .points */ = [];
            let system = Object.create(Object.getPrototypeOf(source));
            Object.assign(system,source);
            system.pos = source.pos.copy();
            system.steering = createVector(0);
            system.resetInteraction();
            let state = {source,system,tick:basin.tick,steering:createVector(0)};
            state.utility = {
                f: field=>basin.env.get(field,system.pos.x,system.pos.y,state.tick),
                land: ()=>land.getAtXY(system.pos.x,system.pos.y)
            };
            forecastStates.push(state);
        }

        let algorithm = STORM_ALGORITHM[basin.actMode].steering || STORM_ALGORITHM.defaults.steering;
        for(let f=0;f<120;f++){
            let t = basin.tick+f;

            for(let state of forecastStates)
                state.system.resetInteraction();
            for(let i=0;i<forecastStates.length;i++){
                for(let j=i+1;j<forecastStates.length;j++)
                    forecastStates[i].system.interact(forecastStates[j].system,true);
            }

            for(let state of forecastStates){
                state.tick = t;
                state.steering.set(0,0);
                basin.env.beginQueryCache();
                try{
                    algorithm(state.system,state.steering,state.utility);
                }finally{
                    basin.env.endQueryCache();
                }
                state.system.pos.add(state.steering);
            }

            if((f+1)%ADVISORY_TICKS===0){
                for(let state of forecastStates)
                    state.source.trackForecast/* .points */.push({x:state.system.pos.x,y:state.system.pos.y});
            }
        }
    }

    fetchStorm(){
        if(this.storm instanceof StormRef){
            console.error('ActiveSystem still needs to fetch StormRefs');
            let s = this.storm.fetch();
            if(!s) return new Storm(this.basin);
            this.storm = s;
            this.storm.deathTime = undefined;
            let r = this.storm.record;
            if(r.length>0 && tropOrSub(r[r.length-1].type)){
                this.storm.dissipationTime = undefined;
                if(land.inBasin(r[r.length-1].coord())) this.storm.exitTime = undefined;
            }
            this.storm.current = this;
        }
        return this.storm;
    }

    save(){
        let obj = super.save();
        // Preserve the uncontracted reference diameter separately from the
        // current clear-eye diameter so a saved storm can reopen its eye when
        // it weakens later. Older saves simply fall back to the current value.
        obj.eyeDiameterBase = Number.isFinite(this.eyeDiameterBase) ?
            this.eyeDiameterBase : this.eyeDiameter;
        let activeAttribs = ACTIVE_ATTRIBS[this.basin.actMode] || ACTIVE_ATTRIBS.defaults;
        for(let p of activeAttribs)
            obj[p] = this[p];
        obj.algorithmVersion = STORM_ALGORITHM[this.basin.actMode].version;
        obj.ref = new StormRef(this.basin,this.fetchStorm()).save();
        return obj;
    }

    load(data){
        if(data instanceof LoadData){
            let activeAttribs = ACTIVE_ATTRIBS[this.basin.actMode] || ACTIVE_ATTRIBS.defaults;
            let algorithmVersion = 0;
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                super.load(data);
                this.eyeDiameterBase = Number.isFinite(obj.eyeDiameterBase) ?
                    obj.eyeDiameterBase : this.eyeDiameter;
                algorithmVersion = obj.algorithmVersion || 0;
                if(algorithmVersion < STORM_ALGORITHM[this.basin.actMode].version && STORM_ALGORITHM[this.basin.actMode].upgrade)
                    STORM_ALGORITHM[this.basin.actMode].upgrade(this,obj,algorithmVersion); // upgrade active attributes in case of an algorithm version change
                else{
                    for(let p of activeAttribs)
                        this[p] = obj[p] || 0;
                }
                this.storm = new StormRef(this.basin,data.sub(obj.ref));
            }else{
                let str = data.value;
                let parts = str.split(".");
                super.load(data.sub(parts[0]));
                let activeData = decodeB36StringArray(parts[1]);
                if(algorithmVersion < STORM_ALGORITHM[this.basin.actMode].version && STORM_ALGORITHM[this.basin.actMode].upgrade){
                    let obj = {};
                    obj.depth = activeData.pop();
                    obj.upperWarmCore = activeData.pop();
                    obj.lowerWarmCore = activeData.pop();
                    obj.organization = activeData.pop();
                    // upgrade active attributes in case of an algorithm version change
                    STORM_ALGORITHM[this.basin.actMode].upgrade(this,obj,algorithmVersion);
                }else{
                    this.depth = activeData.pop();
                    this.upperWarmCore = activeData.pop();
                    this.lowerWarmCore = activeData.pop();
                    this.organization = activeData.pop();
                }
                this.storm = new StormRef(this.basin,data.sub(parts[2]));
            }
        }
    }
}

function tropOrSub(ty){
    return ty===TROP || ty===SUBTROP || ty===MONSOON;
}
