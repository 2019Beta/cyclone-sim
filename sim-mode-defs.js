// ---- Simulation Modes ---- //

const SIMULATION_MODES = ['Normal','Hyper','Wild','Megablobs','Experimental','Spooky']; // Labels for sim mode selector UI
const SIM_MODE_NORMAL = 0;
const SIM_MODE_HYPER = 1;
const SIM_MODE_WILD = 2;
const SIM_MODE_MEGABLOBS = 3;
const SIM_MODE_EXPERIMENTAL = 4;
const SIM_MODE_SPOOKY = 5;

// ---- Active Attributes ---- //

// Active attributes are data of ActiveSystem not inherited from StormData; used for simulation of active storm systems
// Here defines the names of these attributes for a given simulation mode

const ACTIVE_ATTRIBS = {};

ACTIVE_ATTRIBS.defaults = [
    'organization',
    'lowerWarmCore',
    'upperWarmCore',
    'depth'
];

ACTIVE_ATTRIBS[SIM_MODE_EXPERIMENTAL] = [
    'organization',
    'lowerWarmCore',
    'upperWarmCore',
    'depth',
    'kaboom'
];

// ---- Season Curve ---- //

const SEASON_CURVE = {};

SEASON_CURVE.default = 'seasonalSine';
SEASON_CURVE[SIM_MODE_SPOOKY] = 'spookySeasonCurve';


// ---- Spawn Rules ---- //

const SPAWN_RULES = {};

SPAWN_RULES.defaults = {};
SPAWN_RULES[SIM_MODE_NORMAL] = {};
SPAWN_RULES[SIM_MODE_HYPER] = {};
SPAWN_RULES[SIM_MODE_WILD] = {};
SPAWN_RULES[SIM_MODE_MEGABLOBS] = {};
SPAWN_RULES[SIM_MODE_EXPERIMENTAL] = {};
SPAWN_RULES[SIM_MODE_SPOOKY] = {};

// -- Defaults -- //

SPAWN_RULES.defaults.archetypes = {
    'tw': {
        x: ()=>random(0,WIDTH-1),
        y: (b)=>b.hemY(random(HEIGHT*0.7,HEIGHT*0.9)),
        pressure: [1000, 1020],
        windSpeed: [15, 35],
        type: TROPWAVE,
        organization: [0,0.3],
        lowerWarmCore: 1,
        upperWarmCore: 1,
        depth: 0
    },
    'ex': {
        x: ()=>random(0,WIDTH-1),
        y: (b,x)=>b.hemY(b.env.get("jetstream",x,0,b.tick)+random(-75,75)),
        pressure: [1000, 1020],
        windSpeed: [15, 35],
        type: EXTROP,
        organization: 0,
        lowerWarmCore: 0,
        upperWarmCore: 0,
        depth: 1
    },
    'l': {
        inherit: 'tw',
        pressure: 1015,
        windSpeed: 15,
        organization: 0.2
    },
    'x': {
        inherit: 'ex',
        pressure: 1005,
        windSpeed: 15
    },
    'tc': {
        pressure: 1005,
        windSpeed: 25,
        type: TROP,
        organization: 1,
        lowerWarmCore: 1,
        upperWarmCore: 1,
        depth: 0
    },
    'stc': {
        inherit: 'tc',
        type: SUBTROP,
        lowerWarmCore: 0.6,
        upperWarmCore: 0.5
    },
    'n': {
        inherit: 'tw',
        pressure: [994,1008],
        windSpeed: [20,65],
        type: MONSOON,
        radiusOfMaxWind: [60,100],
        organization: [0.18,0.42],
        lowerWarmCore: [0.58,0.78],
        upperWarmCore: [0.48,0.68],
        depth: 0.35
    },
    'd': {
        inherit: 'tc'
    },
    'D': {
        inherit: 'stc'
    },
    's': {
        inherit: 'tc',
        pressure: 995,
        windSpeed: 45
    },
    'S': {
        inherit: 'stc',
        pressure: 995,
        windSpeed: 45
    },
    '1': {
        inherit: 'tc',
        pressure: 985,
        windSpeed: 70
    },
    '2': {
        inherit: 'tc',
        pressure: 975,
        windSpeed: 90
    },
    '3': {
        inherit: 'tc',
        pressure: 960,
        windSpeed: 105
    },
    '4': {
        inherit: 'tc',
        pressure: 945,
        windSpeed: 125
    },
    '5': {
        inherit: 'tc',
        pressure: 925,
        windSpeed: 145
    },
    '6': {
        inherit: 'tc',
        pressure: 890,
        windSpeed: 170
    },
    '7': {
        inherit: 'tc',
        pressure: 840,
        windSpeed: 210
    },
    '8': {
        inherit: 'tc',
        pressure: 800,
        windSpeed: 270
    },
    '9': {
        inherit: 'tc',
        pressure: 765,
        windSpeed: 330
    },
    '0': {
        inherit: 'tc',
        pressure: 730,
        windSpeed: 400
    },
    'y': {
        inherit: 'tc',
        pressure: 690,
        windSpeed: 440
    }
};

SPAWN_RULES.defaults.doSpawn = function(b){
    // Keep a small background of tropical disturbances throughout the year.
    // The old formula reached exactly zero at the seasonal minimum, which made
    // off-season tropical cyclogenesis practically impossible even when a
    // locally favourable pocket of SST, moisture, and shear existed.
    let tropicalActivity = tropicalSeasonalActivity(b.tick);

    // tropical waves
    if(random()<0.015*sq(tropicalActivity)) b.spawnArchetype('tw');

    // broad, loosely organized monsoon depressions
    if(random()<0.0008*sq(tropicalActivity)) b.spawnArchetype('n');

    // extratropical cyclones
    if(random()<0.01-0.002*seasonCurve(b.tick)) b.spawnArchetype('ex');
};

// -- Normal Mode -- //

SPAWN_RULES[SIM_MODE_NORMAL].doSpawn = SPAWN_RULES.defaults.doSpawn;

// -- Hyper Mode -- //

SPAWN_RULES[SIM_MODE_HYPER].doSpawn = function(b){
    if(random()<(0.013*sq((seasonCurve(b.tick)+1)/2)+0.002)) b.spawnArchetype('tw');

    if(random()<0.0012*sq((seasonCurve(b.tick)+1)/2)) b.spawnArchetype('n');

    if(random()<0.01-0.002*seasonCurve(b.tick)) b.spawnArchetype('ex');
};

// -- Wild Mode -- //

SPAWN_RULES[SIM_MODE_WILD].archetypes = {
    'tw': {
        x: ()=>random(0,WIDTH-1),
        y: (b)=>b.hemY(random(HEIGHT*0.2,HEIGHT*0.9)),
        pressure: [1000, 1020],
        windSpeed: [15, 35],
        type: TROPWAVE,
        organization: [0,0.3],
        lowerWarmCore: 1,
        upperWarmCore: 1,
        depth: 0
    }
};

SPAWN_RULES[SIM_MODE_WILD].doSpawn = function(b){
    if(random()<0.015) b.spawnArchetype('tw');
    if(random()<0.001) b.spawnArchetype('n');
    if(random()<0.01-0.002*seasonCurve(b.tick)) b.spawnArchetype('ex');
};

// -- Megablobs Mode -- //

SPAWN_RULES[SIM_MODE_MEGABLOBS].doSpawn = function(b){
    if(random()<(0.013*sq((seasonCurve(b.tick)+1)/2)+0.002)) b.spawnArchetype('tw');

    if(random()<0.01-0.002*seasonCurve(b.tick)) b.spawnArchetype('ex');
};

// -- Experimental Mode -- //

SPAWN_RULES[SIM_MODE_EXPERIMENTAL].archetypes = {
    'tw': {
        x: ()=>random(0,WIDTH-1),
        y: (b)=>b.hemY(random(HEIGHT*0.7,HEIGHT*0.9)),
        pressure: [1000, 1020],
        windSpeed: [15, 35],
        type: TROPWAVE,
        organization: [0,0.3],
        lowerWarmCore: 1,
        upperWarmCore: 1,
        depth: 0,
        kaboom: 0
    },
    'ex': {
        x: ()=>random(0,WIDTH-1),
        y: (b,x)=>b.hemY(b.env.get("jetstream",x,0,b.tick)+random(-75,75)),
        pressure: [1000, 1020],
        windSpeed: [15, 35],
        type: EXTROP,
        organization: 0,
        lowerWarmCore: 0,
        upperWarmCore: 0,
        depth: 1,
        kaboom: 0
    },
    'tc': {
        pressure: 1005,
        windSpeed: 25,
        type: TROP,
        organization: 1,
        lowerWarmCore: 1,
        upperWarmCore: 1,
        depth: 0,
        kaboom: 0.2
    },
    'l': {
        inherit: 'tw',
        pressure: 1015,
        windSpeed: 15,
        organization: 0.2,
        kaboom: 0.2
    },
    'x': {
        inherit: 'ex',
        pressure: 1005,
        windSpeed: 15,
        kaboom: 0.2
    }
};

SPAWN_RULES[SIM_MODE_EXPERIMENTAL].doSpawn = SPAWN_RULES[SIM_MODE_HYPER].doSpawn;

// -- Spooky Mode -- //

SPAWN_RULES[SIM_MODE_SPOOKY].doSpawn = SPAWN_RULES.defaults.doSpawn;


// ---- Definitions of Environmental Fields ---- //

const ENV_DEFS = {};

ENV_DEFS.defaults = {}; // Env field attributes that are the same across multiple simulation modes
ENV_DEFS[SIM_MODE_NORMAL] = {}; // Register env fields as part of "Normal" simulation mode and define unique attributes
ENV_DEFS[SIM_MODE_HYPER] = {}; // Same for "Hyper" simulation mode
ENV_DEFS[SIM_MODE_WILD] = {};  // "Wild" simulation mode
ENV_DEFS[SIM_MODE_MEGABLOBS] = {}; // "Megablobs" simulation mode
ENV_DEFS[SIM_MODE_EXPERIMENTAL] = {}; // "Experimental" simulation mode
ENV_DEFS[SIM_MODE_SPOOKY] = {}; // "Spooky" simulation mode

// -- Sample Env Field -- //

// ENV_DEFS.defaults.sample = {
//     version: 0,
//     mapFunc: (u,x,y,z)=>{
//         // Insert code here
//     },
//     hueMap: (v)=>{
//         // Insert code here
//     },
//     oceanic: true,
//     vector: false,
//     invisible: false,
//     magMap: undefined,
//     noWobble: false,
//     noiseChannels: [
//         [6,0.5,150,3000,0.05,1.5]
//     ]
// };
// ENV_DEFS[SIM_MODE_NORMAL].sample = {};
// ENV_DEFS[SIM_MODE_HYPER].sample = {
//     mapFunc: (u,x,y,z)=>{
//         // Insert code here
//     }
// };
// ENV_DEFS[SIM_MODE_WILD].sample = {};
// ENV_DEFS[SIM_MODE_MEGABLOBS].sample = {};
// ENV_DEFS[SIM_MODE_EXPERIMENTAL].sample = {};

// -- jetstream -- //

ENV_DEFS.defaults.jetstream = {
    version: 0,
    mapFunc: (u,x,y,z)=>{
        let v = u.noise(0,x-z*3,0,z);
        let peakLat = u.modifiers.peakLat;
        let antiPeakLat = u.modifiers.antiPeakLat;
        let peakRange = u.modifiers.peakRange;
        let antiPeakRange = u.modifiers.antiPeakRange;
        let s = seasonCurve(z);
        let l = map(sqrt(map(s,-1,1,0,1)),0,1,antiPeakLat,peakLat);
        let r = map(s,-1,1,antiPeakRange,peakRange);
        v = map(v,0,1,-r,r);
        return (l+v)*HEIGHT;
    },
    invisible: true,
    noiseChannels: [
        [4,0.5,160,300,1,2]
    ],
    modifiers: {
        peakLat: 0.35,
        antiPeakLat: 0.55,
        peakRange: 0.35,
        antiPeakRange: 0.5
    }
};
ENV_DEFS[SIM_MODE_NORMAL].jetstream = {};
ENV_DEFS[SIM_MODE_HYPER].jetstream = {
    modifiers: {
        peakLat: 0.25,
        antiPeakLat: 0.47,
        peakRange: 0.25,
        antiPeakRange: 0.45
    }
};
ENV_DEFS[SIM_MODE_WILD].jetstream = {
    mapFunc: (u,x,y,z)=>{
        let v = u.noise(0,x-z*3,0,z);
        let s = u.yearfrac(z);
        let l = u.piecewise(s,[[1,0.65],[2.5,-0.15],[10,-0.15],[11.5,0.65]]);
        let r = u.piecewise(s,[[0.5,0.3],[1.75,0.7],[3,0.2],[9.5,0.2],[10.75,0.7],[12,0.3]]);
        v = map(v,0,1,-r,r);
        return (l+v)*HEIGHT;
    }
};
ENV_DEFS[SIM_MODE_MEGABLOBS].jetstream = {
    modifiers: {
        peakLat: 0.25,
        antiPeakLat: 0.47,
        peakRange: 0.25,
        antiPeakRange: 0.45
    }
};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].jetstream = {};
ENV_DEFS[SIM_MODE_SPOOKY].jetstream = {};

// -- LLSteering -- //

ENV_DEFS.defaults.LLSteering = {
    displayName: 'Low-level steering',
    version: 0,
    mapFunc: (u,x,y,z)=>{
        u.vec.set(1);    // reset vector

        // Jetstream
        let j = u.field('jetstream');
        // Cosine curve from 0 at poleward side of map to 1 at equatorward side
        let h = map(cos(map(y,0,HEIGHT,0,PI)),-1,1,1,0);
        // westerlies
        let west = constrain(pow(1-h+map(u.noise(0), 0, 1, -u.modifiers.westerlyNoiseRange, u.modifiers.westerlyNoiseRange)+map(j, 0, HEIGHT, -u.modifiers.westerlyJetstreamEffectRange, u.modifiers.westerlyJetstreamEffectRange),2)*4,0, u.modifiers.westerlyMax);
        // ridging and trades
        let ridging = constrain(u.noise(1)+map(j, 0, HEIGHT, u.modifiers.ridgingJetstreamEffectRange, -u.modifiers.ridgingJetstreamEffectRange),0,1);
        let trades = constrain(pow(h+map(ridging, 0, 1, -u.modifiers.tradesRidgingEffectRange, u.modifiers.tradesRidgingEffectRange),2)*3,0, u.modifiers.tradesMax);
        let tAngle = map(h, 0.9, 1, u.modifiers.tradesAngle, u.modifiers.tradesAngleEquator); // trades angle
        // noise angle
        let a = map(u.noise(3),0,1,0,4*TAU);
        // noise magnitude
        let m = pow(u.modifiers.noiseBase, map(u.noise(2), 0, 1, u.modifiers.noiseExponentMin, u.modifiers.noiseExponentMax));

        // apply to vector
        u.vec.rotate(a);
        u.vec.mult(m);
        u.vec.add(west+trades*cos(tAngle),trades*sin(tAngle));
        return u.vec;
    },
    displayFormat: v=>{
        let speed = round(v.mag()*100)/100;
        let direction = v.heading();
        // speed is still in "u/hr" (coordinate units per hour) for now
        return speed + ' u/hr ' + compassHeading(direction);
    },
    vector: true,
    magMap: [0,3,0,16],
    noiseChannels: [
        [4,0.5,80,100,1,3],
        '',
        '',
        [4,0.5,170,300,1,3]
    ],
    modifiers: {
        westerlyNoiseRange: 0.3,
        westerlyJetstreamEffectRange: 0.4,
        westerlyMax: 4,
        ridgingJetstreamEffectRange: 0.3,
        tradesRidgingEffectRange: 0.3,
        tradesMax: 3,
        tradesAngleEquator: 17*Math.PI/16,
        tradesAngle: 511*Math.PI/512,
        noiseBase: 1.5,
        noiseExponentMin: -8,
        noiseExponentMax: 4
    }
};
ENV_DEFS[SIM_MODE_NORMAL].LLSteering = {};
ENV_DEFS[SIM_MODE_HYPER].LLSteering = {};
ENV_DEFS[SIM_MODE_WILD].LLSteering = {
    mapFunc: (u,x,y,z)=>{
        u.vec.set(1);    // reset vector

        let s = u.yearfrac(z);
        let wind = u.piecewise(s,[[1,3],[2.5,1],[4.5,0.5],[6,0.75],[7.5,0.65],[7.75,0.05],[8,1.1],[10,1.8],[11,3]]); // wind strength
        let windAngle = u.piecewise(s,[[1,13*PI/8],[2.5,9*PI/8],[4.5,PI],[6,17*PI/16],[7.5,17*PI/16],[8,31*PI/16],[10,15*PI/8],[11.5,13*PI/8]]); // wind angle
        // noise angle
        let a = map(u.noise(3),0,1,0,4*TAU);
        // noise magnitude
        let m = pow(u.modifiers.noiseBase, map(u.noise(2), 0, 1, u.modifiers.noiseExponentMin, u.modifiers.noiseExponentMax));

        // apply to vector
        u.vec.rotate(a);
        u.vec.mult(m);
        u.vec.add(wind*cos(windAngle),wind*sin(windAngle));
        return u.vec;
    },
    modifiers: {
        noiseExponentMin: -3,
        noiseExponentMax: 4
    }
};
ENV_DEFS[SIM_MODE_MEGABLOBS].LLSteering = {};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].LLSteering = {};
ENV_DEFS[SIM_MODE_SPOOKY].LLSteering = {};

// -- ULSteering -- //

ENV_DEFS.defaults.ULSteering = {
    displayName: 'Upper-level steering',
    version: 0,
    mapFunc: (u,x,y,z)=>{
        u.vec.set(1);                                                                           // reset vector

        const dx = u.modifiers.jetstreamDeltaX;                                                 // delta-x for jetstream differential (used for calculating wind direction in and near jetstream)

        let m = u.noise(1);

        let s = seasonCurve(z);
        let j0 = u.field('jetstream');                                                          // y-position of jetstream
        let j1 = u.field('jetstream',x+dx);                                                     // y-position of jetstream dx to the east for differential
        let j = abs(y-j0);                                                                      // distance of point north/south of jetstream
        let jet = pow(2, 3 - j / u.modifiers.jetstreamHalfDecay);                               // power of jetstream at point
        let jOP = pow(u.modifiers.jetstreamOverpowerBase, jet);                                 // factor for how strong other variables should be if 'overpowered' by jetstream
        let jAngle = atan((j1 - j0) / dx) + map(y-j0, -50, 50, u.modifiers.jetstreamInwardAngle, -u.modifiers.jetstreamInwardAngle, true); // angle of jetstream at point
        let trof = y>j0 ? pow(u.modifiers.troughBase, map(jAngle, -PI/2, PI/2, u.modifiers.troughExponentMax, u.modifiers.troughExponentMin)) * pow(0.7,j/20)*jOP : 0; // pole-eastward push from jetstream dips
        let tAngle = u.modifiers.troughAngle;                                                   // angle of push from jetstream dips
        let ridging = 0.45-j0/HEIGHT-map(sqrt(map(s,-1,1,0,1)),0,1,0.15,0);                     // how much 'ridge' or 'trough' there is from jetstream
        // power of winds equatorward of jetstream
        let hadley = (map(ridging, -0.3, 0.2, u.modifiers.hadleyUpperBound, u.modifiers.hadleyLowerBound, true) + map(m,0,1,-1.5,1.5))*jOP*(y>j0?1:0);
        // angle of winds equatorward of jetstream
        let hAngle = map(ridging,-0.3,0.2, u.modifiers.hadleyAngleMin, u.modifiers.hadleyAngleMax,true);
        let ferrel = 2*jOP*(y<j0?1:0);                                                          // power of winds poleward of jetstream
        let fAngle = 5*PI/8;                                                                    // angle of winds poleward of jetstream

        let a = map(u.noise(0),0,1,0,4*TAU);                                                    // noise angle
        m = pow(u.modifiers.noiseBase, map(m, 0, 1, u.modifiers.noiseExponentMin, u.modifiers.noiseExponentMax))*jOP; // noise magnitude

        // apply noise
        u.vec.rotate(a);
        u.vec.mult(m);

        // apply UL winds
        u.vec.add(jet*cos(jAngle),jet*sin(jAngle));                                             // apply jetstream
        u.vec.add(trof*cos(tAngle),trof*sin(tAngle));                                           // apply trough push
        u.vec.add(hadley*cos(hAngle),hadley*sin(hAngle));                                       // apply winds equatorward of jetstream
        u.vec.add(ferrel*cos(fAngle),ferrel*sin(fAngle));                                       // apply winds poleward of jetstream

        return u.vec;
    },
    displayFormat: v=>{
        let speed = round(v.mag()*100)/100;
        let direction = v.heading();
        // speed is still in "u/hr" (coordinate units per hour) for now
        return speed + ' u/hr ' + compassHeading(direction);
    },
    vector: true,
    magMap: [0,8,0,25],
    modifiers: {
        jetstreamDeltaX: 10,
        jetstreamHalfDecay: 40,
        jetstreamOverpowerBase: 0.7,
        jetstreamInwardAngle: Math.PI/4,
        troughBase: 1.7,
        troughExponentMin: -5,
        troughExponentMax: 3,
        troughAngle: -Math.PI/16,
        hadleyUpperBound: 5,
        hadleyLowerBound: 1.5,
        hadleyAngleMin: -Math.PI/16,
        hadleyAngleMax: -15*Math.PI/16,
        noiseBase: 1.5,
        noiseExponentMin: -8,
        noiseExponentMax: 4
    },
    noiseChannels: [
        [4,0.5,180,300,1,2],
        [4,0.5,90,100,1,3]
    ]
};
ENV_DEFS[SIM_MODE_NORMAL].ULSteering = {};
ENV_DEFS[SIM_MODE_HYPER].ULSteering = {
    modifiers: {
        hadleyUpperBound: 3
    }
};
ENV_DEFS[SIM_MODE_WILD].ULSteering = {
    mapFunc: (u,x,y,z)=>{
        u.vec.set(1);                                                                   // reset vector

        const dx = 10;                                                                  // delta-x for jetstream differential (used for calculating wind direction in and near jetstream)

        let m = u.noise(1);

        let s = u.yearfrac(z);
        let j0 = u.field('jetstream');                                                  // y-position of jetstream
        let j1 = u.field('jetstream',x+dx);                                             // y-position of jetstream dx to the east for differential
        let j = abs(y-j0);                                                              // distance of point north/south of jetstream
        let jet = pow(2,3-j/30);                                                        // power of jetstream at point
        let jOP = pow(0.7,jet);                                                         // factor for how strong other variables should be if 'overpowered' by jetstream
        let jAngle = atan((j1-j0)/dx)+map(y-j0,-50,50,PI/15,-PI/17,true);               // angle of jetstream at point
        // power of winds equatorward of jetstream
        let hadley = (u.piecewise(s,[[1,4.5],[2.5,1.2],[4,0.5],[4.5,1.7],[5,0.6],[6.5,0.65],[7.5,0.65],[7.75,0.05],[8,1.3],[9,1.7],[10,2.3],[11.5,4.5]]))*jOP*(y>j0?1:0);
        // angle of winds equatorward of jetstream
        let hAngle = u.piecewise(s,[[1,11*PI/8],[2.5,9*PI/8],[4,17*PI/16],[4.5,11*PI/8],[5,17*PI/16],[6.5,35*PI/32],[7.5,17*PI/16],[8,31*PI/16],[9,15*PI/8],[10,7*PI/4],[10.5,11*PI/8]]);
        let ferrel = 2*jOP*(y<j0?map(j0-y,0,400,1,0,true):0);                           // power of winds poleward of jetstream
        let fAngle = 5*PI/8;                                                            // angle of winds poleward of jetstream

        let a = map(u.noise(0),0,1,0,4*TAU);                                            // noise angle
        m = pow(u.modifiers.noiseBase, map(m, 0, 1, u.modifiers.noiseExponentMin, u.modifiers.noiseExponentMax))*jOP; // noise magnitude

        // apply noise
        u.vec.rotate(a);
        u.vec.mult(m);

        // apply UL winds
        u.vec.add(jet*cos(jAngle),jet*sin(jAngle));                                     // apply jetstream
        u.vec.add(hadley*cos(hAngle),hadley*sin(hAngle));                               // apply winds equatorward of jetstream
        u.vec.add(ferrel*cos(fAngle),ferrel*sin(fAngle));                               // apply winds poleward of jetstream

        return u.vec;
    },
    modifiers: {
        noiseExponentMin: -3,
        noiseExponentMax: 4
    }
};
ENV_DEFS[SIM_MODE_MEGABLOBS].ULSteering = {};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].ULSteering = {};
ENV_DEFS[SIM_MODE_SPOOKY].ULSteering = {};

// -- shear -- //

ENV_DEFS.defaults.shear = {
    displayName: 'Wind shear',
    version: 0,
    mapFunc: (u,x,y,z)=>{
        let ll = u.field('LLSteering');
        let ul = u.field('ULSteering');
        u.vec.set(ul);
        u.vec.sub(ll);
        u.vec.mult(u.modifiers.strength);
        return u.vec;
    },
    displayFormat: v=>{
        let speed = round(v.mag()*100)/100;
        let direction = v.heading();
        // speed is still in "u/hr" (coordinate units per hour) for now
        return speed + ' u/hr ' + compassHeading(direction);
    },
    vector: true,
    noVectorFlip: true,
    magMap: [0,8,0,25],
    modifiers: {
        strength: 1
    },
    hueMap: (v)=>{
        colorMode(HSB);
        let strong = color(0,100,80);
        let moderate = color(60,100,90);
        let weak = color(120,100,80);
        let c;
        if(v < 2)
            c = lerpColor(weak, moderate, map(v,0.5,2,0,1));
        else
            c = lerpColor(moderate, strong, map(v,2,3.5,0,1));
        colorMode(RGB);
        return c;
    }
};
ENV_DEFS[SIM_MODE_NORMAL].shear = {};
ENV_DEFS[SIM_MODE_HYPER].shear = {};
ENV_DEFS[SIM_MODE_WILD].shear = {};
ENV_DEFS[SIM_MODE_MEGABLOBS].shear = {
    modifiers: {
        strength: 0.75
    }
};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].shear = {};
ENV_DEFS[SIM_MODE_SPOOKY].shear = {};

// -- SSTAnomaly -- //

ENV_DEFS.defaults.SSTAnomaly = {
    displayName: 'Sea surface temp. anomaly',
    version: 0,
    mapFunc: (u,x,y,z)=>{
        let v = u.noise(0);
        v = v*2;
        let i = v<1 ? -1 : 1;
        v = 1-abs(1-v);
        if(v===0) v = 0.000001;
        v = log(v);
        let r;
        if(u.modifiers.r!==undefined) r = u.modifiers.r;
        else r = map(y,0,HEIGHT,6,3);
        v = -r*v;
        v = v*i;
        if(u.modifiers.bigBlobBase!==undefined && v>u.modifiers.bigBlobExponentThreshold) v += pow(u.modifiers.bigBlobBase,v-u.modifiers.bigBlobExponentThreshold)-1;
        return v;
    },
    displayFormat: v=>{
        let str = '';
        if(v >= 0)
            str += '+';
        str += round(v*10)/10;
        str += '\u2103'; // degrees celsius sign
        return str;
    },
    hueMap: (v)=>{
        colorMode(HSB);
        let cold = color(240,100,70);
        let hot = color(0,100,70);
        let cNeutral = color(240,1,90);
        let hNeutral = color(0,1,90);
        let c;
        if(v<0) c = lerpColor(cold,cNeutral,map(v,-5,0,0,1));
        else c = lerpColor(hNeutral,hot,map(v,0,5,0,1));
        colorMode(RGB);
        return c;
    },
    oceanic: true,
    noiseChannels: [
        [6,0.5,150,3000,0.05,1.5]
    ]
};
ENV_DEFS[SIM_MODE_NORMAL].SSTAnomaly = {};
ENV_DEFS[SIM_MODE_HYPER].SSTAnomaly = {};
ENV_DEFS[SIM_MODE_WILD].SSTAnomaly = {
    modifiers: {
        r: 5,
        bigBlobBase: 1.4,
        bigBlobExponentThreshold: 1.5
    }
};
ENV_DEFS[SIM_MODE_MEGABLOBS].SSTAnomaly = {
    modifiers: {
        r: 7,
        bigBlobBase: 1.8,
        bigBlobExponentThreshold: 1
    }
};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].SSTAnomaly = {};
ENV_DEFS[SIM_MODE_SPOOKY].SSTAnomaly = {};

// -- SST -- //

ENV_DEFS.defaults.SST = {
    displayName: 'Sea surface temperature',
    version: 0,
    mapFunc: (u,x,y,z)=>{
        if(y<0) return 0;
        let anom = u.field('SSTAnomaly');
        let s = seasonCurve(z);
        let seasonalActivity = map(s,-1,1,0,1);
        let w = map(cos(map(x,0,WIDTH,0,PI)),-1,1,0,1);
        let h0 = y/HEIGHT;
        let h1 = (sqrt(h0)+h0)/2;
        let h2 = sqrt(sqrt(h0));
        let h = map(cos(lerp(PI,0,lerp(h1,h2,sq(w)))),-1,1,0,1);
        let ospt = u.modifiers.offSeasonPolarTemp;
        let pspt = u.modifiers.peakSeasonPolarTemp;
        let ostt = u.modifiers.offSeasonTropicsTemp;
        let pstt = u.modifiers.peakSeasonTropicsTemp;
        let polarTemp = map(s,-1,1,ospt,pspt);
        let tropicalTemp = lerp(ostt,pstt,seasonalActivity);
        let t = lerp(polarTemp,tropicalTemp,h);
        return t+anom;
    },
    displayFormat: v=>{
        let str = '';
        str += round(v*10)/10;
        str += '\u2103'; // degrees celsius sign
        return str;
    },
    hueMap: (v)=>{
        colorMode(HSB);
        let c;
        if(v<10) c = lerpColor(color(240,1,100),color(240,100,70),map(v,0,10,0,1));
        else if(v<20) c = lerpColor(color(240,100,70),color(180,50,90),map(v,10,20,0,1));
        else if(v<26) c = lerpColor(color(180,50,90),color(120,100,65),map(v,20,26,0,1));
        else if(v<29) c = lerpColor(color(60,100,100),color(0,100,70),map(v,26,29,0,1));
        else if(v<34) c = lerpColor(color(359,100,70),color(300,5,100),map(v,29,34,0,1));
        else if(v<40) c = lerpColor(color(300,5,100),color(150,10,90),map(v,34,40,0,1));
        else if(v<50) c = lerpColor(color(150,10,90),color(150,60,75),map(v,40,50,0,1));
        else if(v<75) c = lerpColor(color(30,90,90),color(30,30,90),map(v,50,75,0,1));
        else if(v<150) c = lerpColor(color(0,0,35),color(0,0,95),map(v,75,150,0,1));
        else c = lerpColor(color(0,0,25),color(0,0,95),map(v%150,0,150,0,1));
        colorMode(RGB);
        return c;
    },
    oceanic: true,
    modifiers: {
        offSeasonPolarTemp: -3,
        peakSeasonPolarTemp: 10,
        // Deep-tropical warm pools remain capable of supporting rare winter
        // systems; seasonality should mostly control frequency, not impose a
        // basin-wide thermodynamic shutdown.
        offSeasonTropicsTemp: 27,
        peakSeasonTropicsTemp: 29
    }
};
ENV_DEFS[SIM_MODE_NORMAL].SST = {};
ENV_DEFS[SIM_MODE_HYPER].SST = {
    modifiers: {
        offSeasonPolarTemp: 5,
        peakSeasonPolarTemp: 20,
        offSeasonTropicsTemp: 31,
        peakSeasonTropicsTemp: 35
    }
};
ENV_DEFS[SIM_MODE_WILD].SST = {
    mapFunc: (u,x,y,z)=>{
        if(y<0) return 0;
        let anom = u.field('SSTAnomaly');
        let s = u.yearfrac(z);
        let t = u.piecewise(s,[[0,22],[2,25.5],[4,25],[5,26.5],[6,27],[6.25,30],[6.75,31],[7,28],[9,27],[10,26],[11,23]]);
        return t+anom;
    }
};
ENV_DEFS[SIM_MODE_MEGABLOBS].SST = {
    modifiers: {
        offSeasonPolarTemp: -3,
        peakSeasonPolarTemp: 22,
        offSeasonTropicsTemp: 25,
        peakSeasonTropicsTemp: 30.5
    }
};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].SST = {
    version:1,
    modifiers: {
        offSeasonPolarTemp: 20,
        peakSeasonPolarTemp: 22,
        offSeasonTropicsTemp: 26,
        peakSeasonTropicsTemp: 28
    }
};
ENV_DEFS[SIM_MODE_SPOOKY].SST = {};

// -- moisture -- //

ENV_DEFS.defaults.moisture = {
    displayName: 'Relative humidity',
    version: 0,
    mapFunc: (u,x,y,z)=>{
        let v = u.noise(0);
        let s = seasonCurve(z);
        let seasonalActivity = map(s,-1,1,0,1);
        let l = land.get(Coordinate.convertFromXY(u.basin.mapType, x, u.basin.hemY(y)));
        let pm = u.modifiers.polarMoisture;
        let tm = u.modifiers.tropicalMoisture;
        let mm = u.modifiers.mountainMoisture;
        let m = map(l,0.5,0.7,map(y,0,HEIGHT,pm,tm),mm,true);
        // Preserve the wet-season maximum while avoiding an unrealistically
        // dry, uniformly hostile deep tropics at the seasonal minimum.
        m += lerp(-0.04,0.08,seasonalActivity);
        m += map(v,0,1,-0.3,0.3);
        m = constrain(m,0,1);
        return m;
    },
    displayFormat: v=>{
        return round(v*1000)/10 + '%';
    },
    hueMap: v=>{
        colorMode(HSB);
        let c;
        if(v<0.5) c = lerpColor(color(45,100,30),color(45,1,90),map(v,0,0.5,0,1));
        else c = lerpColor(color(180,1,90),color(180,100,30),map(v,0.5,1,0,1));
        colorMode(RGB);
        return c;
    },
    modifiers: {
        polarMoisture: 0.43,
        tropicalMoisture: 0.57,
        mountainMoisture: 0.2
    },
    noiseChannels: [
        [4,0.5,120,120,0.3,2]
    ]
};
ENV_DEFS[SIM_MODE_NORMAL].moisture = {};
ENV_DEFS[SIM_MODE_HYPER].moisture = {
    modifiers: {
        polarMoisture: 0.52,
        tropicalMoisture: 0.62,
        mountainMoisture: 0.3
    }
};
ENV_DEFS[SIM_MODE_WILD].moisture = {
    mapFunc: (u,x,y,z)=>{
        let v = u.noise(0);
        let s = u.yearfrac(z);
        let l = land.get(Coordinate.convertFromXY(u.basin.mapType, x, u.basin.hemY(y)));
        let om = u.piecewise(s,[
            [0.5,0.35],[2,0.55],[4,0.6],[5.75,0.58],[6,0.1],[7,0.2],[7.25,0.6],[8.5,0.72],[10,0.55],[11.5,0.35]
        ]);
        let mm = u.modifiers.mountainMoisture;
        let m = map(l,0.5,0.7,om,mm,true);
        m += map(v,0,1,-0.3,0.3);
        m = constrain(m,0,1);
        return m;
    }
};
ENV_DEFS[SIM_MODE_MEGABLOBS].moisture = {};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].moisture = {};
ENV_DEFS[SIM_MODE_SPOOKY].moisture = {};

// -- surface wind field -- //

ENV_DEFS.defaults.surfaceWind = {
    displayName: 'Surface wind field',
    version: 0,
    mapFunc: (u,x,y,z)=>u.basin.env.getSurfaceWind(x,y,z,u.vec),
    displayFormat: v=>displayWindspeed(round(v.mag()),1) + ' ' + compassHeading(v.heading()),
    vector: true,
    vectorColorFill: true,
    fillResolution: 6,
    fillAlpha: 220,
    noWobble: true,
    hueMap: v=>{
        colorMode(RGB);
        let stops = [
            [0,64,132,190],
            [18,76,176,190],
            [34,112,202,157],
            [50,201,218,126],
            [64,240,202,105],
            [85,218,116,92],
            [110,167,55,111],
            [145,75,30,105]
        ];
        for(let i=1;i<stops.length;i++){
            if(v<=stops[i][0]){
                let lower = stops[i-1];
                let upper = stops[i];
                return lerpColor(
                    color(lower[1],lower[2],lower[3]),
                    color(upper[1],upper[2],upper[3]),
                    map(v,lower[0],upper[0],0,1,true)
                );
            }
        }
        let last = stops[stops.length-1];
        return color(last[1],last[2],last[3]);
    }
};
ENV_DEFS[SIM_MODE_NORMAL].surfaceWind = {};
ENV_DEFS[SIM_MODE_HYPER].surfaceWind = {};
ENV_DEFS[SIM_MODE_WILD].surfaceWind = {};
ENV_DEFS[SIM_MODE_MEGABLOBS].surfaceWind = {};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].surfaceWind = {};
ENV_DEFS[SIM_MODE_SPOOKY].surfaceWind = {};

// -- mean sea-level pressure / isobars -- //

ENV_DEFS.defaults.pressure = {
    displayName: 'Mean sea-level pressure',
    version: 0,
    mapFunc: (u,x,y,z)=>u.basin.env.getPressure(x,y,z),
    displayFormat: v=>round(v*10)/10 + ' hPa',
    hueMap: [960,1040,240,0],
    contourInterval: ISOBAR_INTERVAL,
    contourGridSize: ISOBAR_GRID_SIZE,
    contourLabelInterval: ISOBAR_LABEL_INTERVAL,
    noWobble: true
};
ENV_DEFS[SIM_MODE_NORMAL].pressure = {};
ENV_DEFS[SIM_MODE_HYPER].pressure = {};
ENV_DEFS[SIM_MODE_WILD].pressure = {};
ENV_DEFS[SIM_MODE_MEGABLOBS].pressure = {};
ENV_DEFS[SIM_MODE_EXPERIMENTAL].pressure = {};
ENV_DEFS[SIM_MODE_SPOOKY].pressure = {};

// ---- Active Storm System Algorithm ---- //

const STORM_ALGORITHM = {};

STORM_ALGORITHM.defaults = {};
STORM_ALGORITHM[SIM_MODE_NORMAL] = {};
STORM_ALGORITHM[SIM_MODE_HYPER] = {};
STORM_ALGORITHM[SIM_MODE_WILD] = {};
STORM_ALGORITHM[SIM_MODE_MEGABLOBS] = {};
STORM_ALGORITHM[SIM_MODE_EXPERIMENTAL] = {};
STORM_ALGORITHM[SIM_MODE_SPOOKY] = {};

// -- Interaction -- //

STORM_ALGORITHM.defaults.interactionInit = {
    fuji: true,
    shear: false,
    kill: false
};

STORM_ALGORITHM.defaults.interaction = function(sys0, sys1){
    let interactionData = {};

    let v = createVector();
    v.set(sys0.pos);
    v.sub(sys1.pos);
    let m = v.mag();
    let r = map(sys1.lowerWarmCore,0,1,150,50);
    if(sys1.type===MONSOON) r *= 1.45;
    if(m<r && m>0){
        v.rotate(sys0.basin.hem(-TAU/4+((3/m)*TAU/16)));
        v.setMag(map(m,r,0,0,map(constrain(sys1.pressure,990,1030),1030,990,0.2,2.2)));
        interactionData.fuji = v;
        interactionData.shear = map(m,r,0,0,map(sys1.pressure,1030,900,0,6));
        // Two broad cold-core lows cannot retain separate closed centers at the
        // compact spacing tolerated by tropical vortices. Coalesce the weaker
        // center before the pair settles into an unrealistically tight orbit.
        let broadCenterMerge = sys0.type===EXTROP && sys1.type===EXTROP ?
            StormData.minimumCenterSeparation(sys0,sys1) : 0;
        if((m < broadCenterMerge || m < map(sys0.pressure,1030,1000,r/5,r/15) || m<5) && sys0.pressure > sys1.pressure)
            interactionData.kill = 1;
    }

    return interactionData;
};

// -- Steering -- //

STORM_ALGORITHM.defaults.steering = function(sys,vec,u){
    let ll = u.f("LLSteering");
    let ul = u.f("ULSteering");
    let d = sqrt(sys.depth);
    let x = lerp(ll.x,ul.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
    let y = lerp(ll.y,ul.y,d);
    vec.set(x,y);
    if(sys.type===MONSOON) vec.mult(0.65);
    vec.add(sys.interaction.fuji);
};

// -- Core -- //

function targetRadiusOfMaxWind(sys,shear,lnd){
    return StormData.circulationSizeToRadius(sys.circulationSize,sys.type);
}

function updateWindFieldStructure(sys,shear,lnd){
    if(!Number.isFinite(sys.radiusOfMaxWind))
        sys.radiusOfMaxWind = StormData.estimateRadiusOfMaxWind(sys.pressure,sys.windSpeed,sys.type);
    if(!Number.isFinite(sys.circulationSize))
        sys.circulationSize = StormData.radiusToCirculationSize(sys.radiusOfMaxWind,sys.type);

    let targetRadius = targetRadiusOfMaxWind(sys,shear,lnd);

    let adjustmentRate = sys.type===MONSOON ? 0.0015 : tropOrSub(sys.type) ? 0.004 : 0.01;
    if(sys.kaboom===2 && tropOrSub(sys.type) && sys.type!==MONSOON && sys.radiusOfMaxWind>targetRadius){
        // Rapid intensification is accompanied by inner-core contraction. Scale
        // the response with the structural gap so compact and broad cyclones do
        // not collapse toward one hard-coded pressure/wind pair.
        let contractionGap = sys.radiusOfMaxWind-targetRadius;
        adjustmentRate = max(adjustmentRate,map(contractionGap,0,45,adjustmentRate,0.24,true));
    }
    sys.radiusOfMaxWind = StormData.constrainRadiusOfMaxWind(
        lerp(sys.radiusOfMaxWind,targetRadius,adjustmentRate)+random(-0.035,0.035),
        sys.type
    );
}

function circulationIntensificationRate(sys){
    let level = StormData.constrainCirculationSize(sys.circulationSize);
    return [1.6,1.3,1,0.75,0.55][level-1];
}

function circulationEnvironmentalSensitivity(sys){
    let level = StormData.constrainCirculationSize(sys.circulationSize);
    return [1.45,1.2,1,0.85,0.7][level-1];
}

function windPressureSizeFactors(sys){
    if(sys.type===MONSOON){
        let radius = constrain(sys.radiusOfMaxWind,45,110);
        return {
            pressure: map(radius,45,110,1.08,1.35),
            wind: map(radius,45,110,0.86,0.65)
        };
    }
    if(sys.type===EXTROP){
        let radius = constrain(sys.radiusOfMaxWind,25,140);
        return {
            pressure: map(radius,25,140,0.96,1.3),
            wind: map(radius,25,140,0.96,0.72)
        };
    }
    let radius = constrain(sys.radiusOfMaxWind,8,70);
    return {
        pressure: map(radius,8,70,0.82,1.22),
        wind: map(radius,8,70,1.18,0.82)
    };
}

function extratropicalDevelopmentPotential(jetOffset,moisture,shear,lnd){
    // Mid-latitude cyclones feed on the baroclinic zone near the jet. Strong
    // vertical shear is therefore supportive here (the opposite of a TC),
    // while moisture and an ocean surface make explosive deepening likelier.
    let jetSupport = map(abs(jetOffset),105,8,0,1,true);
    let baroclinicity = map(shear,1.2,7,0,1,true);
    let moistureSupport = map(moisture,0.2,0.75,0.62,1,true);
    let surfaceSupport = lnd ? map(lnd,0.15,0.9,0.9,0.18,true) : 1;
    return constrain(jetSupport*(0.42+0.58*baroclinicity)*moistureSupport*surfaceSupport,0,1);
}

function troughOutflowPotential(sys,jetOffset,moisture,shear,SST,lnd){
    // A tropical cyclone just equatorward and downstream (east) of a trough can
    // tap the accelerating upper-level flow as an outflow channel. Diagnose the
    // geometry from the jet axis rather than treating proximity to the jet alone
    // as favourable; the latter would incorrectly reward storms beneath the jet
    // core or behind the trough, where shear is normally destructive.
    // Exceptional ventilation can support short-lived intensification over
    // marginal 24-26 C water, though colder water still closes the pathway.
    if(lnd || jetOffset<15 || jetOffset>155 || SST<23.5) return 0;

    let env = sys.basin.env;
    let x = sys.pos.x;
    let y = sys.pos.y;
    let z = sys.basin.tick;
    const sampleDistance = 32;
    let jetWest = env.get("jetstream",x-sampleDistance,y,z);
    let jetEast = env.get("jetstream",x+sampleDistance,y,z);
    // Screen-space y increases equatorward. A poleward-sloping jet to the east
    // therefore has jetWest > jetEast and places the cyclone ahead of the trough.
    let downstreamSlope = (jetWest-jetEast)/(2*sampleDistance);
    let troughFront = map(downstreamSlope,0.035,0.38,0,1,true);
    if(troughFront<=0) return 0;

    // Sample the upper flow around the center. EnvField reuses its vector, so
    // copy components immediately before requesting the next point.
    let ulWest = env.get("ULSteering",x-sampleDistance,y,z);
    let westX = ulWest.x;
    let ulEast = env.get("ULSteering",x+sampleDistance,y,z);
    let eastX = ulEast.x;
    let ulPoleward = env.get("ULSteering",x,y-sampleDistance,z);
    let polewardY = ulPoleward.y;
    let ulEquatorward = env.get("ULSteering",x,y+sampleDistance,z);
    let equatorwardY = ulEquatorward.y;
    let divergence = ((eastX-westX)+(equatorwardY-polewardY))/(2*sampleDistance);

    let outflowDivergence = map(divergence,-0.008,0.045,0.3,1,true);
    let distanceWindow = map(jetOffset,15,42,0,1,true)*map(jetOffset,155,82,0,1,true);
    // Moderate shear can ventilate an established core; excessive shear still
    // decouples it and shuts the process down.
    let shearWindow = map(shear,0.45,1.6,0.45,1,true)*map(shear,5.6,3.3,0,1,true);
    let thermodynamics = map(SST,23.5,29,0.18,1,true)*map(moisture,0.38,0.72,0.25,1,true);
    return constrain(troughFront*outflowDivergence*distanceWindow*shearWindow*thermodynamics,0,1);
}

function pressureWindTarget(sys,sizeFactors){
    if(tropOrSub(sys.type) && sys.type!==MONSOON){
        // Invert the Knaff-Zehr (2007) pressure-wind relationship. Size and
        // latitude remain continuous sources of real storm-to-storm scatter;
        // unlike the former independent multipliers, they cannot make pressure
        // and maximum wind evolve on incompatible curves.
        let latitude = Math.abs(sys.coord().latitude);
        let sizeParameter = sizeFactors.pressure;
        let pressureY = sys.basin.hemY(sys.pos.y);
        let environmentalPressure = sys.basin.env.backgroundPressure(
            sys.pos.x,pressureY,sys.basin.tick
        );
        let zeroWindPressure = environmentalPressure+23.286-12.587*sizeParameter-0.483*latitude;
        let pressureDeficit = max(0,zeroWindPressure-sys.pressure);
        let quadraticCoefficient = 1/sq(24.254);
        let stormRelativeWind = (
            -0.483+sqrt(sq(0.483)+4*quadraticCoefficient*pressureDeficit)
        )/(2*quadraticCoefficient);
        let thermalEfficiency = map(sys.lowerWarmCore,0.5,1,0.72,1,true);
        return max(1,stormRelativeWind*thermalEfficiency);
    }
    // Cold-core cyclones can convert a deep pressure gradient into stronger
    // surface winds than the old 0.6 multiplier allowed.
    let thermalEfficiency = map(sys.lowerWarmCore,0,1,sys.type===EXTROP ? 0.78 : 0.68,1,true);
    return max(1,map(sys.pressure,1030,900,1,160)*thermalEfficiency*sizeFactors.wind);
}

STORM_ALGORITHM.defaults.core = function(sys,u){
    let SST = u.f("SST");
    let jet = u.f("jetstream");
    jet = sys.basin.hemY(sys.pos.y)-jet;
    let lnd = u.land();
    let moisture = u.f("moisture");
    let shear = u.f("shear").mag()+sys.interaction.shear;
    let isMonsoon = sys.type===MONSOON;
    let previousOrganization = sys.organization;
    let previousLowerWarmCore = sys.lowerWarmCore;
    let previousUpperWarmCore = sys.upperWarmCore;
    let environmentalSensitivity = circulationEnvironmentalSensitivity(sys);
    
    let targetWarmCore = (lnd ?
        sys.lowerWarmCore :
        max(pow(map(SST,10,25,0,1,true),3),sys.lowerWarmCore)
    )*map(jet,0,75,sq(1-sys.depth),1,true);
    sys.lowerWarmCore = lerp(sys.lowerWarmCore,targetWarmCore,sys.lowerWarmCore>targetWarmCore ? map(jet,0,75,0.4,0.06,true) : 0.04);
    sys.upperWarmCore = lerp(sys.upperWarmCore,sys.lowerWarmCore,sys.lowerWarmCore>sys.upperWarmCore ? 0.05 : 0.4);
    sys.lowerWarmCore = constrain(sys.lowerWarmCore,0,1);
    sys.upperWarmCore = constrain(sys.upperWarmCore,0,1);
    sys.lowerWarmCore = constrain(previousLowerWarmCore+(sys.lowerWarmCore-previousLowerWarmCore)*environmentalSensitivity,0,1);
    sys.upperWarmCore = constrain(previousUpperWarmCore+(sys.upperWarmCore-previousUpperWarmCore)*environmentalSensitivity,0,1);
    let tropicalness = constrain(map(sys.lowerWarmCore,0.5,1,0,1),0,sys.upperWarmCore);
    let nontropicalness = constrain(map(sys.lowerWarmCore,0.75,0,0,1),0,1);
    let extratropicalPotential = extratropicalDevelopmentPotential(jet,moisture,shear,lnd);
    let troughOutflow = troughOutflowPotential(sys,jet,moisture,shear,SST,lnd)*
        tropicalness*map(previousOrganization,0.42,0.82,0,1,true);
    let effectiveTropicalShear = shear*lerp(1,0.55,troughOutflow);

    let organizationBeforeEnvironment = sys.organization*100;
    sys.organization *= 100;
    if(!lnd) sys.organization += sq(map(SST,20,29,0,1,true))*3*tropicalness;
    if(!lnd && sys.organization<40) sys.organization += lerp(0,3,nontropicalness);
    // if(lnd) sys.organization -= pow(10,map(lnd,0.5,1,-3,1));
    // if(lnd && sys.organization<70 && moisture>0.3) sys.organization += pow(5,map(moisture,0.3,0.5,-1,1,true))*tropicalness;
    sys.organization -= pow(2,4-((HEIGHT-sys.basin.hemY(sys.pos.y))/(HEIGHT*0.01)));
    sys.organization -= (pow(map(sys.depth,0,1,1.17,1.31),effectiveTropicalShear)-1)*map(sys.depth,0,1,4.7,1.2);
    sys.organization -= map(moisture,0,0.65,3,0,true)*effectiveTropicalShear;
    sys.organization += sq(map(moisture,0.6,1,0,1,true))*4;
    sys.organization += 2.4*troughOutflow;
    sys.organization -= pow(1.3,20-SST)*tropicalness;
    sys.organization = constrain(
        organizationBeforeEnvironment+(sys.organization-organizationBeforeEnvironment)*environmentalSensitivity,
        0,100
    )/100;
    if(isMonsoon && sys.organization>previousOrganization)
        sys.organization = lerp(previousOrganization,sys.organization,0.25);

    updateWindFieldStructure(sys,shear,lnd);
    let sizeFactors = windPressureSizeFactors(sys);
    // Preserve the normal 25-30 C intensity curve, then let exceptionally warm
    // water keep adding potential without another upper clamp. The logarithmic
    // pressure response below supplies diminishing returns while still allowing
    // arbitrarily high SSTs to produce arbitrarily intense storms.
    let normalThermalPotential = lnd ? 0 :
        map(SST,25,30,0,1,true)+max(0,map(SST,30,36,0,0.55));
    // Below 25 C, only an exceptionally efficient trough outflow channel can
    // unlock part of the otherwise unavailable pressure-fall potential. Keep
    // this capped so marginal water cannot imitate a deep warm pool.
    let marginalOutflowPotential = lnd ? 0 : min(
        0.45,
        map(SST,23.5,26,0,1,true)*troughOutflow*2.25
    );
    let thermalPotential = max(normalThermalPotential,marginalOutflowPotential);
    let targetPressure = 1010-25*log(1+thermalPotential)/log(1.17);
    targetPressure = lerp(1010,targetPressure,pow(sys.organization,3));
    targetPressure = 1010-(1010-targetPressure)*sizeFactors.pressure;
    let pressureRate = (sys.pressure>targetPressure?0.05:0.08)*tropicalness;
    if(sys.pressure>targetPressure) pressureRate *= circulationIntensificationRate(sys);
    else pressureRate *= environmentalSensitivity;
    if(sys.pressure>targetPressure) pressureRate *= 1+2.2*troughOutflow;
    if(isMonsoon && sys.pressure>targetPressure) pressureRate *= 0.25;
    sys.pressure = lerp(sys.pressure,targetPressure,pressureRate);
    let pressureNoiseFactor = isMonsoon ? 0.35 : 1;
    let extratropicalTarget = 1014-58*pow(extratropicalPotential,1.35);
    let extratropicalRate = map(extratropicalPotential,0.25,1,0.002,0.034,true)*nontropicalness;
    if(sys.pressure>extratropicalTarget) extratropicalRate *= circulationIntensificationRate(sys);
    else extratropicalRate *= environmentalSensitivity;
    sys.pressure = lerp(sys.pressure,extratropicalTarget,extratropicalRate);
    if(sys.pressure>targetPressure && sys.organization>0.62)
        sys.pressure -= 0.32*pow(troughOutflow,1.35);
    if(extratropicalPotential>0.86 && !lnd)
        sys.pressure -= map(extratropicalPotential,0.86,1,0,0.5,true)*nontropicalness;
    sys.pressure += random(-0.65,0.85)*(1-extratropicalPotential)*nontropicalness*pressureNoiseFactor;
    if(sys.organization<0.3) sys.pressure += random(-2,2.5)*tropicalness*pressureNoiseFactor;
    sys.pressure += 0.5*sys.interaction.shear/(1+map(sys.lowerWarmCore,0,1,4,0));
    sys.pressure += map(jet,0,75,5*pow(1-sys.depth,4),0,true);

    let targetWind = pressureWindTarget(sys,sizeFactors);
    if(isMonsoon) targetWind = min(65,targetWind);
    let windRate = isMonsoon && targetWind>sys.windSpeed ? 0.04 : 0.15;
    if(targetWind>sys.windSpeed) windRate *= circulationIntensificationRate(sys);
    else windRate *= environmentalSensitivity;
    sys.windSpeed = lerp(sys.windSpeed,targetWind,windRate);

    let targetDepth = map(
        sys.upperWarmCore,
        0,1,
        1,map(
            sys.organization,
            0,1,
            sys.depth*pow(0.95,shear),max(map(sys.pressure,1010,950,0,0.7,true),sys.depth)
        )
    );
    sys.depth = lerp(sys.depth,targetDepth,0.05);

    if(sys.pressure > 1030 || sys.interaction.kill > 0)
        sys.kill = true;
};

STORM_ALGORITHM[SIM_MODE_EXPERIMENTAL].core = function(sys,u){
    let SST = u.f("SST");
    let jet = u.f("jetstream");
    jet = sys.basin.hemY(sys.pos.y)-jet;
    let lnd = u.land();
    let moisture = u.f("moisture");
    let shear = u.f("shear").mag()+sys.interaction.shear;
    let isMonsoon = sys.type===MONSOON;
    let previousOrganization = sys.organization;
    let previousLowerWarmCore = sys.lowerWarmCore;
    let previousUpperWarmCore = sys.upperWarmCore;
    let environmentalSensitivity = circulationEnvironmentalSensitivity(sys);
    
    sys.lowerWarmCore = lerp(sys.lowerWarmCore,0,map(jet,0,75,0.07,0));
    sys.lowerWarmCore = lerp(sys.lowerWarmCore,1,map(jet,50,100,0,map(SST,16,26,0,0.13,true),true));
    if(sys.upperWarmCore > sys.lowerWarmCore)
        sys.upperWarmCore = sys.lowerWarmCore;
    else
        sys.upperWarmCore = lerp(sys.upperWarmCore,sys.lowerWarmCore,0.015);
    sys.lowerWarmCore = constrain(sys.lowerWarmCore,0,1);
    sys.upperWarmCore = constrain(sys.upperWarmCore,0,1);
    sys.lowerWarmCore = constrain(previousLowerWarmCore+(sys.lowerWarmCore-previousLowerWarmCore)*environmentalSensitivity,0,1);
    sys.upperWarmCore = constrain(previousUpperWarmCore+(sys.upperWarmCore-previousUpperWarmCore)*environmentalSensitivity,0,1);
    let tropicalness = (sys.lowerWarmCore+sys.upperWarmCore)/2;
    let extratropicalness = 1-tropicalness;
    let extratropicalPotential = extratropicalDevelopmentPotential(jet,moisture,shear,lnd);
    let troughOutflow = troughOutflowPotential(sys,jet,moisture,shear,SST,lnd)*
        tropicalness*map(previousOrganization,0.42,0.82,0,1,true);
    let effectiveTropicalShear = shear*lerp(1,0.55,troughOutflow);

    if(!lnd)
        sys.organization = lerp(sys.organization,1,sq(tropicalness)*map(SST,21,31,0,0.05,true));
    sys.organization = lerp(sys.organization,0,pow(3,effectiveTropicalShear*(1-moisture)*2.3)*0.0005);
    sys.organization = lerp(sys.organization,1,0.018*troughOutflow);
    if(lnd>0.7)
        sys.organization = lerp(sys.organization,0,0.03);
    sys.organization = constrain(
        previousOrganization+(sys.organization-previousOrganization)*environmentalSensitivity,
        0,1
    );
    if(isMonsoon && sys.organization>previousOrganization)
        sys.organization = lerp(previousOrganization,sys.organization,0.25);

    updateWindFieldStructure(sys,shear,lnd);
    let sizeFactors = windPressureSizeFactors(sys);
    let hardCeiling = map(SST,21,31,1015,880);
    if(lnd)
        hardCeiling = 990;
    let softCeiling = map(sys.organization,0.93,0.98,lerp(1020,hardCeiling,0.7),hardCeiling,true);
    softCeiling = 1010-(1010-softCeiling)*sizeFactors.pressure;
    sys.pressure = lerp(sys.pressure,1032,0.006);
    let extratropicalTarget = 1014-68*pow(extratropicalPotential,1.3);
    let extratropicalRate = map(extratropicalPotential,0.2,1,0.003,0.04,true)*extratropicalness;
    if(sys.pressure>extratropicalTarget) extratropicalRate *= circulationIntensificationRate(sys);
    else extratropicalRate *= environmentalSensitivity;
    sys.pressure = lerp(sys.pressure,extratropicalTarget,extratropicalRate);
    if(extratropicalPotential>0.84 && !lnd)
        sys.pressure -= map(extratropicalPotential,0.84,1,0,0.65,true)*extratropicalness;
    let tropicalPressureRate = tropicalness*sys.organization*0.03*(isMonsoon ? 0.25 : 1);
    if(sys.pressure>softCeiling) tropicalPressureRate *= circulationIntensificationRate(sys);
    else tropicalPressureRate *= environmentalSensitivity;
    if(sys.pressure>softCeiling) tropicalPressureRate *= 1+2.2*troughOutflow;
    sys.pressure = lerp(sys.pressure,softCeiling,tropicalPressureRate);
    if(sys.pressure>softCeiling && sys.organization>0.62)
        sys.pressure -= 0.32*pow(troughOutflow,1.35);
    if(sys.pressure<1000)
        sys.pressure = lerp(sys.pressure,1000,min(1,tropicalness*(1-sys.organization)*0.01*environmentalSensitivity));
    sys.pressure = lerp(sys.pressure,1040,map(sys.pos.y,HEIGHT*0.97,HEIGHT,0,0.15,true));
    sys.pressure = lerp(sys.pressure,1040,min(1,map(lnd,0.8,0.93,0,0.2,true)*environmentalSensitivity));
    sys.pressure += random(-1,1);

    sys.depth = lerp(sys.depth,1,(1-tropicalness)*0.02);
    sys.depth = lerp(sys.depth,0,tropicalness*(1-sys.organization)*0.02);
    sys.depth = lerp(sys.depth,lnd ? 0.5 : map(SST,26,29,0.5,0.65,true),tropicalness*sys.organization*0.025);

    if(sys.kaboom > 0 && sys.kaboom < 1)
        sys.kaboom = random()<sys.kaboom ? 1 : 0;

    let namedBoom = false;
    if(sys.fetchStorm()){
        let d = sys.fetchStorm().designations.primary;
        for(let i = 0; i < d.length; i++){
            if(d[i].value === 'Boom'){
                namedBoom = true;
                sys.kaboom = 2;
            }
        }
    }

    if(sys.kaboom){
        if((!lnd || namedBoom) && (sys.organization > 0.8 || sys.kaboom === 2)){
            sys.kaboom = 2;
            if(sys.pressure > 600){
                // Let the inner core contract before accepting the full pressure
                // fall. This keeps broad storms as legitimate outliers without
                // making a large pressure/wind mismatch the normal boom state.
                let structuralRadius = targetRadiusOfMaxWind(sys,shear,lnd);
                let structuralReadiness = constrain(structuralRadius/sys.radiusOfMaxWind,0,1);
                sys.pressure -= random(5,10)*structuralReadiness*circulationIntensificationRate(sys);
            }
            sys.organization = 1;
            sys.lowerWarmCore = 1;
            if(sys.upperWarmCore < 0.5)
                sys.upperWarmCore = 0.5;
            sys.depth = 0.8;
        }

        if(lnd && !namedBoom){
            if(sys.kaboom === 2)
                sys.kaboom = 1;
            sys.organization = 0;
        }
    }else if(random()<0.0001*circulationIntensificationRate(sys))
        sys.kaboom = 1;

    // Kaboom changes pressure and core structure above, so derive the wind from
    // those final values in the same tick. A faster response prevents rapidly
    // deepening storms from retaining a wind speed that belongs to an old pressure.
    let targetWind = pressureWindTarget(sys,sizeFactors);
    if(isMonsoon) targetWind = min(65,targetWind);
    let windRate = isMonsoon && targetWind>sys.windSpeed ? 0.04 : 0.15;
    if(targetWind>sys.windSpeed) windRate *= circulationIntensificationRate(sys);
    else windRate *= environmentalSensitivity;
    if(sys.kaboom===2 && targetWind>sys.windSpeed)
        windRate = min(1,0.85*circulationIntensificationRate(sys));
    sys.windSpeed = lerp(sys.windSpeed,targetWind,windRate);

    if(sys.pressure > 1030 || sys.interaction.kill > 0)
        sys.kill = true;
};

// -- Type Determination -- //

STORM_ALGORITHM.defaults.typeDetermination = function(sys,u){
    switch(sys.type){
        case TROP:
            sys.type = sys.lowerWarmCore<0.55 ? EXTROP : ((sys.organization<0.4 && sys.windSpeed<50) || sys.windSpeed<20) ? sys.upperWarmCore<0.56 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.56 ? SUBTROP : TROP;
            break;
        case SUBTROP:
            sys.type = sys.lowerWarmCore<0.55 ? EXTROP : ((sys.organization<0.4 && sys.windSpeed<50) || sys.windSpeed<20) ? sys.upperWarmCore<0.57 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.57 ? SUBTROP : TROP;
            break;
        case TROPWAVE:
            sys.type = sys.lowerWarmCore<0.55 ? EXTROP : (sys.organization<0.45 || sys.windSpeed<25) ? sys.upperWarmCore<0.56 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.56 ? SUBTROP : TROP;
            break;
        case MONSOON:
            if(sys.lowerWarmCore<0.5)
                sys.type = EXTROP;
            else if(sys.windSpeed<20)
                sys.type = sys.upperWarmCore<0.52 ? EXTROP : TROPWAVE;
            else if(sys.organization>=0.72 && sys.upperWarmCore>=0.62)
                sys.type = TROP;
            else if(sys.organization>=0.78)
                sys.type = SUBTROP;
            break;
        default:
            sys.type = sys.lowerWarmCore<0.6 ? EXTROP : (sys.organization<0.45 || sys.windSpeed<25) ? sys.upperWarmCore<0.57 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.57 ? SUBTROP : TROP;
    }
};

// -- Version -- //
// Version number of a simulation mode's storm algorithm
// Used for upgrading the active attribute values if needed

STORM_ALGORITHM[SIM_MODE_NORMAL].version = 0;
STORM_ALGORITHM[SIM_MODE_HYPER].version = 0;
STORM_ALGORITHM[SIM_MODE_WILD].version = 0;
STORM_ALGORITHM[SIM_MODE_MEGABLOBS].version = 0;
STORM_ALGORITHM[SIM_MODE_EXPERIMENTAL].version = 1;
STORM_ALGORITHM[SIM_MODE_SPOOKY].version = 0;

// -- Upgrade -- //
// Converts active attributes in case an active system is loaded after an algorithm change breaks old values

// STORM_ALGORITHM[SIM_MODE_NORMAL].upgrade = function(sys,data,oldVersion){

// };

// STORM_ALGORITHM[SIM_MODE_HYPER].upgrade = function(sys,data,oldVersion){

// };

// STORM_ALGORITHM[SIM_MODE_WILD].upgrade = function(sys,data,oldVersion){

// };

// STORM_ALGORITHM[SIM_MODE_MEGABLOBS].upgrade = function(sys,data,oldVersion){

// };

STORM_ALGORITHM[SIM_MODE_EXPERIMENTAL].upgrade = function(sys,data,oldVersion){
    if(oldVersion < 1){
        sys.organization = data.organization;
        sys.lowerWarmCore = data.lowerWarmCore;
        sys.upperWarmCore = data.upperWarmCore;
        sys.depth = data.depth;
        sys.kaboom = 0;
    }
};

// STORM_ALGORITHM[SIM_MODE_SPOOKY].upgrade = function(sys,data,oldVersion){

// };
