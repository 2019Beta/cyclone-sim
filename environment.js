class NoiseChannel{
    constructor(octaves,falloff,zoom,zZoom,xOff,yOff,zOff){
        this.octaves = octaves || 4;
        this.falloff = falloff || 0.5;
        this.zoom = zoom || 100;
        this.zZoom = zZoom || this.zoom;
        this.xOff = xOff || 0;
        this.yOff = yOff || 0;
        this.zOff = zOff || 0;
    }

    get(x,y,z,xo,yo,zo){
        x = x || 0;
        y = y || 0;
        z = z || 0;
        xo = xo!==undefined ? xo : this.xOff;
        yo = yo!==undefined ? yo : this.yOff;
        zo = zo!==undefined ? zo : this.zOff;
        if(NoiseChannel.lastOctaves!==this.octaves || NoiseChannel.lastFalloff!==this.falloff){
            noiseDetail(this.octaves,this.falloff);
            NoiseChannel.lastOctaves = this.octaves;
            NoiseChannel.lastFalloff = this.falloff;
        }
        return noise(x/this.zoom+xo,y/this.zoom+yo,z/this.zZoom+zo);
    }
}

class EnvNoiseChannel extends NoiseChannel{
    constructor(basin,field,index,loadData,octaves,falloff,zoom,zZoom,wMax,zWMax,wRFac){
        let r = NC_OFFSET_RANDOM_FACTOR;
        super(octaves,falloff,zoom,zZoom,random(r),random(r),random(r));
        this.wobbleMax = wMax || 1;
        this.zWobbleMax = zWMax || this.wobbleMax;
        this.wobbleRotFactor = wRFac || PI/16;
        this.wobbleVector = p5.Vector.random2D();

        this.basin = basin instanceof Basin && basin;
        this.field = field;
        this.index = index;
        if(loadData instanceof LoadData) this.load(loadData);
    }

    get(x,y,z){
        if(z>=this.basin.tick)
            return super.get(x,y,z,this.xOff,this.yOff,this.zOff);
        let o = this.fetchOffsets(z);
        if(!o) throw ENVDATA_NOT_FOUND_ERROR;
        let {xo, yo, zo} = o;
        return super.get(x,y,z,xo,yo,zo);
    }

    fetchOffsets(t){
        let basin = this.basin;
        if(t>=basin.tick) return {
            xo: this.xOff,
            yo: this.yOff,
            zo: this.zOff
        };
        else{
            t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            let s = basin.getSeason(t);
            t = (t-basin.seasonTick(s))/ADVISORY_TICKS;
            let d = basin.fetchSeason(s);
            if(d && d.envData && d.envData[this.field] && d.envData[this.field][this.index]){
                t -= d.envData[this.field][this.index].recordStart;
                if(t >= 0){
                    let o = d.envData[this.field][this.index].val[t];
                    return {
                        xo: o.x,
                        yo: o.y,
                        zo: o.z
                    };
                }
            }
        }
    }

    wobble(){
        let v = this.wobbleVector;
        v.setMag(random(0.0001,this.wobbleMax));
        this.xOff += v.x/this.zoom;
        this.yOff += v.y/this.zoom;
        this.zOff += random(-this.zWobbleMax,this.zWobbleMax)/this.zZoom;
        v.rotate(random(-this.wobbleRotFactor,this.wobbleRotFactor));
    }

    record(){
        let basin = this.basin;
        let seas = basin.fetchSeason(-1,true,true);
        let s = seas;
        // let startingRecord;
        if(!s.envData){
            s.envData = {};
            // startingRecord = true;
        }
        s = s.envData;
        if(!s[this.field]){
            s[this.field] = {};
            // startingRecord = true;
        }
        s = s[this.field];
        if(!s[this.index]){
            s[this.index] = {
                val: [],
                recordStart: floor(basin.tick/ADVISORY_TICKS)-basin.seasonTick()/ADVISORY_TICKS
            };
            // startingRecord = true;
        }
        s = s[this.index].val;
        // if(startingRecord) seas.envRecordStarts = floor(basin.tick/ADVISORY_TICKS)-basin.seasonTick()/ADVISORY_TICKS;
        s.push({
            x: this.xOff,
            y: this.yOff,
            z: this.zOff
        });
        seas.modified = true;
    }

    save(){
        let obj = {};
        let w = obj.wobbleVector = {};
        w.x = this.wobbleVector.x;
        w.y = this.wobbleVector.y;
        for(let p of ['xOff','yOff','zOff']) obj[p] = this[p];
        return obj;
    }

    load(data){
        if(data instanceof LoadData){
            let wx;
            let wy;
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                for(let p of ['xOff','yOff','zOff']) if(obj[p]) this[p] = obj[p];
                wx = obj.wobbleVector && obj.wobbleVector.x;
                wy = obj.wobbleVector && obj.wobbleVector.y;
            }else{
                let str = data.value;
                let arr = decodeB36StringArray(str);
                this.xOff = arr.pop() || this.xOff;
                this.yOff = arr.pop() || this.yOff;
                this.zOff = arr.pop() || this.zOff;
                wx = arr.pop();
                wy = arr.pop();
            }
            if(wx!==undefined && wy!==undefined) this.wobbleVector = createVector(wx,wy);
        }
    }
}

class EnvField{
    constructor(basin,name,loadData,attribs){
        this.basin = basin instanceof Basin && basin;
        this.name = name;
        if(attribs.displayName)
            this.displayName = attribs.displayName;
        else
            this.displayName = name;
        this.noise = [];
        this.accurateAfter = -1;
        this.version = attribs.version;
        if(loadData instanceof LoadData && loadData.value){
            if(loadData.value.version!==this.version) this.accurateAfter = this.basin.tick;
            else this.accurateAfter = loadData.value.accurateAfter;
        }
        this.isVectorField = attribs.vector;
        this.vectorColorFill = attribs.vectorColorFill;
        this.fillResolution = attribs.fillResolution || 8;
        // Scalar fields normally render in ENV_LAYER_TILE_SIZE blocks. A
        // field-specific resolution keeps detailed overlays such as the
        // simulated scan from forcing every environmental layer to use a
        // smaller (and more expensive) grid.
        this.renderResolution = attribs.renderResolution || ENV_LAYER_TILE_SIZE;
        this.smoothRaster = !!attribs.smoothRaster;
        this.pixelatedRaster = !!attribs.pixelatedRaster;
        this.fillAlpha = attribs.fillAlpha===undefined ? 255 : attribs.fillAlpha;
        this.noVectorFlip = attribs.noVectorFlip;   // do not reflect the output vector over the y-axis in the southern hemisphere if this is true
        this.noWobble = attribs.noWobble;
        if(attribs.hueMap)
            this.hueMap = attribs.hueMap;
        else if(!this.isVectorField)
            this.hueMap = [0,1,0,300];
        else
            this.hueMap = null;
        this.magMap = attribs.magMap || [0,1,0,10];
        if(attribs.displayFormat instanceof Function)
            this.displayFormat = attribs.displayFormat;
        else if(this.isVectorField)
            this.displayFormat = v=>{
                let m = v.mag();
                let h = v.heading();
                return "(a: " + (round(h*1000)/1000) + ", m: " + (round(m*1000)/1000) + ")";
            };
        else
            this.displayFormat = v=>''+round(v*1000)/1000;
        this.invisible = attribs.invisible;
        this.oceanic = attribs.oceanic;
        this.contourInterval = attribs.contourInterval;
        this.contourGridSize = attribs.contourGridSize || ENV_LAYER_TILE_SIZE;
        this.contourLabelInterval = attribs.contourLabelInterval || this.contourInterval;
        this.legend = attribs.legend;
        this.modifiers = attribs.modifiers;
        if(this.isVectorField) this.vec = createVector();
        if(attribs.mapFunc instanceof Function) this.mapFunc = attribs.mapFunc;
        let a = null;
        if(attribs.noiseChannels instanceof Array){
            let noiseC = attribs.noiseChannels;
            for(let i=0;i<noiseC.length;i++){
                if(noiseC[i] instanceof Array || (noiseC[i]==='' && a instanceof Array)){
                    let d;
                    if(loadData instanceof LoadData && loadData.value && loadData.value.noiseData && loadData.value.noiseData[i]){
                        d = loadData.value.noiseData[i];
                        d = loadData.sub(d);
                    }
                    if(noiseC[i] instanceof Array) a = noiseC[i];
                    let c = new EnvNoiseChannel(this.basin,this.name,i,d,...a);
                    this.noise.push(c);
                }
            }
        }
        let field = this;
        this.utility = {
            noise(num,x1,y1,z1){
                if(x1===undefined) x1 = field.sampleX;
                if(y1===undefined) y1 = field.sampleY;
                if(z1===undefined) z1 = field.sampleZ;
                return field.noise[num].get(x1,y1,z1);
            },
            basin:this.basin,
            field(name,x1,y1,z1){
                if(x1===undefined) x1 = field.sampleX;
                if(y1===undefined) y1 = field.sampleY;
                if(z1===undefined) z1 = field.sampleZ;
                let dependency = field.basin.env.fields[name];
                if(dependency.accurateAfter>field.accurateAfter)
                    field.accurateAfter = dependency.accurateAfter;
                return field.basin.env.get(name,x1,y1,z1,true);
            },
            yearfrac:z=>(z%YEAR_LENGTH)/YEAR_LENGTH,
            piecewise(s,arr){
                let month = s*12;
                let previous = [arr[arr.length-1][0]-12,arr[arr.length-1][1]];
                for(let point of arr){
                    if(month<point[0]) return map(month,previous[0],point[0],previous[1],point[1]);
                    previous = point;
                }
                return map(month,previous[0],arr[0][0]+12,previous[1],arr[0][1]);
            },
            vec:this.vec,
            modifiers:this.modifiers || {}
        };
        Object.defineProperty(this.utility,'coord',{get(){
            if(!field.sampleCoord)
                field.sampleCoord = Coordinate.convertFromXY(field.basin.mapType,field.sampleOriginalX,field.sampleOriginalY);
            return field.sampleCoord;
        }});
    }

    get(x,y,z,noHem){
        try{
            this.sampleOriginalX = x;
            this.sampleOriginalY = y;
            this.sampleCoord = undefined;
            if(!noHem) y = this.basin.hemY(y);
            this.sampleX = x;
            this.sampleY = y;
            this.sampleZ = z;
            if(this.mapFunc){
                let res = this.mapFunc(this.utility,x,y,z);
                if(this.isVectorField && !this.noVectorFlip) res.y = this.basin.hem(res.y);
                return res;
            }
            if(this.isVectorField){
                this.vec.set(1);
                this.vec.rotate(map(this.noise[0].get(x,y,z),0,1,0,4*TAU));
                if(!this.noVectorFlip) this.vec.y = this.basin.hem(this.vec.y);
                return this.vec;
            }
            return this.noise[0].get(x,y,z);
        }catch(err){
            if(!noHem && err===ENVDATA_NOT_FOUND_ERROR) return null;
            throw err;
        }
    }

    wobble(){
        if(!this.noWobble){
            for(let i=0;i<this.noise.length;i++){
                this.noise[i].wobble();
            }
        }
    }

    render(){
        envLayer.noFill();
        if(this.smoothRaster){
            this.renderScalarRaster();
            if(simSettings.showMagGlass) this.renderMagGlass();
            return;
        }
        if(this.contourInterval){
            this.renderContours();
            if(simSettings.showMagGlass) this.renderMagGlass();
            return;
        }
        if(this.isVectorField && this.vectorColorFill){
            this.renderVectorColorFill();
            if(simSettings.showMagGlass) this.renderMagGlass();
            return;
        }
        let resolution = this.renderResolution;
        let tileSize = ceil(resolution*scaler);
        for(let i=0;i<WIDTH;i+=resolution){
            for(let j=0;j<HEIGHT;j+=resolution){
                let x = i+resolution/2;
                let y = j+resolution/2;
                if(!this.oceanic || land.tileContainsOcean(x,y)){
                    let v = this.get(x,y,viewTick);
                    if(this.isVectorField){
                        envLayer.push();
                        envLayer.scale(scaler);
                        envLayer.translate(x,y);
                        if(v!==null){
                            envLayer.rotate(v.heading());
                            let mg = v.mag();
                            let mp = this.magMap;
                            let l = map(mg,mp[0],mp[1],mp[2],mp[3]);
                            let h = this.hueMap;
                            let c;
                            if(h instanceof Function)
                                c = h(mg);
                            else if(h instanceof Array)
                                c = color(map(mg,h[0],h[1],h[2],h[3]),100,100);
                            else
                                c = 'black';
                            envLayer.stroke(c);
                            envLayer.line(0,0,l,0);
                            envLayer.noStroke();
                            envLayer.fill(c);
                            envLayer.triangle(l+5,0,l,3,l,-3);
                        }else{
                            envLayer.stroke(0);
                            envLayer.line(-3,-3,3,3);
                            envLayer.line(-3,3,3,-3);
                        }
                        envLayer.pop();
                    }else{
                        if(v!==null){
                            let h = this.hueMap;
                            if(h instanceof Function) envLayer.fill(h(v));
                            else envLayer.fill(map(v,h[0],h[1],h[2],h[3]),100,100);
                        }else envLayer.fill(0,0,50);
                        envLayer.rect(i*scaler,j*scaler,tileSize,tileSize);
                        if(v===null){
                            envLayer.fill(0,0,60);
                            envLayer.triangle(i*scaler,j*scaler,i*scaler+tileSize,j*scaler,i*scaler,j*scaler+tileSize);
                        }
                    }
                }
                
            }
        }
        if(simSettings.showMagGlass) this.renderMagGlass();
    }

    renderScalarRaster(){
        let resolution = this.renderResolution;
        let width = ceil(WIDTH/resolution)+1;
        let height = ceil(HEIGHT/resolution)+1;
        let raster = createImage(width,height);
        raster.loadPixels();
        for(let row=0;row<height;row++){
            for(let col=0;col<width;col++){
                let value = this.get(min(WIDTH-1,col*resolution),min(HEIGHT-1,row*resolution),viewTick);
                let c = value===null ? color(128,128,128) : this.hueMap(value);
                let index = 4*(row*width+col);
                raster.pixels[index] = red(c);
                raster.pixels[index+1] = green(c);
                raster.pixels[index+2] = blue(c);
                raster.pixels[index+3] = alpha(c);
            }
        }
        raster.updatePixels();
        envLayer.push();
        let smoothing = envLayer.drawingContext.imageSmoothingEnabled;
        envLayer.drawingContext.imageSmoothingEnabled = !this.pixelatedRaster;
        // Align sample centers with map coordinates, including the edge samples.
        envLayer.image(raster,-resolution*scaler/2,-resolution*scaler/2,
            width*resolution*scaler,height*resolution*scaler);
        envLayer.drawingContext.imageSmoothingEnabled = smoothing;
        envLayer.pop();
    }

    renderVectorColorFill(){
        let resolution = this.fillResolution;
        let gridWidth = ceil(WIDTH/resolution)+1;
        let gridHeight = ceil(HEIGHT/resolution)+1;
        let colorGrid = createImage(gridWidth,gridHeight);
        colorGrid.loadPixels();
        for(let gridY=0;gridY<gridHeight;gridY++){
            let y = min(HEIGHT-1,gridY*resolution);
            for(let gridX=0;gridX<gridWidth;gridX++){
                let x = min(WIDTH-1,gridX*resolution);
                let v = this.get(x,y,viewTick);
                let c = v===null ? color(0,0,50) : this.hueMap(v.mag());
                let index = 4*(gridY*gridWidth+gridX);
                colorGrid.pixels[index] = red(c);
                colorGrid.pixels[index+1] = green(c);
                colorGrid.pixels[index+2] = blue(c);
                colorGrid.pixels[index+3] = this.fillAlpha;
            }
        }
        colorGrid.updatePixels();
        envLayer.push();
        envLayer.drawingContext.imageSmoothingEnabled = true;
        envLayer.image(colorGrid,0,0,envLayer.width,envLayer.height);
        envLayer.pop();
    }

    renderContours(){
        let gridSize = this.contourGridSize;
        let xCoords = [];
        let yCoords = [];
        for(let x=0;x<WIDTH;x+=gridSize) xCoords.push(x);
        for(let y=0;y<HEIGHT;y+=gridSize) yCoords.push(y);
        xCoords.push(WIDTH);
        yCoords.push(HEIGHT);

        // Sample every cyclone's exact position. This captures compact inner
        // cores without changing the pressure field or forcing separate outer
        // isobars when nearby systems genuinely share a circulation envelope.
        if(this.name==='pressure'){
            let systems = this.basin.env.getPressureSystems(viewTick);
            let centerXs = systems.map(system=>system.x).filter(x=>x>0 && x<WIDTH);
            let centerYs = systems.map(system=>this.basin.hemY(system.y)).filter(y=>y>0 && y<HEIGHT);
            let clearance = gridSize*0.35;
            xCoords = xCoords.filter(x=>
                x===0 || x===WIDTH || !centerXs.some(centerX=>abs(x-centerX)<clearance)
            );
            yCoords = yCoords.filter(y=>
                y===0 || y===HEIGHT || !centerYs.some(centerY=>abs(y-centerY)<clearance)
            );
            xCoords.push(...centerXs);
            yCoords.push(...centerYs);
            xCoords.sort((a,b)=>a-b);
            yCoords.sort((a,b)=>a-b);
            xCoords = xCoords.filter((x,index)=>index===0 || x-xCoords[index-1]>1e-6);
            yCoords = yCoords.filter((y,index)=>index===0 || y-yCoords[index-1]>1e-6);
        }

        let values = [];
        for(let j=0;j<yCoords.length;j++){
            let row = values[j] = [];
            for(let i=0;i<xCoords.length;i++) row[i] = this.get(xCoords[i],yCoords[j],viewTick);
        }

        let segments = new Map();
        let edgePoint = (edge,x0,y0,x1,y1,a,b,c,d,level)=>{
            let ratio;
            switch(edge){
                case 0:
                    ratio = a===b ? 0.5 : constrain((level-a)/(b-a),0,1);
                    return {x:lerp(x0,x1,ratio),y:y0};
                case 1:
                    ratio = b===c ? 0.5 : constrain((level-b)/(c-b),0,1);
                    return {x:x1,y:lerp(y0,y1,ratio)};
                case 2:
                    ratio = d===c ? 0.5 : constrain((level-d)/(c-d),0,1);
                    return {x:lerp(x0,x1,ratio),y:y1};
                default:
                    ratio = a===d ? 0.5 : constrain((level-a)/(d-a),0,1);
                    return {x:x0,y:lerp(y0,y1,ratio)};
            }
        };
        let addSegment = (level,edgeA,edgeB,x0,y0,x1,y1,a,b,c,d)=>{
            if(!segments.has(level)) segments.set(level,[]);
            segments.get(level).push([
                edgePoint(edgeA,x0,y0,x1,y1,a,b,c,d,level),
                edgePoint(edgeB,x0,y0,x1,y1,a,b,c,d,level)
            ]);
        };

        for(let j=0;j<yCoords.length-1;j++){
            for(let i=0;i<xCoords.length-1;i++){
                let a = values[j][i];
                let b = values[j][i+1];
                let c = values[j+1][i+1];
                let d = values[j+1][i];
                if(!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(d)) continue;
                let minimum = min(a,b,c,d);
                let maximum = max(a,b,c,d);
                let firstLevel = ceil(minimum/this.contourInterval)*this.contourInterval;
                for(let level=firstLevel;level<maximum;level+=this.contourInterval){
                    let index = 0;
                    if(a>=level) index |= 8;
                    if(b>=level) index |= 4;
                    if(c>=level) index |= 2;
                    if(d>=level) index |= 1;
                    let pairs;
                    switch(index){
                        case 1: pairs = [[3,2]]; break;
                        case 2: pairs = [[2,1]]; break;
                        case 3: pairs = [[3,1]]; break;
                        case 4: pairs = [[0,1]]; break;
                        case 5:
                            pairs = (a+b+c+d)/4>=level ? [[0,3],[1,2]] : [[0,1],[2,3]];
                            break;
                        case 6: pairs = [[0,2]]; break;
                        case 7: pairs = [[0,3]]; break;
                        case 8: pairs = [[3,0]]; break;
                        case 9: pairs = [[0,2]]; break;
                        case 10:
                            pairs = (a+b+c+d)/4>=level ? [[0,1],[2,3]] : [[0,3],[1,2]];
                            break;
                        case 11: pairs = [[0,1]]; break;
                        case 12: pairs = [[3,1]]; break;
                        case 13: pairs = [[1,2]]; break;
                        case 14: pairs = [[2,3]]; break;
                        default: pairs = [];
                    }
                    for(let pair of pairs){
                        addSegment(
                            level,pair[0],pair[1],
                            xCoords[i],yCoords[j],xCoords[i+1],yCoords[j+1],
                            a,b,c,d
                        );
                    }
                }
            }
        }

        envLayer.push();
        envLayer.scale(scaler);
        envLayer.noFill();
        for(let [level,levelSegments] of segments){
            let labelled = level%this.contourLabelInterval===0;
            envLayer.stroke(0,0,100,0.9);
            envLayer.strokeWeight(labelled ? 3.5 : 2.5);
            for(let segment of levelSegments)
                envLayer.line(segment[0].x,segment[0].y,segment[1].x,segment[1].y);
        }
        for(let [level,levelSegments] of segments){
            let labelled = level%this.contourLabelInterval===0;
            envLayer.stroke(0,0,15,0.9);
            envLayer.strokeWeight(labelled ? 1.6 : 1);
            for(let segment of levelSegments)
                envLayer.line(segment[0].x,segment[0].y,segment[1].x,segment[1].y);
        }

        envLayer.textAlign(CENTER,CENTER);
        envLayer.textSize(10);
        envLayer.textStyle(BOLD);
        for(let [level,levelSegments] of segments){
            if(level%this.contourLabelInterval!==0 || level<880 || level>1040) continue;
            let labelSegment;
            for(let segment of levelSegments){
                let mx = (segment[0].x+segment[1].x)/2;
                let my = (segment[0].y+segment[1].y)/2;
                if(mx>35 && mx<WIDTH-35 && my>12 && my<HEIGHT-12 && abs(segment[1].x-segment[0].x)>=abs(segment[1].y-segment[0].y)){
                    labelSegment = segment;
                    break;
                }
            }
            if(labelSegment){
                let x = (labelSegment[0].x+labelSegment[1].x)/2;
                let y = (labelSegment[0].y+labelSegment[1].y)/2;
                envLayer.stroke(0,0,100,0.95);
                envLayer.strokeWeight(3);
                envLayer.fill(0,0,12);
                envLayer.text(level,x,y);
                envLayer.noFill();
            }
        }
        envLayer.textStyle(NORMAL);
        envLayer.pop();
    }

    renderMagGlass(){
        let centerX = getMouseX();
        let centerY = getMouseY();
        magnifyingGlass.noFill();
        let vCenter = this.get(centerX,centerY,viewTick);
        if(this.isVectorField && !this.vectorColorFill){
            if(coordinateInCanvas(centerX,centerY) && (!this.oceanic || (land.tileContainsOcean(centerX,centerY) && !land.get(Coordinate.convertFromXY(this.basin.mapType,centerX,centerY))))){
                let v = vCenter;
                magnifyingGlass.push();
                magnifyingGlass.stroke(0);
                magnifyingGlass.scale(scaler);
                let magMeta = buffers.get(magnifyingGlass);
                magnifyingGlass.translate(magMeta.baseWidth/2,magMeta.baseHeight/2);
                if(v!==null){
                    magnifyingGlass.rotate(v.heading());
                    let mg = v.mag();
                    let mp = this.magMap;
                    let l = map(mg,mp[0],mp[1],mp[2],mp[3]);
                    magnifyingGlass.line(0,0,l,0);
                    magnifyingGlass.noStroke();
                    magnifyingGlass.fill(0);
                    magnifyingGlass.triangle(l+5,0,l,3,l,-3);
                }else{
                    magnifyingGlass.line(-3,-3,3,3);
                    magnifyingGlass.line(-3,3,3,-3);
                }
                magnifyingGlass.pop();
            }
        }else{
            if(vCenter!==null){
                for(let i=floor(magnifyingGlass.width/4);i<3*magnifyingGlass.width/4;i++){
                    for(let j=floor(magnifyingGlass.height/4);j<3*magnifyingGlass.height/4;j++){
                        let i1 = i-magnifyingGlass.width/2;
                        let j1 = j-magnifyingGlass.height/2;
                        if(sqrt(sq(i1)+sq(j1))<magnifyingGlass.width/4){
                            let x = centerX+i1/scaler;
                            let y = centerY+j1/scaler;
                            if(coordinateInCanvas(x,y) && (!this.oceanic || (land.tileContainsOcean(x,y) && !land.get(Coordinate.convertFromXY(this.basin.mapType,x,y))))){
                                let v = this.get(x,y,viewTick);
                                if(v!==null){
                                    let h = this.hueMap;
                                    let displayValue = this.isVectorField ? v.mag() : v;
                                    if(h instanceof Function) magnifyingGlass.fill(h(displayValue));
                                    else magnifyingGlass.fill(map(displayValue,h[0],h[1],h[2],h[3]),100,100);
                                }else magnifyingGlass.fill(0,0,50);
                                magnifyingGlass.rect(i,j,1,1);
                            }
                        }
                    }
                }
            }else{
                magnifyingGlass.fill(0,0,50);
                magnifyingGlass.ellipse(magnifyingGlass.width/2,magnifyingGlass.height/2,magnifyingGlass.width,magnifyingGlass.height);
            }
        }
    }

    record(){
        if(!this.noWobble){
            for(let i=0;i<this.noise.length;i++){
                this.noise[i].record();
            }
        }
    }
}

class Environment{  // Environmental fields that determine storm strength and steering
    constructor(basin){
        this.basin = basin instanceof Basin && basin;
        this.fields = {};
        this.fieldList = [];
        this.displaying = -1;
        this.layerIsOceanic = false;
        this.layerIsVector = false;
        this.pressureCacheKey = undefined;
        this.pressureSystems = [];
        this.baseScanCacheKey = undefined;
        this.baseScanSystems = [];
        this.queryCacheDepth = 0;
        this.queryCache = undefined;
    }

    addField(name,...fieldArgs){
        this.fields[name] = new EnvField(this.basin,name,...fieldArgs);
        this.fieldList.push(name);
    }

    wobble(){
        for(let i in this.fields) this.fields[i].wobble();
    }

    record(){
        for(let i in this.fields) this.fields[i].record();
    }

    backgroundPressure(x,y,z){
        let latitudeFraction = constrain(y/HEIGHT,0,1);
        let subpolarLow = -5*Math.exp(-sq((latitudeFraction-0.2)/0.19));
        let subtropicalHigh = 6*Math.exp(-sq((latitudeFraction-0.58)/0.2));
        let equatorialLow = -3*Math.exp(-sq((latitudeFraction-1)/0.18));
        let wave = 1.7*Math.sin(x/WIDTH*TAU*2+z/YEAR_LENGTH*TAU)*Math.sin(latitudeFraction*PI);
        return 1016+subpolarLow+subtropicalHigh+equatorialLow+wave;
    }

    getPressureSystems(z,targetStorm){
        let basin = this.basin;
        let targetKey = targetStorm instanceof Storm ? ':' + targetStorm.id : '';
        let cacheKey = z + ':' + (z===basin.tick ? basin.activeSystems.length : basin.getSeason(z)) + targetKey;
        if(this.pressureCacheKey===cacheKey) return this.pressureSystems;

        let stormData = [];
        if(z===basin.tick){
            for(let system of basin.activeSystems){
                let storm = system.fetchStorm();
                if(targetStorm instanceof Storm && storm!==targetStorm) continue;
                stormData.push({data:system,storm});
            }
        }else{
            let season = basin.fetchSeason(z,true,true);
            if(season){
                for(let storm of season.forSystems(true)){
                    if(targetStorm instanceof Storm && storm!==targetStorm) continue;
                    if(storm.aliveAt(z)){
                        let data = storm.getStormDataByTick(z,true);
                        if(data) stormData.push({data,storm});
                    }
                }
            }
        }

        let mapData = MAP_TYPES[basin.mapType];
        if(mapData.form!=='earth') mapData = MAP_TYPES[6];
        let longitudeSpan = mapData.east-mapData.west;
        if(longitudeSpan<=0) longitudeSpan += 360;
        let latitudeSpan = abs(mapData.north-mapData.south);
        let longitudeScale = WIDTH/longitudeSpan;
        let latitudeScale = HEIGHT/latitudeSpan;
        let result = [];
        for(let entry of stormData){
            let {data,storm} = entry;
            if(!Number.isFinite(data.pressure) || !data.pos) continue;
            let wind = Number.isFinite(data.windSpeed) ? data.windSpeed : 30;
            let radius = Number.isFinite(data.radiusOfMaxWind) ?
                data.radiusOfMaxWind : StormData.estimateRadiusOfMaxWind(data.pressure,wind,data.type);
            let latitude = data.coord().latitude;
            let latitudeCosine = max(0.25,Math.cos(latitude*Math.PI/180));
            let y = basin.hemY(data.pos.y);
            let windContext = storm &&
                typeof storm.getWindFieldContext==='function' ?
                storm.getWindFieldContext(z,data) : null;
            let windModel = windContext &&
                typeof storm.getWindFieldModel==='function' ?
                storm.getWindFieldModel(
                    data,windContext.previousData,windContext.motionTicks
                ) : null;
            let landFraction = typeof land !== 'undefined' && land ?
                land.getAtXY(data.pos.x,data.pos.y) : 0;
            let background = this.backgroundPressure(data.pos.x,y,z);
            let deficit = background-data.pressure;
            let expectedDeficit = max(8,(wind-25)*0.78);
            let pressureBreadth = constrain(Math.sqrt(max(1,abs(deficit))/expectedDeficit),0.72,data.type===EXTROP ? 1.75 : 1.45);
            let typeFactor = data.type===EXTROP ? 5 : data.type===MONSOON ? 4.2 : data.type===SUBTROP ? 3.6 : 3;
            // Intensity should primarily deepen a cyclone's inner pressure
            // field, not make its outer profile expand without limit. The old
            // 20*sqrt(deficit) term let extreme-mode storms remain hundreds of
            // hPa below the environment more than 1,000 nm away, erasing the
            // closed core of another intense cyclone. Keep a modest, saturating
            // intensity contribution and let RMW/type describe system breadth.
            let intensityExpansion = 6*Math.sqrt(min(abs(deficit),160));
            let maximumSigma = data.type===EXTROP ? 600 :
                data.type===MONSOON ? 500 : data.type===SUBTROP ? 420 : 300;
            let sigmaNm = constrain(
                radius*typeFactor*pressureBreadth+intensityExpansion,
                90,maximumSigma
            );
            // Keep the lower-level wind retrieval supplied with the same
            // eye-state geometry as the base-scan descriptor. These fields
            // are derived here once per pressure-system cache, rather than
            // rebuilding a different eye size for every SAR pixel.
            let visualOrganization = Number.isFinite(data.organization) ?
                constrain(data.organization,0,1) : 1;
            let visualLowerWarmCore = Number.isFinite(data.lowerWarmCore) ?
                constrain(data.lowerWarmCore,0,1) : 1;
            let landDamage = Number.isFinite(data.landWarmCoreDamage) ?
                constrain(data.landWarmCoreDamage,0,1) : 0;
            let landMemorySuppression = 1-Math.pow(1-landDamage,1.7);
            let landContactSuppression = landFraction>0 ?
                0.02+0.04*landFraction : 0;
            let visualLandSuppression = constrain(Math.max(
                landContactSuppression,landMemorySuppression
            ),0,1);
            let eyeFillFactor = constrain(
                0.58*visualLandSuppression+
                0.24*(1-visualLowerWarmCore)+
                0.18*(1-visualOrganization),0,1
            );
            let eyewallOuterRadius = typeof simulatedReplacementRadius==='function' ?
                simulatedReplacementRadius({
                    eyewallCycle:data.eyewallCycle,
                    eyewallReplacementMemory:data.eyewallReplacementMemory,
                    eyewallFailure:data.eyewallFailure,
                    eyewallFailureEvent:data.eyewallFailureEvent
                }) : 1.55;
            result.push({
                storm,
                visualSeed: (storm.birthTime || 0)*0.173+(storm.id || 0)*2.399,
                x: data.pos.x,
                y,
                pressure: data.pressure,
                windSpeed: wind,
                radiusOfMaxWind: radius,
                windModel,
                type: data.type,
                // Eye metadata is independent of the storm's circulation
                // size. Older historical points fall back to the neutral
                // middle-eye profile through StormData's compatibility path.
                eyeType: Number.isFinite(data.eyeType) ?
                    StormData.constrainEyeType(data.eyeType) : EYE_TYPE_MEDIUM,
                eyeDiameter: StormData.constrainEyeDiameter(
                    data.eyeDiameter,
                    Number.isFinite(data.eyeType) ? data.eyeType : EYE_TYPE_MEDIUM
                ),
                circulationSize: Number.isFinite(data.circulationSize) ? data.circulationSize : 3,
                organization: Number.isFinite(data.organization) ? constrain(data.organization,0,1) : undefined,
                lowerWarmCore: Number.isFinite(data.lowerWarmCore) ? constrain(data.lowerWarmCore,0,1) : undefined,
                upperWarmCore: Number.isFinite(data.upperWarmCore) ? constrain(data.upperWarmCore,0,1) : undefined,
                depth: Number.isFinite(data.depth) ? constrain(data.depth,0,1) : undefined,
                convectiveActivity: Number.isFinite(data.convectiveActivity) ?
                    constrain(data.convectiveActivity,0,1) : undefined,
                rainbandActivity: Number.isFinite(data.rainbandActivity) ?
                    constrain(data.rainbandActivity,0,1) : undefined,
                rainbandFormation: Number.isFinite(data.rainbandFormation) ?
                    constrain(data.rainbandFormation,0,1) : undefined,
                eyewallCycle: Number.isFinite(data.eyewallCycle) ? constrain(data.eyewallCycle,0,1) : 0,
                eyewallReplacementHandoff: Number.isFinite(data.eyewallReplacementHandoff) ?
                    constrain(data.eyewallReplacementHandoff,0,1) : 0,
                cloudEyeExpansion: Number.isFinite(data.cloudEyeExpansion) ?
                    constrain(data.cloudEyeExpansion,0,1) : 0,
                eyewallReplacementMemory: Number.isFinite(data.eyewallReplacementMemory) ?
                    constrain(data.eyewallReplacementMemory,0,1) : 0,
                eyewallFailure: constrain(data.eyewallFailure || 0,0,1),
                eyewallFailureMode: data.eyewallFailureMode || 0,
                eyewallFailureEvent: Number.isFinite(data.eyewallFailureEvent) ?
                    constrain(data.eyewallFailureEvent,0,1) : 0,
                eyewallFailureEventMode: Number.isFinite(data.eyewallFailureEventMode) ?
                    constrain(data.eyewallFailureEventMode,0,2) : 0,
                eyewallOuterRadius,
                eyeFillFactor,
                hemisphere: basin.SHem ? -1 : 1,
                landFraction,
                landWarmCoreDamage: Number.isFinite(data.landWarmCoreDamage) ?
                    constrain(data.landWarmCoreDamage,0,1) : 0,
                latitudeCosine,
                sigmaX: sigmaNm/(60*latitudeCosine)*longitudeScale,
                sigmaY: sigmaNm/60*latitudeScale
            });
        }
        this.pressureCacheKey = cacheKey;
        this.pressureSystems = result;
        return result;
    }

    getPressure(x,y,z){
        let background = this.backgroundPressure(x,y,z);
        let strongestAnomaly = 0;
        for(let system of this.getPressureSystems(z)){
            let distance = sq((x-system.x)/system.sigmaX)+sq((y-system.y)/system.sigmaY);
            if(distance<18){
                // Each cyclone supplies a complete pressure profile rather than
                // an anomaly to add to every other cyclone. Taking the strongest
                // local profile prevents nearby lows from creating a spurious,
                // over-deepened center between their actual positions. Because
                // the profile interpolates to the recorded central pressure, its
                // gradient is also zero at the cyclone's position.
                let anomaly = (system.pressure-background)*Math.exp(-distance/2);
                if(abs(anomaly)>abs(strongestAnomaly)) strongestAnomaly = anomaly;
            }
        }
        return constrain(background+strongestAnomaly,650,1060);
    }

    getBaseScanSystems(z,targetStorm){
        // The base scan is a derived visual field. Cache the storm descriptors once
        // per analysis time so every raster sample does not repeat map-scale,
        // shear, moisture, and SST lookups for the same systems.
        // A selected storm is passed through so the live imagery panel does not
        // build descriptors for every other storm that happens to be active.
        let pressureSystems = this.getPressureSystems(z,targetStorm);
        let cacheKey = z + ':' + this.pressureCacheKey;
        if(this.baseScanCacheKey===cacheKey) return this.baseScanSystems;

        let mapData = MAP_TYPES[this.basin.mapType];
        if(mapData.form!=='earth') mapData = MAP_TYPES[6];
        let longitudeSpan = mapData.east-mapData.west;
        if(longitudeSpan<=0) longitudeSpan += 360;
        let latitudeSpan = abs(mapData.north-mapData.south);
        let longitudeScale = WIDTH/longitudeSpan;
        let latitudeScale = HEIGHT/latitudeSpan;
        let result = [];

        for(let system of pressureSystems){
            let radius = Number.isFinite(system.radiusOfMaxWind) ? system.radiusOfMaxWind : 30;
            let rmwX = max(2.5,radius/system.latitudeCosine*longitudeScale/60);
            let rmwY = max(2.5,radius*latitudeScale/60);

            let shear = this.get('shear',system.x,system.y,z,true);
            let shearMagnitude = shear && shear.mag instanceof Function ? shear.mag() : 0;
            let shearFactor = constrain(shearMagnitude/8,0,1);
            let shearAngle = shearMagnitude>0.001 && shear.heading instanceof Function ? shear.heading() : 0;

            let moisture = this.get('moisture',system.x,system.y,z,true);
            let sst = this.get('SST',system.x,system.y,z,true);
            if(!Number.isFinite(moisture)) moisture = 0.5;
            if(!Number.isFinite(sst)) sst = 26;

            let moistureFactor = constrain((moisture-0.35)/0.47,0,1);
            let sstFactor = constrain((sst-24)/5,0,1);
            // Rainband formation is more sensitive to moisture than the
            // circulation-strength proxy. Historical points do not carry the
            // live state, so derive a stable environmental fallback for them.
            let moistureRainbandPotential = constrain((moisture-0.30)/0.44,0,1);
            let rainbandActivity = Number.isFinite(system.rainbandActivity) ?
                constrain(system.rainbandActivity,0,1) :
                constrain(0.18+0.58*moistureRainbandPotential+
                    0.18*constrain(system.windSpeed/100,0,1),0,1);
            let rainbandFormation = Number.isFinite(system.rainbandFormation) ?
                constrain(system.rainbandFormation,0,1) :
                constrain(0.58*rainbandActivity+0.26*moistureRainbandPotential,0,1);
            let rainbandPotential = constrain(
                0.56*rainbandActivity+0.28*rainbandFormation+
                0.16*moistureRainbandPotential,0,1
            );
            // Keep the imagery intensity proxy spread across the full
            // tropical-cyclone range. The previous 15-115 kt / 1010-940 hPa
            // mapping reached 1.0 around C3, making C3-C5 look like one
            // intensity tier even though their observed wind and pressure
            // were still changing. The input components now retain an
            // unbounded, logarithmically compressed tail above the ordinary
            // C5 envelope, so C6+ and hyper-intense storms continue to gain
            // lower-tropospheric/base-scan signal instead of saturating.
            let windIntensity = typeof extendedIntensityComponent==='function' ?
                extendedIntensityComponent((system.windSpeed-25)/140) :
                Math.max(0,(system.windSpeed-25)/140);
            let pressureIntensity = typeof extendedIntensityComponent==='function' ?
                extendedIntensityComponent((1008-system.pressure)/120) :
                Math.max(0,(1008-system.pressure)/120);

            // Active systems expose their evolving structure. Historical
            // StormData predates these fields, so infer a conservative
            // structure from the recorded storm type when they are absent.
            let defaultOrganization = system.type===TROP ? 0.88 :
                system.type===SUBTROP ? 0.58 :
                system.type===MONSOON ? 0.34 :
                system.type===TROPWAVE ? 0.22 : 0.12;
            let organization = Number.isFinite(system.organization) ?
                system.organization : defaultOrganization;
            let defaultWarmCore = system.type===TROP ? 0.92 :
                system.type===SUBTROP ? 0.58 :
                system.type===MONSOON ? 0.42 :
                system.type===TROPWAVE ? 0.28 : 0.08;
            let warmCore = Number.isFinite(system.lowerWarmCore) && Number.isFinite(system.upperWarmCore) ?
                (system.lowerWarmCore+system.upperWarmCore)/2 : defaultWarmCore;
            let depthFactor = Number.isFinite(system.depth) ?
                constrain(1-0.18*system.depth,0.7,1) : 1;
            let typeTropicalFactor = system.type===TROP ? 1 :
                system.type===SUBTROP ? 0.58 :
                system.type===MONSOON ? 0.34 :
                system.type===TROPWAVE ? 0.18 : 0;
            let tropicalFactor = constrain(
                typeTropicalFactor *
                (0.35+0.65*constrain(organization,0,1)) *
                (0.35+0.65*constrain(warmCore,0,1)) *
                depthFactor,
                0,1
            );
            let frontalFactor = 1-tropicalFactor;
            // Land.getAtXY returns 0 for water and a positive value for land.
            // On the Earth map that positive value is an elevation-like
            // value beginning at 0.501, so treating 0.52 as a land threshold
            // lets low coastal pixels behave exactly like open water. A
            // confirmed land contact should break the inner tropical
            // structure immediately; live land-exposure memory keeps it from
            // reappearing on the first ocean sample after landfall.
            let landFraction = Number.isFinite(system.landFraction) ?
                constrain(system.landFraction,0,1) : 0;
            // Keep the instantaneous coastline contact cue very small. The
            // actual core collapse must come from landWarmCoreDamage, which
            // accumulates over successive hourly updates instead of turning
            // the lower layer into clear air on the first land sample.
            let landContactSuppression = landFraction>0 ?
                0.02+0.04*landFraction : 0;
            let landMemory = Number.isFinite(system.landWarmCoreDamage) ?
                constrain(system.landWarmCoreDamage,0,1) : 0;
            let landMemorySuppression = 1-Math.pow(1-landMemory,1.7);
            let landSuppression = constrain(max(
                landContactSuppression,landMemorySuppression
            ),0,1);
            // Use a steeper response for the eye/eyewall than for the broad
            // precipitation shield: the center fills before the outer rain
            // field disappears.
            let landCoreFactor = Math.pow(1-landSuppression,1.55);
            let organizationLevel = Number.isFinite(system.organization) ?
                constrain(system.organization,0,1) : 1;
            let lowerWarmCoreLevel = Number.isFinite(system.lowerWarmCore) ?
                constrain(system.lowerWarmCore,0,1) : 1;
            // A weakening eyewall can no longer maintain the dry, subsiding
            // eye. Land damage therefore fills the eye progressively, with
            // the live lower warm-core and organization state adding detail.
            let eyeFillFactor = constrain(
                0.58*landSuppression+
                0.24*(1-lowerWarmCoreLevel)+
                0.18*(1-organizationLevel),
                0,1
            );
            let sizeLevel = constrain(round(system.circulationSize),0,6);
            let typeFactor = system.type===TROP ? 1 :
                system.type===SUBTROP ? 0.84 :
                system.type===MONSOON ? 0.72 :
                system.type===TROPWAVE ? 0.55 : 0.78;
            let intensity = Math.max(
                0.12,
                0.10+0.60*Math.pow(windIntensity,0.85)+
                0.30*Math.pow(pressureIntensity,0.85)
            );
            // Carry the same smooth intensity ladder into inner-core
            // organization. This keeps C3, C4, and C5 from sharing an
            // identical eye/eyewall descriptor after the wind gates saturate.
            // The structural gates remain bounded; base-scan strength below
            // is the channel that carries the extended intensity tail.
            let intensityStructure = 0.62+0.38*Math.pow(
                constrain(intensity,0,1),0.85
            );
            let environmentFactor =
                (0.52+0.48*moistureFactor) *
                (0.72+0.28*sstFactor) *
                (1-0.16*shearFactor) *
                (1-0.25*landSuppression);
            let strength = constrain(intensity*environmentFactor*typeFactor,0,1);
            // The base scan is the storm signal after the environment has
            // shaped it, so avoid a hard intensity floor. Instead, let strong
            // systems tolerate more environmental noise through a continuous
            // nonlinear response: weak systems remain environment-sensitive,
            // while a deep 200 kt cyclone does not collapse into a faint
            // rainband because one sampled field is unfavorable.
            // Keep the response continuous across all system strengths. The
            // old exponent made environmental penalties dominate even for a
            // deep, organized cyclone, leaving the entire base-scan family
            // systematically too faint. Stronger systems get more of their
            // observed contrast back, while weak systems remain sensitive to
            // shear, moisture, SST, and land exposure.
            let baseScanBoost = 1+0.13*Math.pow(intensity,0.75);
            // Do not let the environment exponent become negative when an
            // extreme storm is rendered. That would turn an unfavorable
            // sampled environment into an artificial supercharge; the
            // intensity tail itself is sufficient to preserve the ordering.
            let baseScanEnvironmentExponent = Math.max(
                0.34,1-0.63*Math.pow(constrain(intensity,0,1),0.8)
            );
            let baseScanStrength = Math.max(
                0,
                baseScanBoost*Math.pow(intensity,0.92) *
                Math.pow(typeFactor,0.84) *
                Math.pow(environmentFactor,baseScanEnvironmentExponent)
            );

            // A visible eyewall is a mature, organized tropical feature, not
            // a default ring around every low. Keep weak disturbances and
            // tropical waves as broad, continuous precipitation shields.
            let organizationFactor = constrain((organization-0.52)/0.38,0,1);
            let eyewallPotential = constrain((system.windSpeed-50)/35,0,1) *
                organizationFactor*tropicalFactor*landCoreFactor *
                intensityStructure*(1-0.35*shearFactor);

            let eyewallCycle = Number.isFinite(system.eyewallCycle) ?
                constrain(system.eyewallCycle,0,1) : 0;
            let cycleWeights = typeof eyewallReplacementWeights==='function' ?
                eyewallReplacementWeights(
                    eyewallCycle,
                    system.eyewallFailure,
                    Number.isFinite(system.eyewallFailureEventMode) &&
                        system.eyewallFailureEventMode>0 ?
                        system.eyewallFailureEventMode : system.eyewallFailureMode,
                    system.eyewallReplacementMemory,
                    system.eyewallFailureEvent
                ) : {inner:1,outer:0};
            // Deep convection has its own environmental signal, but the
            // lower-level wind/pressure intensity also contributes to the
            // realized tower strength. This preserves vigorous convection in
            // a weak, moist tropical cyclone without making a deep cyclone's
            // VCDG/ECDG coverage depend only on a sampled activity value. The
            // eye-opening factor attenuates the combined signal while leaving
            // the outer rain shield alive.
            let eyeOpening = typeof simulatedEyeOpeningFactor==='function' ?
                simulatedEyeOpeningFactor({
                    eyewallCycle,
                    eyeOpening: system.eyeOpening,
                    eyewallFailure: system.eyewallFailure,
                    eyewallFailureEvent: system.eyewallFailureEvent
                }) : 0;
            let convectiveActivity = Number.isFinite(system.convectiveActivity) ?
                constrain(system.convectiveActivity,0,1) :
                Number.isFinite(system.convectionActivity) ?
                    constrain(system.convectionActivity,0,1) :
                    constrain(
                        0.25+0.46*moistureFactor+0.28*sstFactor+
                        0.08*(1-intensity),
                        0.12,1
                    );
            let lowerLevelConvection = constrain(intensity,0,1);
            let combinedConvectiveActivity = constrain(
                0.74*convectiveActivity+0.26*lowerLevelConvection,0,1
            );
            // Keep the replacement response visible without starving the
            // convective ring; the outer/capping layer supplies the contrast.
            let convectionStrength = constrain(
                combinedConvectiveActivity*(1-0.22*eyeOpening),0,1
            );
            // Do not leave a replacement ring behind when a historical point
            // or a just-updated live point is on land.
            // These are relative wall weights. Land damage is already applied
            // to eyewallPotential; multiplying here would count it twice.

            // The phase is deterministic so analysis playback and saves do
            // not change the arrangement of rainbands from frame to frame.
            let phase = system.visualSeed%TAU;
            if(phase<0) phase += TAU;
            let replacementEyeRadius = simulatedReplacementRadius(system);
            let outerMultiplier = 1+0.22*landSuppression+0.32*frontalFactor;
            let outerX = max(rmwX*3,system.sigmaX*0.72)*outerMultiplier;
            let outerY = max(rmwY*3,system.sigmaY*0.72)*outerMultiplier;
            let shearOffset = max(rmwX,rmwY)*(
                0.42*shearFactor+0.16*frontalFactor
            );
            // Sample the land surrounding the storm by azimuth. Landfall
            // should erode the inner precipitation field from the landward
            // side, rather than only dimming the whole system uniformly.
            // Keep this profile on the cached descriptor so the rasterizer
            // does not query the land image once for every output pixel.
            let landAbrasionSectorCount = 32;
            let landAbrasionProfile = new Array(landAbrasionSectorCount).fill(0);
            // Keep the spatial landward abrasion separate from the slower
            // center-core collapse. The first landfall sample should still
            // erode the sectors that actually intersect land; only the
            // broad all-around breakdown is time-dependent.
            let landAbrasionBaseline = 0.08*landSuppression;
            // A ring that merely clips land should already lose continuity;
            // the center-core memory then increases that response smoothly
            // instead of making the effect wait for the center to cross land.
            let landContactResponse = 0.42+0.58*landSuppression;
            let abrasionRadii = [0.45,0.75,1.05,1.5,2.1,3.0];
            let abrasionWeights = [1,1,0.92,0.78,0.58,0.4];
            if(typeof land!=='undefined' && land &&
                land.getAtXY instanceof Function){
                for(let sector=0;sector<landAbrasionSectorCount;sector++){
                    let angle = sector*TAU/landAbrasionSectorCount;
                    let exposure = 0;
                    let sampledWeight = 0;
                    for(let sample=0;sample<abrasionRadii.length;sample++){
                        let radiusFactor = abrasionRadii[sample];
                        let sampleX = system.x+Math.cos(angle)*rmwX*radiusFactor;
                        let sampleY = system.y+Math.sin(angle)*rmwY*radiusFactor;
                        if(sampleX<0 || sampleX>WIDTH ||
                            sampleY<0 || sampleY>HEIGHT) continue;
                        let terrain = land.getAtXY(
                            sampleX,this.basin.hemY(sampleY)
                        );
                        sampledWeight += abrasionWeights[sample];
                        if(!terrain) continue;
                        // Any confirmed land contact matters; elevation only
                        // gently increases the severity of the abrasion.
                        terrain = constrain(
                            map(terrain,0.501,1,0.55,1,true),0,1
                        );
                        exposure += terrain*abrasionWeights[sample];
                    }
                    landAbrasionProfile[sector] = max(landAbrasionBaseline,
                        sampledWeight>0 ? exposure/sampledWeight*landContactResponse : 0);
                }
                // Remove pixel-sized coastline steps while retaining the
                // broad landward wedge that breaks the ring.
                let smoothedProfile = new Array(landAbrasionSectorCount);
                for(let sector=0;sector<landAbrasionSectorCount;sector++){
                    let previous = (sector-1+landAbrasionSectorCount)%
                        landAbrasionSectorCount;
                    let next = (sector+1)%landAbrasionSectorCount;
                    smoothedProfile[sector] =
                        0.5*landAbrasionProfile[sector]+
                        0.25*landAbrasionProfile[previous]+
                        0.25*landAbrasionProfile[next];
                }
                landAbrasionProfile = smoothedProfile;
            }
            let eyePotential = constrain((system.windSpeed-58)/42,0,1) *
                organizationFactor*tropicalFactor*landCoreFactor*
                intensityStructure*(1-0.25*shearFactor);
            // Keep the overview map's physical resolution intact, but give
            // the analysis imagery a bounded eye enlargement when the map
            // collapses the inner core to only a few pixels. This scale is
            // applied only by the imagery masks, never by pressure or wind
            // fields, and is shared by BD and the cloud product.
            let imageryEyeScale = constrain(
                4/Math.max(2.5,Math.min(rmwX,rmwY)),1,1.6
            );
            let bandCount = system.type===EXTROP ?
                2+(sizeLevel+floor(phase*10))%2 :
                3+(sizeLevel+floor(phase*10))%3+
                (rainbandPotential>0.72 && system.type!==TROPWAVE ? 1 : 0);
            let bands = [];
            for(let band=0;band<bandCount;band++){
                let seed = phase+band*TAU/bandCount+band*band*0.37;
                let strengthSeed = 0.5+0.5*Math.sin(
                    seed*3.13+band*17.71
                );
                let widthSeed = 0.5+0.5*Math.sin(seed*5.27+band*11.43);
                let reachSeed = 0.5+0.5*Math.sin(
                    seed*7.19+band*23.17
                );
                let startSeed = 0.5+0.5*Math.sin(seed*6.41+band*31.7);
                let curveSeed = 0.5+0.5*Math.sin(seed*9.31+band*5.73);
                let moistureStrength = 0.58+0.58*rainbandPotential;
                bands.push({
                    phase: seed%TAU,
                    strength: constrain(
                        (0.28+0.72*strengthSeed)*moistureStrength,0,1
                    ),
                    width: 0.10+0.17*widthSeed+0.04*frontalFactor+
                        0.035*rainbandPotential,
                    // Humid outer-core convection starts closer to the
                    // eyewall and reaches farther out, so bands are easier to
                    // see and can seed a replacement wall.
                    start: max(0.58,0.82+0.32*startSeed-
                        0.24*rainbandPotential),
                    reach: 1.35+2.65*reachSeed+
                        0.65*rainbandPotential,
                    curvature: 0.45+0.9*curveSeed
                });
            }
            result.push({
                storm: system.storm,
                x: system.x,
                y: system.y,
                rmwX,
                rmwY,
                radiusOfMaxWind: radius,
                outerX,
                outerY,
                outerRadius: constrain(max(outerX/rmwX,outerY/rmwY),3,8),
                windSpeed: system.windSpeed,
                eyeType: system.eyeType,
                eyeDiameter: system.eyeDiameter,
                strength,
                // Keep the pressure/wind intensity available to the cloud-top
                // temperature model. `strength` includes local environmental
                // suppression, which is useful for precipitation products but
                // can make a very deep cyclone's IR dense overcast too warm.
                intensity,
                baseScanStrength,
                convectiveActivity,
                convectionStrength,
                eyeOpening,
                eyewallFactor: eyewallPotential,
                eyeFactor: eyePotential,
                imageryEyeScale,
                eyewallCycle,
                cloudEyeExpansion: system.cloudEyeExpansion,
                eyewallReplacementMemory: system.eyewallReplacementMemory,
                eyewallReplacementHandoff: Number.isFinite(system.eyewallReplacementHandoff) ?
                    constrain(system.eyewallReplacementHandoff,0,1) : 0,
                eyewallFailure: system.eyewallFailure,
                eyewallFailureMode: system.eyewallFailureMode,
                eyewallFailureEvent: system.eyewallFailureEvent,
                eyewallFailureEventMode: system.eyewallFailureEventMode,
                eyewallInnerWeight: cycleWeights.inner,
                eyewallOuterWeight: cycleWeights.outer,
                eyewallOuterRadius: replacementEyeRadius,
                tropicalFactor,
                frontalFactor,
                landSuppression,
                eyeFillFactor,
                landAbrasionProfile,
                landAbrasionSectorCount,
                 landWarmCoreDamage: landMemory,
                 rainbandActivity,
                 rainbandFormation,
                 rainbandPotential,
                 bandPower: 1.7+0.55*frontalFactor+0.28*landSuppression-
                     0.38*rainbandPotential,
                 organization,
                 lowerWarmCore: lowerWarmCoreLevel,
                 shearFactor,
                shearAngle,
                shearOffset,
                bandCount,
                bands,
                frontAngle: shearAngle+this.basin.hem(PI/2),
                phase,
                hemisphere: this.basin.SHem ? -1 : 1
            });
        }

        this.baseScanCacheKey = cacheKey;
        this.baseScanSystems = result;
        return result;
    }

    getSurfaceWind(x,y,z,target,targetStorm){
        let result = target || createVector();
        // EnvField map functions receive hemisphere-normalized coordinates.
        let steering = this.get('LLSteering',x,y,z,true);
        let mapData = MAP_TYPES[this.basin.mapType];
        if(mapData.form!=='earth') mapData = MAP_TYPES[6];
        let longitudeSpan = mapData.east-mapData.west;
        if(longitudeSpan<=0) longitudeSpan += 360;
        let latitudeSpan = abs(mapData.north-mapData.south);
        let longitudeScale = WIDTH/longitudeSpan;
        let latitudeScale = HEIGHT/latitudeSpan;
        // `y` is already hemisphere-normalized by EnvField.get() before the
        // map function is called. Flipping it a second time mirrors the wind
        // scale in Southern Hemisphere basins and puts the field off-center.
        let latitude = Coordinate.convertFromXY(this.basin.mapType,x,y).latitude;
        let latitudeCosine = max(0.25,Math.cos(latitude*Math.PI/180));

        // Convert low-level steering from map units per hour to knots.
        result.set(
            steering.x/longitudeScale*60*latitudeCosine,
            steering.y/latitudeScale*60
        );

        for(let system of this.getPressureSystems(z,targetStorm)){
            let dx = (x-system.x)/longitudeScale*60*system.latitudeCosine;
            let dy = (y-system.y)/latitudeScale*60;
            let radius = Math.hypot(dx,dy);
            let model = system.windModel;
            let maximumWind = model && Number.isFinite(model.maximumWind) ?
                model.maximumWind : system.windSpeed;
            let innerRadius = model && Number.isFinite(model.effectiveInnerRadius) ?
                model.effectiveInnerRadius : system.radiusOfMaxWind;
            let decayExponent = model && Number.isFinite(model.decayExponent) ?
                model.decayExponent :
                system.type===EXTROP ? 0.54 : system.type===MONSOON ? 0.5 : 0.62;
            let angle = Math.atan2(dy,dx);
            let circulationDirection = model &&
                Number.isFinite(model.circulationDirection) ?
                model.circulationDirection : this.basin.SHem ? -1 : 1;
            let motionX = model && Number.isFinite(model.motionX) ?
                model.motionX : 0;
            let motionY = model && Number.isFinite(model.motionY) ?
                model.motionY : 0;
            if(radius<1) continue;

            let radiusFactor = model && typeof model.radiusFactor==='function' ?
                model.radiusFactor(angle) : 1;
            let adjustedInnerRadius = Math.max(1,innerRadius*radiusFactor);
            // Keep the wind field a single source of truth. SAR used to take
            // a separate retrieval path here (replacement profile plus a
            // distant fade), while the E-key surface-wind layer used the
            // idealized profile below. That made the same storm have two
            // incompatible wind fields depending on where it was viewed.
            // The shared replacement profile includes the ordinary asymmetric
            // case as its fallback, so both views now sample identical winds.
            let speed = typeof simulatedReplacementWindProfile==='function' ?
                maximumWind*simulatedReplacementWindProfile(
                    system,radius,decayExponent,angle,z
                ) : radius<adjustedInnerRadius ?
                    maximumWind*pow(radius/adjustedInnerRadius,0.7) :
                    maximumWind*pow(adjustedInnerRadius/radius,decayExponent);
            // The shared profile keeps the resolved core and replacement wall
            // intact, but its idealized power-law tail must not dominate the
            // whole map when several storms are active. Apply the same smooth
            // swath handoff to both E-key and SAR queries.
            if(typeof simulatedSarWindOuterFade==='function')
                speed *= simulatedSarWindOuterFade(
                    radius/Math.max(1,system.radiusOfMaxWind)
                );
            if(speed<2) continue;

            // Use the same circulation direction as getWindRadii(). In
            // normalized coordinates EnvField.get later reflects vector y for
            // the Southern Hemisphere display.
            result.x += circulationDirection*dy/radius*speed;
            result.y -= circulationDirection*dx/radius*speed;
            // Storm translation is a local contribution to the circulation,
            // not a uniform background flow. Adding the full motion vector
            // before the radius check made every storm accelerate every map
            // pixel, so several moving storms could manufacture 100 kt winds
            // far from all of their centers. Weight it by the local storm
            // wind and let it vanish with the storm's outer tail.
            let motionWeight = constrain(
                speed/Math.max(1,maximumWind),0,1
            );
            result.x += motionX*motionWeight;
            result.y += motionY*motionWeight;
        }
        return result;
    }

    beginQueryCache(){
        if(this.queryCacheDepth++===0) this.queryCache = new Map();
    }

    endQueryCache(){
        if(this.queryCacheDepth>0 && --this.queryCacheDepth===0){
            this.queryCache.clear();
            this.queryCache = undefined;
        }
    }

    get(field,x,y,z,noHem){
        if(!this.fields[field]){
            console.error('Field "' + field + '" does not exist in simulation mode ' + this.basin.actMode);
            return 0;
        }
        if(!this.queryCache) return this.fields[field].get(x,y,z,noHem);

        let fieldCache = this.queryCache.get(field);
        if(!fieldCache){
            fieldCache = new Map();
            this.queryCache.set(field,fieldCache);
        }
        let key = x+'|'+y+'|'+z+'|'+(noHem ? 1 : 0);
        if(fieldCache.has(key)){
            let cached = fieldCache.get(key);
            return cached instanceof p5.Vector ? cached.copy() : cached;
        }
        let value = this.fields[field].get(x,y,z,noHem);
        fieldCache.set(key,value instanceof p5.Vector ? value.copy() : value);
        return value;
    }

    getDisplayName(field){
        if(!this.fields[field]){
            console.error('Field "' + field + '" does not exist in simulation mode ' + this.basin.actMode);
            return 0;
        }
        return this.fields[field].displayName;
    }

    formatFieldValue(field,val){
        if(!this.fields[field]){
            console.error('Field "' + field + '" does not exist in simulation mode ' + this.basin.actMode);
            return 0;
        }
        return this.fields[field].displayFormat(val);
    }

    displayLayer(){
        envLayer.clear();
        magnifyingGlass.clear();
        if(this.displaying>=0) this.fields[this.fieldList[this.displaying]].render();
    }

    displayNext(){
        do this.displaying++;
        while(this.displaying<this.fieldList.length && this.fields[this.fieldList[this.displaying]].invisible);
        if(this.displaying>=this.fieldList.length) this.displaying = -1;
        else{
            this.layerIsOceanic = this.fields[this.fieldList[this.displaying]].oceanic;
            let field = this.fields[this.fieldList[this.displaying]];
            this.layerIsVector = field.isVectorField && !field.vectorColorFill;
        }
        this.displayLayer();
    }

    updateMagGlass(){
        magnifyingGlass.clear();
        if(simSettings.showMagGlass && this.displaying>=0) this.fields[this.fieldList[this.displaying]].renderMagGlass();
    }

    init(data){
        if(data instanceof LoadData && data.format<FORMAT_WITH_IMPROVED_ENV){   // Hardcoded conversion of data structure to Format 3 (doesn't affect values, thus old format number should cascade)
            let newData = {};
            let v = data.value;
            let o = (...d)=>{return {
                version: 0,
                accurateAfter: -1,
                noiseData: d
            };};
            newData.jetstream = o(v[8]);
            newData.LLSteering = o(v[7],v[6],v[5],v[4]);
            newData.ULSteering = o(v[3],v[2]);
            newData.shear = o();
            newData.SSTAnomaly = o(v[1]);
            newData.SST = o();
            newData.moisture = o(v[0]);
            data = data.sub(newData);
        }

        for(let f in ENV_DEFS[this.basin.actMode]){ // add all fields specified for the basin's simulation mode
            let attribs = {};
            attribs.modifiers = {};
            if(ENV_DEFS.defaults[f]){
                // field attributes shared among simulation modes
                let defs = ENV_DEFS.defaults[f];
                for(let a in defs){
                    if(a==='modifiers'){
                        for(let m in defs.modifiers) attribs.modifiers[m] = defs.modifiers[m];
                    }else attribs[a] = defs[a];
                }
            }
            // field attributes unique to this basin's simulation mode
            let defs = ENV_DEFS[this.basin.actMode][f];
            for(let a in defs){
                if(a==='modifiers'){
                    for(let m in defs.modifiers) attribs.modifiers[m] = defs.modifiers[m];
                }else attribs[a] = defs[a];
            }
            let d = data instanceof LoadData && data.sub(data.value[f]);
            this.addField(f,d,attribs);
        }
    }
}

class Land{
    constructor(basin, mapImg){
        this.basin = basin instanceof Basin && basin;
        let mapTypeDef = MAP_TYPES[this.basin.mapType];
        this.earth = mapTypeDef.form === 'earth';
        const {fullW: W, fullH: H} = fullDimensions();
        this.map = createImage(W, H);
        if(this.earth){
            this.westBound = mapTypeDef.west;
            this.eastBound = mapTypeDef.east;
            this.northBound = mapTypeDef.north;
            this.southBound = mapTypeDef.south;
            this.wholeEarthMap = mapImg;
        }else if(mapImg){
            this.map.copy(mapImg, 0, 0, mapImg.width, mapImg.height, 0, 0, W, H);
        }
        this.noise = new NoiseChannel(9,0.5,100);
        this.oceanTile = [];
        this.mapDefinition = undefined;
        this.drawn = false;
        this.snowDrawn = false;
        this.shaderDrawn = false;
        this.calculate();
    }

    get(long, lat){
        if(long instanceof Coordinate)
            ({longitude: long, latitude: lat} = long);
        if(this.earth){
            let img = this.wholeEarthMap;
            long = (long + 180) % 360 - 180;
            let x1 = floor(map(long,-180,180,0,img.width));
            let y1 = floor(map(lat,90,-90,0,img.height-1));
            let index = 4 * (y1*img.width*sq(img._pixelDensity)+x1*img._pixelDensity);
            let hVal = img.pixels[index];
            let lVal = img.pixels[index+1];
            if(!lVal)
                return 0;
            else
                return map(sqrt(map(hVal,12,150,0,1,true)),0,1,0.501,1);
        }else{
            let img = this.map;
            let d = this.mapDefinition;
            let {x, y} = Coordinate.convertToXY(this.basin.mapType, long, lat);
            x = floor(x*d);
            y = floor(y*d);
            if(img && x >= 0 && x < img.width && y >= 0 && y < img.height){
                let d0 = img._pixelDensity;
                let index = 4 * (y * img.width * d0 * d0 + x * d0);
                let hVal = img.pixels[index];
                let lVal = img.pixels[index + 1];
                if(!lVal)
                    return 0;
                else
                    return hVal / 255;
            }else return 0;
        }
    }

    _pixelIndexAtXY(x,y){
        if(this.earth){
            let img = this.wholeEarthMap;
            let east = this.eastBound;
            if(east<this.westBound) east += 360;
            let longitude = map(constrain(x,0,WIDTH),0,WIDTH,this.westBound,east);
            longitude = ((longitude+180)%360+360)%360-180;
            let latitude = map(constrain(y,0,HEIGHT),0,HEIGHT,this.northBound,this.southBound);
            let pixelX = floor(map(longitude,-180,180,0,img.width));
            let pixelY = floor(map(latitude,90,-90,0,img.height-1));
            return 4*(pixelY*img.width*sq(img._pixelDensity)+pixelX*img._pixelDensity);
        }

        let img = this.map;
        let pixelX = floor(constrain(x,0,WIDTH)*this.mapDefinition);
        let pixelY = floor(constrain(y,0,HEIGHT)*this.mapDefinition);
        if(!img || pixelX<0 || pixelX>=img.width || pixelY<0 || pixelY>=img.height) return -1;
        let density = img._pixelDensity;
        return 4*(pixelY*img.width*density*density+pixelX*density);
    }

    getAtXY(x,y){
        let index = this._pixelIndexAtXY(x,y);
        if(index<0) return 0;
        let img = this.earth ? this.wholeEarthMap : this.map;
        let heightValue = img.pixels[index];
        if(!img.pixels[index+1]) return 0;
        return this.earth ?
            map(sqrt(map(heightValue,12,150,0,1,true)),0,1,0.501,1) :
            heightValue/255;
    }

    getSubBasinAtXY(x,y){
        let index = this._pixelIndexAtXY(x,y);
        if(index<0) return 0;
        let img = this.earth ? this.wholeEarthMap : this.map;
        return img.pixels[index+2];
    }

    populationAtXY(x,y){
        if(x<0 || x>WIDTH || y<0 || y>HEIGHT) return 0;
        let landValue = this.getAtXY(x,y);
        if(!landValue) return 0;
        return 250000*(1+this.basin.hemY(y)/HEIGHT)*
            Math.pow(0.8,map(landValue,0.5,1,0,30));
    }

    getSubBasin(long, lat){
        if(long instanceof Coordinate)
            ({longitude: long, latitude: lat} = long);
        if(this.earth){
            let img = this.wholeEarthMap;
            long = (long + 180) % 360 - 180;
            let x1 = floor(map(long,-180,180,0,img.width));
            let y1 = floor(map(lat,90,-90,0,img.height-1));
            let index = 4 * (y1*img.width*sq(img._pixelDensity)+x1*img._pixelDensity);
            return img.pixels[index+2];
        }else{
            let img = this.map;
            let d = this.mapDefinition;
            let {x, y} = Coordinate.convertToXY(this.basin.mapType, long, lat);
            x = floor(x*d);
            y = floor(y*d);
            if(img && x >= 0 && x < img.width && y >= 0 && y < img.height){
                let d0 = img._pixelDensity;
                let index = 4 * (y * img.width * d0 * d0 + x * d0);
                return img.pixels[index + 2];
            }else return 0;
        }
    }

    inBasin(long, lat){
        let r = this.getSubBasin(long, lat);
        return this.basin.subInBasin(r);
    }

    calculate(){
        const {fullW: W, fullH: H} = fullDimensions();
        let mapTypeControls = MAP_TYPES[this.basin.mapType];
        let mapForm = mapTypeControls.form;
        if(this.earth){                     // crop whole earth map to the map type's sector, used for drawing (but not getting)
            let earth = this.wholeEarthMap;
            let sector = this.map;
            let west_x = floor(map(this.westBound,-180,180,0,earth.width));
            let east_x = floor(map(this.eastBound,-180,180,0,earth.width));
            let north_y = floor(map(this.northBound,90,-90,0,earth.height-1));
            let south_y = floor(map(this.southBound,90,-90,0,earth.height-1));
            if(this.eastBound < this.westBound){
                let idl_x = W * (180 - this.westBound) / (this.eastBound + 360 - this.westBound);
                sector.copy(earth, west_x, north_y, earth.width - west_x, south_y - north_y, 0, 0, idl_x, H);
                sector.copy(earth, 0, north_y, east_x, south_y - north_y, idl_x, 0, W - idl_x, H);
            }else{
                sector.copy(earth, west_x, north_y, east_x - west_x, south_y - north_y, 0, 0, W, H);
            }
            sector.loadPixels();
            // for(let i = 0; i < sector.pixels.length; i += 4){
            //     let h = map(sqrt(map(sector.pixels[i],12,150,0,1,true)),0,1,0.501,1);
            //     sector.pixels[i] = floor(h * 255);
            // }
            // sector.updatePixels();
        }else if(mapForm === 'pixelmap'){   // map is already given; calculate ocean tile values
            let img = this.map;
            let mapDef = this.mapDefinition = W/WIDTH;
            let density = img._pixelDensity;
            let pixels = img.pixels;
            for(let i = 0; i < W; i++){
                for(let j = 0; j < H; j++){
                    let x = i/mapDef;
                    let y = j/mapDef;
                    let index = 4 * (j * W * density * density + i * density);
                    let landVal = pixels[index] / 255;
                    let ox = floor(x/ENV_LAYER_TILE_SIZE);
                    let oy = floor(y/ENV_LAYER_TILE_SIZE);
                    if(!this.oceanTile[ox])
                        this.oceanTile[ox] = [];
                    if(landVal <= 0.5)
                        this.oceanTile[ox][oy] = true;
                }
            }
        }else{                              // procedurally generate map from noise and store in this.map image
            let img = this.map;
            let mapDef = this.mapDefinition = W/WIDTH;

            img.loadPixels();
            let pixels = img.pixels;
            let density = img._pixelDensity;
    
            for(let i=0;i<W;i++){
                for(let j=0;j<H;j++){
                    let index = 4 * (j * W * density * density + i * density);
                    let landVal;
                    let x = i/mapDef;
                    let y = j/mapDef;
                    let n = this.noise.get(x,y);
                    let landBiasFactors = mapTypeControls.landBiasFactors;
                    let landBias;
                    if(mapTypeControls.form == "linear"){
                        let landBiasAnchor = WIDTH * landBiasFactors[0];
                        landBias = x < landBiasAnchor ?
                            map(x,0,landBiasAnchor,landBiasFactors[1],landBiasFactors[2]) :
                            map(x-landBiasAnchor,0,WIDTH-landBiasAnchor,landBiasFactors[2],landBiasFactors[3]);
                    }else if(mapTypeControls.form == "radial"){
                        let EWAnchor = WIDTH * landBiasFactors[0];
                        let NSAnchor = HEIGHT * landBiasFactors[1];
                        let pointDist = sqrt(sq(x-EWAnchor)+sq(y-NSAnchor));
                        let distAnchor1 = landBiasFactors[2] * sqrt(WIDTH*HEIGHT);
                        let distAnchor2 = landBiasFactors[3] * sqrt(WIDTH*HEIGHT);
                        landBias = pointDist < distAnchor1 ?
                            map(pointDist,0,distAnchor1,landBiasFactors[4],landBiasFactors[5]) : pointDist < distAnchor2 ?
                            map(pointDist,distAnchor1,distAnchor2,landBiasFactors[5],landBiasFactors[6]) :
                            landBiasFactors[6];
                    }
                    landVal = n + landBias;
                    pixels[index] = floor(landVal * 255);
                    pixels[index + 1] = landVal > 0.5 ? 255 : 0;
                    let ox = floor(x/ENV_LAYER_TILE_SIZE);
                    let oy = floor(y/ENV_LAYER_TILE_SIZE);
                    if(!this.oceanTile[ox])
                        this.oceanTile[ox] = [];
                    if(landVal <= 0.5)
                        this.oceanTile[ox][oy] = true;
                }
            }
            img.updatePixels();
        }
    }

    *draw(){
        yield "Rendering land...";
        const {fullW: W, fullH: H} = fullDimensions();
        const src = this.map.pixels; // source image for land data; red channel is elevation; green channel is land/water; blue channel is sub-basin id

        // abbreviate pixel arrays of images to draw to
        const landPx = landBuffer.pixels;
        const coastPx = coastLine.pixels;
        const outBasinPx = outBasinBuffer.pixels;

        // cache colors for 256 possible land height values to avoid expensive calculations in pixel loop
        const C = COLORS.land;
        const colorCache = [];
        for(let i = 255, ci = 0; i >= 0; i--){
            let l;
            if(this.earth)
                l = map(sqrt(map(i,12,150,0,1,true)),0,1,0.501,1);
            else
                l = Math.max(i / 255, 0.501);
            if(C[ci] && l <= C[ci][0])
                ci++;
            if(ci >= C.length)
                colorCache[i] = {r: 0, g: 0, b: 0};
            else{
                let color = C[ci][1];
                if(simSettings.smoothLandColor && ci > 0){
                    const color1 = C[ci - 1][1];
                    const f = map(l, C[ci][0], C[ci - 1][0], 0, 1);
                    color = lerpColor(color, color1, f);
                }
                colorCache[i] = {r: red(color), g: green(color), b: blue(color)};
            }
        }
        colorCache.outBasin = {r: red(COLORS.outBasin), g: green(COLORS.outBasin), b: blue(COLORS.outBasin)};

        // cache of booleans of whether a sub-basin is out-basin or not; cached as-needed from within pixel loop as sub-basin ids are assumed unknown
        const outBasinCache = {};

        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let index = 4 * (j * W + i);
                if(src[index + 1]){ // if pixel is on land
                    const v = src[index]; // land elevation value
                    landPx[index] = colorCache[v].r;
                    landPx[index + 1] = colorCache[v].g;
                    landPx[index + 2] = colorCache[v].b;
                    landPx[index + 3] = 255;

                    let touchingOcean = false;
                    if(i>0 && !src[index - 4 + 1]) touchingOcean = true;
                    if(j>0 && !src[index - 4 * W + 1]) touchingOcean = true;
                    if(i<W-1 && !src[index + 4 + 1]) touchingOcean = true;
                    if(j<H-1 && !src[index + 4 * W + 1]) touchingOcean = true;
                    if(touchingOcean){
                        coastPx[index] = 0;
                        coastPx[index + 1] = 0;
                        coastPx[index + 2] = 0;
                        coastPx[index + 3] = 255;
                    }else
                        coastPx[index + 3] = 0;
                    outBasinPx[index + 3] = 0;
                }else{
                    landBuffer.pixels[index + 3] = 0;
                    coastPx[index + 3] = 0;
                    const sb = src[index + 2]; // sub-basin id
                    if(outBasinCache[sb] === undefined)
                        outBasinCache[sb] = !this.basin.subInBasin(sb);
                    if(outBasinCache[sb]){
                        outBasinPx[index] = colorCache.outBasin.r;
                        outBasinPx[index + 1] = colorCache.outBasin.g;
                        outBasinPx[index + 2] = colorCache.outBasin.b;
                        outBasinPx[index + 3] = 255;
                    }else
                        outBasinPx[index + 3] = 0;
                }
            }
        }
        landBuffer.updatePixels();
        outBasinBuffer.updatePixels();
        coastLine.updatePixels();
        if(simSettings.snowLayers && !this.snowDrawn){
            yield* this.drawSnow();
        }
        if(simSettings.useShadows && !this.shaderDrawn){
            yield* this.drawShader();
        }
        this.drawn = true;
    }

    *drawSnow(){
        yield "Rendering " + (random()<0.02 ? "sneaux" : "snow") + "...";
        const {fullW: W, fullH: H} = fullDimensions();
        const src = this.map.pixels; // source image for land data; red channel is elevation; green channel is land/water; blue channel is sub-basin id

        const eleCache = []; // cache elevation values to avoid expensive function calls in pixel loop
        for(let i = 255; i >= 0; i--){
            let l;
            if(this.earth)
                l = map(sqrt(map(i,12,150,0,1,true)),0,1,0.501,1);
            else
                l = Math.max(i / 255, 0.501);
            eleCache[i] = l;
        }
        const snowColor = {r: red(COLORS.snow), g: green(COLORS.snow), b: blue(COLORS.snow)};
        
        const SHem = this.basin.SHem;
        
        const snowLayers = simSettings.snowLayers * 10;
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let index = 4 * (j * W + i);
                if(src[index + 1]){ // if pixel is on land
                    let l = 1 - j / H;
                    if(SHem)
                        l = 1 - l;
                    let h = 0.95 - eleCache[src[index]];
                    let p = l > 0 ? Math.ceil((snowLayers / 0.3) * (h / l - 0.15)) : h < 0 ? 0 : snowLayers;
                    for(let k = 0; k < snowLayers; k++){
                        if(k >= p){
                            snow[k].pixels[index] = snowColor.r;
                            snow[k].pixels[index + 1] = snowColor.g;
                            snow[k].pixels[index + 2] = snowColor.b;
                            snow[k].pixels[index + 3] = 255;
                        }else
                            snow[k].pixels[index + 3] = 0;
                    }
                }else{
                    for(let k = 0; k < snowLayers; k++){
                        snow[k].pixels[index + 3] = 0;
                    }
                }
            }
        }
        for(let k = 0; k < snowLayers; k++){
            snow[k].updatePixels();
        }
        this.snowDrawn = true;
    }

    *drawShader(){
        yield "Rendering shadows...";
        const {fullW: W, fullH: H} = fullDimensions();
        const src = this.map.pixels; // source image for land data; red channel is elevation; green channel is land/water; blue channel is sub-basin id

        const eleCache = []; // cache elevation values to avoid expensive function calls in pixel loop
        for(let i = 255; i >= 0; i--){
            let l;
            if(this.earth)
                l = map(sqrt(map(i,12,150,0,1,true)),0,1,0.501,1);
            else
                l = Math.max(i / 255, 0.501);
            eleCache[i] = l;
        }
        
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let index = 4 * (j * W + i);
                let v = src[index + 1] ? eleCache[src[index]] : 0.5;
                let m = 0;
                for(let k = 1; k < 6; k++){
                    let s = eleCache[src[index - 4 * k * W - 4 * k]] - v - k * 0.0008;
                    s = Math.min(Math.max(s * 191 / 0.14, 0), 191);
                    if(s > m) m = s;
                }
                if(m > 0){
                    landShadows.pixels[index] = 0;
                    landShadows.pixels[index + 1] = 0;
                    landShadows.pixels[index + 2] = 0;
                    landShadows.pixels[index + 3] = Math.floor(m);
                }else
                    landShadows.pixels[index + 3] = 0;
            }
        }
        landShadows.updatePixels();
        this.shaderDrawn = true;
    }

    tileContainsOcean(x,y){
        if(this.earth)
            return true;
        
        x = floor(x/ENV_LAYER_TILE_SIZE);
        y = floor(y/ENV_LAYER_TILE_SIZE);
        return this.oceanTile[x][y];
    }

    clearSnow(){
        // for(let i=0;i<MAX_SNOW_LAYERS;i++) snow[i].clear();
        this.snowDrawn = false;
    }

    clear(){
        // landBuffer.clear();
        // outBasinBuffer.clear();
        // coastLine.clear();
        // landShadows.clear();
        this.clearSnow();
        this.drawn = false;
        this.shaderDrawn = false;
    }
}

function seasonalSine(t,off){
    off = off===undefined ? 5/12 : off;
    return sin((TAU*(t-YEAR_LENGTH*off))/YEAR_LENGTH);
}

// Tropical activity with a non-zero off-season floor. This keeps
// the strong annual cycle while allowing rare tropical development in every
// month, as occurs in basins such as the western North Pacific.
function tropicalSeasonalActivity(t,offSeasonFloor){
    offSeasonFloor = offSeasonFloor===undefined ? 0.24 : offSeasonFloor;
    let seasonal = max(0,(seasonCurve(t)+1)/2);
    // Some special modes deliberately exceed the normal seasonal maximum.
    // Preserve that behaviour and only reshape the quiet half of the curve.
    return seasonal>=1 ? seasonal : lerp(offSeasonFloor,1,seasonal);
}

// quick and sloppy copy-paste of spooky code for Halloween update
// this, the regular season curve, and the wild mode season curve could all be implemented in a more concise way, but that can be done later and this codebase is being retired eventually anyway
function spookySeasonCurve(t,off){
    off = off===undefined ? 0 : off;
    let n = (1+t/YEAR_LENGTH-off)%1;
    return n<5/24 ? map(n,0,5/24,-0.2,-1) : n<5/12 ? map(n,5/24,5/12,-1,0) : n<3/4 ? map(n,5/12,3/4,0,1.2) : n<39/48 ? map(n,3/4,39/48,1.2,1.5) : n<302.5/365.25 ? map(n,39/48,302.5/365.25,1.5,2.2) : n<305/365.25 ? 2.2 : n<81/96 ? map(n,305/365.25,81/96,2.2,0.8) : map(n,81/96,1,0.8,-0.2);
}
