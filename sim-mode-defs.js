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
        depth: 0,
        // Sample convective activity independently of the weak circulation at
        // genesis; a young wave can contain vigorous towers.
        convectiveActivity: [0.30,0.88]
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
        convectiveActivity: [0.18,0.62]
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
        depth: 0,
        convectiveActivity: [0.42,0.95]
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
        depth: 0.35,
        convectiveActivity: [0.32,0.82]
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
        depth: 0,
        convectiveActivity: [0.30,0.88]
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
        convectiveActivity: [0.30,0.88],
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
        convectiveActivity: [0.18,0.62],
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
        convectiveActivity: [0.42,0.95],
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
    legend: {
        type: 'vector',
        sampleValue: 2,
        valueFormat: v=>round(v*100)/100 + ' u/hr magnitude'
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
    legend: {
        type: 'vector',
        sampleValue: 4,
        valueFormat: v=>round(v*100)/100 + ' u/hr magnitude'
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
    legend: {
        type: 'vector',
        sampleValue: 3,
        valueFormat: v=>round(v*100)/100 + ' u/hr magnitude'
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
    legend: {
        type: 'gradient',
        range: [-5,5],
        ticks: [-5,0,5]
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
    legend: {
        type: 'gradient',
        range: [0,40],
        ticks: [0,10,20,26,30,40]
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
        let l = land.getAtXY(x,u.basin.hemY(y));
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
    legend: {
        type: 'gradient',
        range: [0,1],
        ticks: [0,0.25,0.5,0.75,1]
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
        let l = land.getAtXY(x,u.basin.hemY(y));
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
    legend: {
        type: 'gradient',
        // Keep the lower-level wind legend useful for the extended
        // Saffir-Simpson categories and hypercanes; 145 kt was only the
        // ordinary C5 endpoint and silently flattened stronger systems.
        range: [0,440],
        ticks: [0,34,64,85,110,145,170,210,270,330,400,440],
        valueFormat: v=>displayWindspeed(v,1)
    },
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
            [145,75,30,105],
            [170,245,238,250],
            [210,255,150,235],
            [270,255,80,205],
            [330,205,35,170],
            [400,116,18,145],
            [440,255,255,255]
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
    legend: {
        type: 'contour',
        description: '4 hPa contours · labels every 8 hPa'
    },
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

// -- simulated base-scan microwave brightness-temperature image -- //

// Approximate 85-89 GHz-like passive-microwave brightness-temperature range.
// Lower values mainly indicate ice scattering by deep convection; ordinary
// liquid precipitation can instead warm the scene through microwave emission.
const SIMULATED_BASE_SCAN_BT_MIN = 100;
const SIMULATED_BASE_SCAN_BT_MAX = 300;

// Base-scan tuning is intentionally separate from the cloud-top product.
// Mature storms need a little more microwave contrast, while the broad
// background should remain a quiet, low-frequency field instead of a carpet
// of isolated pixels.
const SIMULATED_BASE_SCAN_BACKGROUND_BASE = 0.07;
const SIMULATED_BASE_SCAN_BACKGROUND_VARIATION = 0.11;
const SIMULATED_BASE_SCAN_CELL_SCALE = 1.2;
const SIMULATED_BASE_SCAN_CELL_WEIGHT = 0.10;
const SIMULATED_BASE_SCAN_DENOISE_LOW = 0.075;
const SIMULATED_BASE_SCAN_DENOISE_HIGH = 0.86;

function radarClamp(v){
    return Math.max(0,Math.min(1,v));
}

// A passive microwave brightness temperature is not a radar reflectivity
// value with a reversed color scale. The lower-level precipitation scene is
// affected by the surface/clear-sky background, liquid-water emission, and
// (at the 85-89 GHz-like end of the product) ice scattering from deep towers.
// Keep these terms separate so ordinary rain can warm the scene while the
// strongest, deepest convection still produces the observed cold signature.
const SIMULATED_BASE_SCAN_CLEAR_BT_BASE = 238;
const SIMULATED_BASE_SCAN_CLEAR_BT_WARM_WATER = 18;
const SIMULATED_BASE_SCAN_CLEAR_BT_MOISTURE = 7;
// Ordinary lower-level rain/cloud water remains a modest warm contribution;
// the weak-core contrast below makes it visible without warming a mature
// eyewall enough to erase the eye/wall separation.
const SIMULATED_BASE_SCAN_LIQUID_EMISSION_MAX = 28;
// A separate low-level wetness contrast keeps ordinary weak precipitation
// distinguishable from the clear-sky field even when the passive-microwave
// liquid/ice terms nearly cancel.
const SIMULATED_BASE_SCAN_LIQUID_ECHO_CONTRAST = 24;
const SIMULATED_BASE_SCAN_ICE_SCATTERING_MAX = 205;

// The imagery raster samples one storm descriptor thousands of times. Keep
// the values that are constant for that descriptor outside the per-pixel
// path. Descriptors are rebuilt when the cached analysis time changes, so a
// WeakMap gives us reuse without retaining old storms or changing saved data.
let simulatedCloudSystemStateCache = new WeakMap();

function simulatedCloudSystemState(system){
    if(!system || (typeof system!=='object' && typeof system!=='function'))
        return {
            dvorak: {maturity:0,canopy:0,eyeReadiness:0,ringTemperature:-62},
            intensityLevel:0,
            eyeOpening:0,
            failure:0,
            failureMode:0,
            failureEvent:0,
            convectiveActivity:0,
            convectiveStrength:0,
            eyeVisibility:0,
            eyewallMaturity:0,
            convectiveMaturity:0,
            phase:0,
            visualSeed:0,
            shearFactor:0,
            convectiveClosure:0,
            convectiveAxis:0,
            eyeTypeRadiusFactor:1,
            imageryEyeScale:1,
            replacementMemory:0,
            replacementEyeRadius:1.55,
            cloudOuterEyeRadius:1.55,
            replacementEyeExpansion:0,
            replacementVisualFactor:0,
            doubleWallVisible:false,
            cloudEyeScale:0.54,
            coreRoundness:0,
            shieldRadius:0,
            coreRadius:2.9
        };

    let cached = simulatedCloudSystemStateCache.get(system);
    if(cached) return cached;

    let phase = Number.isFinite(system.phase) ? system.phase : 0;
    let visualSeed = Number.isFinite(system.visualSeed) ?
        system.visualSeed : 0;
    let shearFactor = radarClamp(system.shearFactor || 0);
    let direction = Number.isFinite(system.shearAngle) ?
        system.shearAngle : phase;
    // With negligible shear use the storm's stable orientation. Blend unit
    // vectors so crossing +/-pi does not flip the favored side of the storm.
    let shearWeight = radarSmoothStep(0.05,0.35,shearFactor);
    let convectiveAxis = Math.atan2(
        (1-shearWeight)*Math.sin(phase)+shearWeight*Math.sin(direction),
        (1-shearWeight)*Math.cos(phase)+shearWeight*Math.cos(direction)
    );

    // Keep the cache usable for lightweight consumers that load the shared
    // radar helpers without the later cloud-only section.
    let dvorak = typeof simulatedDvorakScene==='function' ?
        simulatedDvorakScene(system) :
        {maturity:0,canopy:0,eyeReadiness:0,ringTemperature:-62};
    let intensityLevel = simulatedIntensityLevel(system);
    let eyeOpening = simulatedEyeOpeningFactor(system);
    let failure = simulatedEyewallFailureLevel(system);
    let failureMode = simulatedEyewallFailureMode(system);
    let failureEvent = radarClamp(system.eyewallFailureEvent || 0);
    let convectiveActivity = simulatedConvectiveActivity(system);
    let convectiveStrength = simulatedConvectionStrength(system);
    let eyeVisibility = simulatedEyeVisibilityFactor(system);
    let eyewallMaturity = Number.isFinite(system.eyewallFactor) ?
        constrain(system.eyewallFactor,0,1) : 0;
    // Keep the original helper's `|| 0` behavior for descriptors supplied by
    // older saves while avoiding its repeated trigonometric setup per pixel.
    let convectiveMaturity = radarClamp(system.eyewallFactor || 0);
    let convectiveClosure = radarSmoothStep(0.30,0.90,convectiveMaturity)*
        (1-0.70*shearFactor)*(1-0.85*failure)*(1-0.55*eyeOpening);
    let replacementMemory = Number.isFinite(
        system.eyewallReplacementMemory
    ) ? radarClamp(system.eyewallReplacementMemory) : 0;
    let replacementEyeRadius = system &&
        Number.isFinite(system.eyewallOuterRadius) ?
        system.eyewallOuterRadius :
        typeof simulatedReplacementRadius==='function' ?
            simulatedReplacementRadius(system) : 1.55;
    let replacementEyeExpansion = simulatedReplacementEyeExpansion(system);
    let replacementVisualFactor = Math.max(
        simulatedEyewallReplacementVisualFactor(system),failure
    );
    let eyeTypeRadiusFactor = simulatedEyeTypeRadiusFactor(system);
    let imageryEyeScale = simulatedImageryEyeScale(system);
    let cloudEyeScale = typeof simulatedCloudEyeScale==='function' ?
        simulatedCloudEyeScale(system) :
        (0.54+0.18*0)*eyeTypeRadiusFactor*imageryEyeScale*
            (1+0.25*replacementEyeExpansion);
    let cachedState = {
        dvorak,
        intensityLevel,
        eyeOpening,
        failure,
        failureMode,
        failureEvent,
        convectiveActivity,
        convectiveStrength,
        eyeVisibility,
        eyewallMaturity,
        convectiveMaturity,
        phase,
        visualSeed,
        shearFactor,
        convectiveClosure,
        convectiveAxis,
        eyeTypeRadiusFactor,
        imageryEyeScale,
        replacementMemory,
        replacementEyeRadius,
        cloudOuterEyeRadius: Number.isFinite(system.eyewallOuterRadius) ?
            system.eyewallOuterRadius : 1.55,
        replacementEyeExpansion,
        replacementVisualFactor,
        doubleWallVisible: simulatedEyewallDoubleWallVisible(system),
        cloudEyeScale,
        coreRoundness: Math.pow(dvorak.maturity,0.65),
        shieldRadius: system.outerRadius*(1.15+0.20*system.shearFactor),
        coreRadius: 2.9+0.30*intensityLevel*
            (0.55+0.45*eyewallMaturity)
    };
    simulatedCloudSystemStateCache.set(system,cachedState);
    return cachedState;
}

// A live replacement is visually active while its phase is open. After the
// phase resets, keep a decaying handoff signal so the outer-wall/moat cues do
// not disappear in one hourly update. Old and historical descriptors simply
// omit this field and retain the pre-handoff behavior.
function simulatedEyewallReplacementVisualFactor(system){
    if(simulatedEyewallReplacementActive(system)) return 1;
    return system && Number.isFinite(system.eyewallReplacementHandoff) ?
        radarClamp(system.eyewallReplacementHandoff) : 0;
}

// The base-scan product is sampled from a deterministic lattice. Raw lattice
// values are useful for making cloud cells, but letting their full contrast
// multiply an already strong eyewall occasionally creates a few repeatable
// hot pixels/patches that dominate the rest of the ring. Keep the noise
// centered while limiting its contrast at the source; structural signals such
// as bands and eyewalls still provide the large-scale variation.
function radarBaseScanTextureNoise(value,contrast){
    value = Number.isFinite(value) ? value : 0.5;
    contrast = Number.isFinite(contrast) ? contrast : 1;
    return radarClamp(0.5+(value-0.5)*contrast);
}

// Base-scan echoes are ultimately rendered into a bounded brightness
// temperature palette, but a hard clamp at 1.0 makes an extreme cyclone
// visually identical to an ordinary C5 as soon as its local return crosses
// that threshold. Keep the ordinary range unchanged through 0.78, then use a
// smooth asymptotic tail. This preserves a bounded raster while retaining
// useful ordering for C5, C6+, and hyper-intense systems.
function radarBaseScanToneMap(v){
    v = Number.isFinite(v) ? Math.max(0,v) : 0;
    const knee = 0.78;
    if(v<=knee) return v;
    return knee+(1-knee)*(1-Math.exp(-1.65*(v-knee)));
}

// Keep a local fallback so imagery can still render historical or hand-built
// descriptors when the full StormData class is not present. The visual scale
// is relative to the neutral medium-eye profile.
const SIMULATED_EYE_TYPE_FALLBACK_PROFILES = [
    {visualScale:0.45},
    {visualScale:0.70},
    {visualScale:1},
    {visualScale:1.45},
    {visualScale:1.8}
];

function simulatedEyeTypeProfile(system){
    let index = system && Number.isFinite(system.eyeType) ?
        Math.round(system.eyeType) : 2;
    index = Math.max(0,Math.min(4,index));
    if(typeof StormData!=='undefined' &&
        typeof StormData.eyeTypeProfile==='function'){
        let profile = StormData.eyeTypeProfile(index);
        if(profile) return profile;
    }
    return SIMULATED_EYE_TYPE_FALLBACK_PROFILES[index];
}

function simulatedEyeTypeRadiusFactor(system){
    if(!system || !Number.isFinite(system.eyeType)) return 1;
    if(Number.isFinite(system.eyeRadiusFactor))
        return constrain(system.eyeRadiusFactor,0.25,1.8);

    let profile = simulatedEyeTypeProfile(system);
    let factor = Number.isFinite(profile.visualScale) ?
        profile.visualScale : 1;
    // A descriptor with physical metadata can use the actual diameter rather
    // than only the category midpoint. The 0.58 denominator is the neutral
    // normalized eye-radius used by the existing cloud/radar masks.
    if(Number.isFinite(system.eyeDiameter) &&
        Number.isFinite(system.radiusOfMaxWind) && system.radiusOfMaxWind>0){
        factor = system.eyeDiameter/(2*system.radiusOfMaxWind*0.58);
    }
    factor = constrain(factor,0.25,1.8);
    // Cache the derived value on live descriptors; this helper is called for
    // every raster sample during an imagery render.
    system.eyeRadiusFactor = factor;
    return factor;
}

// The map is an overview, while the imagery panel is an analysis product.
// On a global map the smallest supported RMW can be only a few map pixels, so
// a physically sized eye would collapse into one raster sample.  The
// environment descriptor may provide a bounded, imagery-only enlargement;
// hand-built and historical descriptors without it retain the physical scale.
function simulatedImageryEyeScale(system){
    if(!system || !Number.isFinite(system.imageryEyeScale)) return 1;
    return constrain(system.imageryEyeScale,1,2.4);
}

// The inner and replacement eyewalls are one physical structure. Keep their
// normalized radii in a shared helper so the base scan, cloud image, and IR-BD
// product cannot drift into separate eye geometries as the eye type or core
// compression changes.
function simulatedReplacementRadius(system){
    let phase = radarClamp(system.eyewallCycle || 0);
    let memory = Number.isFinite(system.eyewallReplacementMemory) ?
        radarClamp(system.eyewallReplacementMemory) : 0;
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        radarClamp(Math.max(
            system.eyewallFailure || 0,
            0.72*(system.eyewallFailureEvent || 0)
        ));
    let radiusGain = typeof EYEWALL_REPLACEMENT_POST_RADIUS_GAIN==='number' ?
        EYEWALL_REPLACEMENT_POST_RADIUS_GAIN : 0.90;
    let postRadius = 1+radiusGain*memory;
    // A successful replacement hands the primary circulation to a new wall
    // that is still outside the old RMW. The residual radius is carried
    // through the phase reset, so the new eye cannot collapse to the old size
    // for one frame and then thicken again.
    if(phase<=0 || phase>=1)
        return postRadius+0.65*failure;
    // Outer rainbands consolidate far outside the old RMW, then contract
    // toward the post-replacement wall instead of all the way to the old
    // eyewall. The closure interval is deliberately long enough to show the
    // hand-off as a process.
    let consolidation = 2.15-0.35*radarSmoothStep(0.12,0.65,phase);
    let closure = radarSmoothStep(0.80,1,phase);
    return postRadius+(consolidation-postRadius)*(1-closure)+0.65*failure;
}

function simulatedReplacementMoat(radius,inner,outer){
    let gap = outer-inner;
    if(gap<=0.08) return 0;
    return radarSmoothStep(0.08,0.45,gap)*Math.exp(-0.5*Math.pow(
        (radius-(inner+outer)*0.5)/(gap*0.19),2));
}

// Return a smooth version of max(value,0). The replacement wind profile is
// made from a normal circulation plus a local outer-wall enhancement; using
// Math.max() at that join leaves a visible ridge where the two curves cross.
function simulatedSmoothPositive(value,softness){
    let s = Math.max(0,Number.isFinite(softness) ? softness : 0);
    if(s<=0) return Math.max(0,value);
    return 0.5*(value+Math.sqrt(value*value+s*s))-0.5*s;
}

// The base-scan and SAR products use the same storm-relative wall angle. Keep
// the radial normalization here so the two products do not rotate their
// non-circular eyewalls by different amounts merely because SAR receives
// physical nautical-mile coordinates.
function simulatedBaseScanTextureAngle(system,angle,normalizedRadius,z){
    let r = Number.isFinite(normalizedRadius) ? Math.max(0,normalizedRadius) : 0;
    let time = Number.isFinite(z) ? z : 0;
    let rotation = time*0.018+
        0.45*Math.sin(time*0.018)/(1+r*0.18);
    let hemisphere = system && Number.isFinite(system.hemisphere) ?
        (system.hemisphere<0 ? -1 : 1) : 1;
    return angle+hemisphere*(rotation-0.72*Math.log(r+0.38));
}

function simulatedLegacyReplacementWindProfile(system,radius,decay,angle,z=0){
    if(radius<=0) return 0;
    let r = radius/Math.max(1,system.radiusOfMaxWind);
    let phase = radarClamp(system.eyewallCycle || 0);
    let memory = Number.isFinite(system.eyewallReplacementMemory) ?
        radarClamp(system.eyewallReplacementMemory) : 0;
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        radarClamp(Math.max(
            system.eyewallFailure || 0,
            0.72*(system.eyewallFailureEvent || 0)
        ));
    let sharedAngle = Number.isFinite(angle) ? angle : 0;
    let wallAngle = typeof simulatedBaseScanTextureAngle==='function' ?
        simulatedBaseScanTextureAngle(system,sharedAngle,r,z) : sharedAngle;
    let sharedRadii = typeof simulatedEyewallRadii==='function' ?
        simulatedEyewallRadii(system,wallAngle,true,z) : {
            inner:1,
            outer:simulatedReplacementRadius(system)
        };
    let innerShape = Number.isFinite(sharedRadii.inner) ?
        Math.max(0.15,sharedRadii.inner) : 1;
    // SAR resolves the physical secondary wind maximum. Do not reuse the
    // eye-type-scaled convective radius here: compact clear eyes otherwise
    // collapse the inner and outer wind maxima into one raster ring.
    let outer = Number.isFinite(sharedRadii.windOuter) ?
        Math.max(innerShape+0.28,sharedRadii.windOuter) :
        Number.isFinite(sharedRadii.outer) ?
            Math.max(innerShape+0.08,sharedRadii.outer) :
        simulatedReplacementRadius(system);
    // The base scan resolves its primary wall at `innerShape`, so the
    // ordinary SAR circulation must use that same center even outside an
    // active replacement cycle. This also makes the cycle boundary
    // continuous instead of snapping back to the unscaled RMW.
    let innerR = r/innerShape;
    let innerProfile = innerR<1 ? Math.pow(innerR,0.7) : Math.pow(1/innerR,decay);
    let ordinary = innerProfile;
    if((phase<=0 || phase>=1) && memory<=0 && failure<=0) return ordinary;
    let formation = radarSmoothStep(0.06,0.42,phase);
    let closure = radarSmoothStep(0.80,1,phase);
    let innerSector = 1, outerSector = 1;
    let widthFactor = 1;
    let wallEnvelope = formation*(1-closure);
    // A settled replacement still retains a small amount of sector structure;
    // otherwise the phase reset turns the new wall into a perfect circle for
    // the duration of the residual-memory state.
    wallEnvelope = Math.max(wallEnvelope,0.40*memory+0.25*failure);
    let radialTexture = 1;
    if(Number.isFinite(angle)){
        // Low azimuthal wave numbers represent displaced, elliptical walls
        // and broad wind sectors. Each wall has its own phase: a concentric
        // radial profile plus pixel noise still produces an artificial target.
        let seed = Number.isFinite(system.visualSeed) ? system.visualSeed : 0;
        let a = angle-seed-z*0.009;
        let evolution = Math.sin(z*0.017+seed);
        innerSector -= wallEnvelope*(0.10*(1-Math.cos(a+0.4))+
            0.045*(1-Math.sin(2*a)));
        outerSector -= wallEnvelope*(0.18*(1-Math.cos(a-0.7))+
            0.07*(1-Math.sin(3*a+0.4)));
        widthFactor = 1+wallEnvelope*(0.25*Math.cos(a+1.2)+0.12*Math.sin(2*a));
        // Small, continuous radial waviness breaks up the exact circular edge
        // without introducing pixel-scale speckle or extra local peaks.
        radialTexture += wallEnvelope*(0.045*Math.sin(4*a+2.6*r+seed)+
            0.025*Math.sin(7*a-3.8*r+0.7*evolution));
    }
    let takeover = radarSmoothStep(0.32,0.78,phase)*(1-closure);
    // Let the original wind maximum weaken locally as the replacement wall
    // takes over, instead of multiplying the entire inner radial profile by a
    // second absolute curve. This leaves a continuous background through the
    // moat and keeps the old peak broad.
    let innerWallWidth = Math.max(0.20,0.24*widthFactor);
    let innerWall = Math.exp(-0.5*Math.pow(
        (r-innerShape)/innerWallWidth,2
    ));
    let innerSectorFactor = 1+0.34*(innerSector-1)*innerWall;
    let innerAdjusted = innerProfile*(1-(0.045+0.13*takeover)*innerWall)*
        innerSectorFactor;

    // The outer eyewall is wider than a mathematical contour and only adds
    // wind where its broad maximum rises above the ordinary circulation. A
    // smooth-positive residual removes the kink that made the old `max()`
    // construction look painted on.
    let outerWidth = Math.max(0.26,
        (0.18+0.09*formation+0.13*Math.max(0,outer-innerShape))*
        widthFactor
    );
    let outerPeak = (0.94+0.14*takeover)*outerSector*radialTexture*
        Math.exp(-0.5*Math.pow((r-outer)/outerWidth,2));
    let outerLift = simulatedSmoothPositive(outerPeak-innerProfile,0.045);
    let moat = simulatedReplacementMoat(r,innerShape,outer);
    let double = innerAdjusted+outerLift*(1-0.18*moat);
    // During an active replacement, the inner maximum follows the same
    // resolved wall radius as the base-scan image. The ordinary RMW profile
    // is kept for storms without a replacement so their normal SAR field is
    // unchanged.
    let replacementBase = innerProfile;
    let replacementProfile = replacementBase+
        (double-replacementBase)*formation*(1-closure);
    if(memory>0 || failure>0){
        let postWeight = phase>0 && phase<1 ?
            radarSmoothStep(0.80,1,phase) : 1;
        // Keep the settled outer peak on the same resolved radius used by
        // the base-scan wall. The unscaled replacement radius is only the
        // descriptor's intermediate state; eye type and core compression are
        // applied by the shared geometry above.
        let postRadius = outer;
        let postWidth = Math.max(0.20,0.20+0.06*memory+
            0.04*failure);
        // A completed successful replacement has one outer eyewall. Build
        // the circulation from that new radius so the wind decays outward
        // from the outer wall instead of inheriting the old inner-RMW tail.
        let postCirculation = r<postRadius ?
            Math.pow(r/Math.max(postRadius,0.15),0.7) :
            Math.pow(postRadius/Math.max(r,postRadius),decay);
        let postBackground = postCirculation*
            (0.88+0.05*memory+0.03*failure);
        let postPeak = (0.96+0.04*memory)*outerSector*radialTexture*
            Math.exp(-0.5*Math.pow((r-postRadius)/postWidth,2));
        let postLift = simulatedSmoothPositive(postPeak-postBackground,0.045);
        let postProfile = postBackground+postLift;
        return Math.max(0,Math.min(1,
            replacementProfile*(1-postWeight)+postProfile*postWeight
        ));
    }
    return Math.max(0,Math.min(1,replacementProfile));
}

// Even a cyclone without an eyewall-replacement cycle is not a mathematically
// circular vortex. Broad translation, shear, and pressure-gradient effects
// make the wind maximum vary by sector. Keep that variation low-frequency and
// deterministic so SAR does not turn into either a target of concentric rings
// or a frame-to-frame noise field.
function simulatedOrdinaryWindProfile(system,r,decay,angle,z=0){
    if(r<=0) return 0;

    let decayExponent = Number.isFinite(decay) ? decay : 0.62;
    let time = Number.isFinite(z) ? z : 0;
    let seed = Number.isFinite(system && system.visualSeed) ?
        system.visualSeed : Number.isFinite(system && system.phase) ?
            system.phase : 0;
    let sharedAngle = Number.isFinite(angle) ? angle : 0;
    let wallAngle = typeof simulatedBaseScanTextureAngle==='function' ?
        simulatedBaseScanTextureAngle(system,sharedAngle,r,time) : sharedAngle;
    let shearFactor = Number.isFinite(system && system.shearFactor) ?
        radarClamp(system.shearFactor) : 0.35;
    let a = wallAngle-seed-time*0.009+
        (Number.isFinite(system && system.shearAngle) ?
            0.28*system.shearAngle : 0);

    // Let the effective RMW meander by sector. The logarithmic winding in
    // wallAngle makes the contour gently spiral as it moves outward instead
    // of drawing the same ellipse at every radius.
    let shapeStrength = 0.11+0.06*shearFactor;
    let radiusShape = 1+shapeStrength*(
        0.80*Math.cos(a-0.7)+0.45*Math.sin(2*a+0.4)
    );
    let effectiveRmw = Math.max(0.75,radiusShape);
    let relativeRadius = r/effectiveRmw;
    let circulation = relativeRadius<1 ?
        Math.pow(relativeRadius,0.7) : Math.pow(1/relativeRadius,decayExponent);

    // A broad sector bias represents translation and shear. Normalize its
    // peak so the reported maximum wind remains the product's upper bound.
    let sectorAmplitude = 0.08+0.05*shearFactor;
    let sector = 1+sectorAmplitude*Math.cos(a+0.35)+
        0.035*Math.sin(2*a-0.6);
    sector /= 1+sectorAmplitude+0.035;
    let radialTexture = 1+0.014*Math.sin(3*a+2.2*r+seed)+
        0.009*Math.sin(6*a-3.4*r+0.7*Math.sin(time*0.017+seed));

    return Math.max(0,Math.min(1,circulation*sector*radialTexture));
}

// Surface-wind SAR should describe one broad, expanding circulation with a
// weakening residual inner wall during the active replacement. The legacy
// profile above kept the original RMW curve and lifted a second full-strength
// Gaussian around the replacement wall; at map resolution that reads as a
// bright circle painted over the wind field. Keep the new outer wall and its
// peripheral tail in one profile so the outer eye blends into the environment.
function simulatedReplacementWindProfile(system,radius,decay,angle,z=0){
    if(!system || radius<=0) return 0;

    let physicalRmw = Number.isFinite(system.radiusOfMaxWind) ?
        Math.max(1,system.radiusOfMaxWind) : 1;
    let r = radius/physicalRmw;
    let phase = radarClamp(system.eyewallCycle || 0);
    let memory = Number.isFinite(system.eyewallReplacementMemory) ?
        radarClamp(system.eyewallReplacementMemory) : 0;
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        radarClamp(Math.max(
            system.eyewallFailure || 0,
            0.72*(system.eyewallFailureEvent || 0)
        ));
    let decayExponent = Number.isFinite(decay) ? decay : 0.62;
    let time = Number.isFinite(z) ? z : 0;
    let active = phase>0 && phase<1;

    // Systems without a replacement keep the same physical RMW scale, while
    // simulatedOrdinaryWindProfile adds the small sector/shape variation that
    // prevents a normal SAR scene from becoming a perfect target pattern.
    if(!active && memory<=0 && failure<=0){
        return simulatedOrdinaryWindProfile(
            system,r,decayExponent,angle,time
        );
    }

    let sharedAngle = Number.isFinite(angle) ? angle : 0;
    let wallAngle = typeof simulatedBaseScanTextureAngle==='function' ?
        simulatedBaseScanTextureAngle(system,sharedAngle,r,time) : sharedAngle;
    let sharedRadii = typeof simulatedEyewallRadii==='function' ?
        simulatedEyewallRadii(system,wallAngle,true,time) : {
            windOuter:simulatedReplacementRadius(system)
        };
    // `windOuter` is deliberately the physical radius, unlike the
    // eye-type-scaled convective radius used by cloud/base-scan masks.
    let targetRmw = Number.isFinite(sharedRadii.physicalOuter) ?
        sharedRadii.physicalOuter : Number.isFinite(sharedRadii.windOuter) ?
        sharedRadii.windOuter : Number.isFinite(sharedRadii.outer) ?
            sharedRadii.outer : simulatedReplacementRadius(system);
    targetRmw = Math.max(1,targetRmw);

    // The outer wall appears from the old RMW, expands into the outer-core
    // circulation, and then contracts toward the settled post-cycle RMW. The
    // outer circulation is the main profile, so its broad tail continues into
    // the surrounding wind field instead of falling straight to background.
    let transfer = active ? radarSmoothStep(0.04,0.48,phase) : 1;
    let residualEnvelope = Math.max(0.38*memory,0.25*failure);
    let closure = active ? radarSmoothStep(0.80,1,phase) : 0;
    // A cycle with no post-replacement memory must converge all the way back
    // to the ordinary profile at completion. A successful or failed cycle
    // with residual memory keeps only the same small structure that survives
    // on the first post-cycle sample.
    let structureEnvelope = active ? Math.max(
        transfer*(1-closure),residualEnvelope
    ) : residualEnvelope;
    let settledReplacement = memory>0 || failure>0;
    // Use the normal asymmetric circulation as the zero-replacement baseline.
    // This makes the active-cycle handoff converge to the same field that is
    // rendered immediately before/after the cycle, instead of snapping from
    // an irregular storm back to a perfect radial curve at phase 1.
    let ordinaryProfile = simulatedOrdinaryWindProfile(
        system,r,decayExponent,angle,time
    );
    let targetWeight = active ? transfer*(1-closure)+
        (settledReplacement ? closure : 0) : 1;
    let expandedRmw = 1+(targetRmw-1)*targetWeight;

    let seed = Number.isFinite(system.visualSeed) ? system.visualSeed : 0;
    let a = wallAngle-seed-time*0.009;
    // Low wave numbers make the effective RMW displaced and elliptical, while
    // keeping the radial field coherent at SAR raster resolution.
    let radiusShape = 1+structureEnvelope*(
        0.11*Math.cos(a-0.7)+0.065*Math.sin(2*a+0.4)
    );
    let effectiveRmw = Math.max(0.75,expandedRmw*radiusShape);
    let relativeRadius = r/effectiveRmw;
    // A slightly shallower outer decay keeps the wind connected to the
    // peripheral circulation. The outer eyewall therefore fades over distance
    // instead of producing a narrow bright ring followed by background wind.
    let outerDecay = Math.max(0.48,
        decayExponent-0.14*structureEnvelope);
    let outerCirculation = relativeRadius<1 ?
        Math.pow(relativeRadius,0.7) :
        Math.pow(1/relativeRadius,outerDecay);

    // Retain a weakening inner maximum during the active replacement. It is a
    // residual wall carried by the same broad outer circulation, not a second
    // full-strength field added on top of it. This gives the SAR product the
    // physical double wind-speed peak while the expanded outer RMW controls
    // the field between the peaks and outside the outer eye.
    let innerWallWeight = active ? transfer*(1-closure) :
        0.24*failure;
    let innerWallWidth = 0.16+0.025*structureEnvelope;
    let innerWall = Math.exp(-0.5*Math.pow(
        (r-1)/Math.max(0.12,innerWallWidth),2
    ));

    // Broad sector modulation is applied to the same circulation rather than
    // creating a separate outer ring. It supplies realistic SAR asymmetry
    // while preserving a smooth outer wind tail.
    let sectorStrength = 1+structureEnvelope*(
        0.12*Math.cos(a+0.35)+0.07*Math.sin(2*a-0.6)
    );
    let radialTexture = 1+structureEnvelope*(
        0.025*Math.sin(3*a+2.2*r+seed)+
        0.016*Math.sin(6*a-3.4*r+0.7*Math.sin(time*0.017+seed))
    );
    let circulation = outerCirculation*sectorStrength*radialTexture;
    let innerWallAmplitude = 0.36*innerWallWeight;
    let replacementProfile = circulation*(1+innerWallAmplitude*innerWall);
    if(active){
        let replacementWeight = radarClamp(structureEnvelope);
        replacementProfile = ordinaryProfile*(1-replacementWeight)+
            replacementProfile*replacementWeight;
    }
    return Math.max(0,Math.min(1,replacementProfile));
}

function simulatedEyewallRadii(system,textureAngle,baseScanMode,z,preparedState){
    let phase = preparedState ? preparedState.phase :
        system && Number.isFinite(system.phase) ? system.phase : 0;
    let angle = Number.isFinite(textureAngle) ? textureAngle : 0;
    let eyeTypeRadiusFactor = preparedState ?
        preparedState.eyeTypeRadiusFactor : simulatedEyeTypeRadiusFactor(system);
    let eyeFillFactor = system && Number.isFinite(system.eyeFillFactor) ?
        constrain(system.eyeFillFactor,0,1) : 0;
    let inwardCoreCompression = 0.28*eyeFillFactor;
    let innerRadius = 1+(baseScanMode ? 0.06 : 0.10)*
            Math.sin(2*angle+phase)+
        (baseScanMode ? 0.03 : 0.06)*
            Math.sin(3*angle-phase+
                (baseScanMode && Number.isFinite(z) ? z*0.012 : 0));
    innerRadius *= eyeTypeRadiusFactor*(1-inwardCoreCompression);
    let hasOuterRadius = system &&
        Number.isFinite(system.eyewallOuterRadius);
    let outerEyeRadius = preparedState ? preparedState.replacementEyeRadius :
        hasOuterRadius ? system.eyewallOuterRadius :
        typeof simulatedReplacementRadius==='function' ?
            simulatedReplacementRadius(system) : 1.55;
    // The clear-eye/eye-type scale describes the inner core. It must not also
    // shrink the physical radius of a replacement wind maximum: doing so
    // folds the new outer wind ring back onto a pinhole or small eye and the
    // SAR raster resolves only one ring. Keep the imagery outer radius for
    // the convective products, but expose an unscaled wind radius separately.
    let physicalOuterRadius = outerEyeRadius*(1+0.08*Math.sin(2*angle-phase));
    let outerRadius = physicalOuterRadius*eyeTypeRadiusFactor*
        (1-0.72*inwardCoreCompression);
    let replacementMemory = preparedState ? preparedState.replacementMemory :
        system && Number.isFinite(system.eyewallReplacementMemory) ?
            radarClamp(system.eyewallReplacementMemory) : 0;
    let windOuterRadius = Math.max(
        physicalOuterRadius,
        innerRadius+0.28+0.06*replacementMemory
    );
    return {
        inner:innerRadius,
        outer:outerRadius,
        physicalOuter:physicalOuterRadius,
        windOuter:windOuterRadius
    };
}

function radarSmoothStep(edge0,edge1,v){
    let t = radarClamp((v-edge0)/(edge1-edge0));
    return t*t*(3-2*t);
}

// Every simulated imagery product uses the same continuous intensity proxy.
// A descriptor may provide `intensity` from the pressure/wind model; the
// strength fallback keeps hand-built and historical descriptors compatible.
function simulatedIntensityLevel(system){
    let level = system && Number.isFinite(system.intensity) ?
        system.intensity : system && Number.isFinite(system.strength) ?
            system.strength : 0;
    return constrain(level,0,1);
}

// A deterministic multi-scale texture keeps the echo field spatially
// irregular without adding another mutable noise channel to saved seasons.
// Its value changes only with simulation time, not with render frames.
function radarTexture(x,y,z,phase){
    let t = z*0.035;
    let low = 0.5+0.5*Math.sin(x*0.014+1.7*Math.sin(y*0.009+t*0.7)+t*0.45+phase);
    let mid = 0.5+0.5*Math.sin(x*0.055-y*0.041+2.2*Math.sin((x+y)*0.008+t)+t*0.8+phase*1.7);
    let fine = 0.5+0.5*Math.sin(x*0.13+y*0.097+1.5*Math.sin(x*0.021-y*0.017)+t*1.4+phase*2.3);
    return radarClamp(0.5*low+0.32*mid+0.18*fine);
}

// Seeded lattice noise has no preferred stripe direction. Smooth spatial and
// temporal interpolation keeps cells reproducible without frame-time RNG.
// Keep the hash function outside radarNoise: this function is called several
// times for every imagery pixel, and allocating an arrow function for every
// lattice lookup adds noticeable garbage-collection pressure at 512x512.
function radarNoiseHash(a,b,seed){
    let v = Math.sin(a*127.1+b*311.7+seed*74.7)*43758.5453;
    return v-Math.floor(v);
}

function radarNoise(x,y,seed){
    let ix = Math.floor(x), iy = Math.floor(y);
    let fx = x-ix, fy = y-iy;
    fx = fx*fx*(3-2*fx);
    fy = fy*fy*(3-2*fy);
    let a = radarNoiseHash(ix,iy,seed), b = radarNoiseHash(ix+1,iy,seed);
    let c = radarNoiseHash(ix,iy+1,seed), d = radarNoiseHash(ix+1,iy+1,seed);
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}

function radarEvolvingNoise(x,y,z,seed){
    let time = z/24;
    let epoch = Math.floor(time);
    let blend = time-epoch;
    blend = blend*blend*(3-2*blend);
    return radarNoise(x,y,seed+epoch*19.19)*(1-blend)+
        radarNoise(x,y,seed+(epoch+1)*19.19)*blend;
}

function simulatedBaseScanColor(v){
    colorMode(RGB);
    let rgba = simulatedBaseScanRgba(v);
    return color(rgba[0],rgba[1],rgba[2],rgba[3]);
}

function simulatedBaseScanRgba(v,out=[0,0,0,0]){
    v = Number.isFinite(v) ?
        constrain(v,SIMULATED_BASE_SCAN_BT_MIN,SIMULATED_BASE_SCAN_BT_MAX) :
        SIMULATED_BASE_SCAN_BT_MAX;
    // Reuse the palette and write directly to the caller's pixel scratch buffer.
    let stops = simulatedBaseScanRgba.stops || (simulatedBaseScanRgba.stops = [
        [100,0,0,0],
        [110,22,0,48],
        [120,68,0,112],
        [130,135,0,78],
        [140,190,0,28],
        [152,230,0,15],
        [168,245,20,0],
        [180,250,55,0],
        [192,255,120,0],
        [210,255,235,0],
        [228,70,210,40],
        [246,0,205,220],
        [264,0,105,220],
        [282,8,47,175],
        [300,5,20,95]
    ]);
    let upperIndex = 1;
    while(upperIndex<stops.length-1 && v>stops[upperIndex][0]) upperIndex++;
    let lower = stops[upperIndex-1];
    let upper = stops[upperIndex];
    let blend = Math.max(0,Math.min(1,(v-lower[0])/(upper[0]-lower[0])));
    for(let channel=1;channel<=3;channel++)
        out[channel-1] = Math.round(lower[channel]+blend*(upper[channel]-lower[channel]));
    out[3] = 255;
    return out;
}

function simulatedImagerySystems(u,z){
    if(u.simulatedSystems && u.simulatedSystemsTick===z) return u.simulatedSystems;
    return u.basin.env.getBaseScanSystems(z,u.storm);
}

function simulatedLandAbrasionAtAngle(system,angle){
    let profile = system.landAbrasionProfile;
    let count = Number.isInteger(system.landAbrasionSectorCount) ?
        system.landAbrasionSectorCount : Array.isArray(profile) ? profile.length : 0;
    if(!Array.isArray(profile) || count<2 || count!==profile.length) return 0;
    let wrapped = (angle%TAU+TAU)%TAU;
    let position = wrapped/TAU*count;
    let lower = floor(position)%count;
    let upper = (lower+1)%count;
    let fraction = position-floor(position);
    return constrain(lerp(profile[lower],profile[upper],fraction),0,1);
}

function simulatedEyewallFailureLevel(system){
    if(!system) return 0;
    let persistent = radarClamp(system.eyewallFailure || 0);
    let event = radarClamp(system.eyewallFailureEvent || 0);
    return radarClamp(Math.max(persistent,0.72*event));
}

function simulatedEyeVisibilityFactor(system){
    let eyeFactor = Number.isFinite(system.eyeFactor) ?
        constrain(system.eyeFactor,0,1) : 0;
    let eyeFillFactor = Number.isFinite(system.eyeFillFactor) ?
        constrain(system.eyeFillFactor,0,1) : 0;
    // Landfall weakens the subsidence that keeps the eye clear. Keep a small
    // residual eye signal so the transition is gradual rather than binary.
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        radarClamp(Math.max(
            system.eyewallFailure || 0,
            0.72*(system.eyewallFailureEvent || 0)
        ));
    return constrain(eyeFactor*(1-0.92*eyeFillFactor)*(1-0.65*failure),0,1);
}

// Shared azimuthal organization for microwave and infrared convection.
// One broad active sector grows into a closed ring; texture cannot choose
// unrelated missing quadrants independently in each product.
function simulatedConvectiveArc(system,angle,preparedState){
    let closure;
    let axis;
    if(preparedState){
        closure = preparedState.convectiveClosure;
        axis = preparedState.convectiveAxis;
    }else{
        let shear = radarClamp(system.shearFactor || 0);
        let maturity = radarClamp(system.eyewallFactor || 0);
        let failure = simulatedEyewallFailureLevel(system);
        let opening = simulatedEyeOpeningFactor(system);
        closure = radarSmoothStep(0.30,0.90,maturity)*
            (1-0.70*shear)*(1-0.85*failure)*(1-0.55*opening);
        let phase = Number.isFinite(system.phase) ? system.phase : 0;
        let direction = Number.isFinite(system.shearAngle) ?
            system.shearAngle : phase;
        // With negligible shear use the storm's stable orientation. Blend
        // unit vectors so crossing +/-pi does not flip the favored side.
        let shearWeight = radarSmoothStep(0.05,0.35,shear);
        axis = Math.atan2((1-shearWeight)*Math.sin(phase)+
            shearWeight*Math.sin(direction),(1-shearWeight)*Math.cos(phase)+
            shearWeight*Math.cos(direction));
    }
    let sector = radarSmoothStep(-0.20-0.70*closure,0.45-0.35*closure,
        Math.cos(angle-axis));
    return closure+(1-closure)*(0.12+0.88*sector);
}

// The resolved convective ring is usually organized by one broad azimuthal
// sector, not by independent pixel noise. Keep this envelope deliberately
// low-order so the BD enhancement shows a smooth active arc while the
// microwave return remains the local precipitation evidence.
function simulatedConvectiveRingSector(system,angle,preparedState){
    let phase;
    let axis;
    if(preparedState){
        phase = preparedState.phase;
        axis = preparedState.convectiveAxis;
    }else{
        let shear = radarClamp(system.shearFactor || 0);
        phase = Number.isFinite(system.phase) ? system.phase : 0;
        let direction = Number.isFinite(system.shearAngle) ?
            system.shearAngle : phase;
        let shearWeight = radarSmoothStep(0.05,0.35,shear);
        axis = Math.atan2((1-shearWeight)*Math.sin(phase)+
            shearWeight*Math.sin(direction),(1-shearWeight)*Math.cos(phase)+
            shearWeight*Math.cos(direction));
    }
    let relative = angle-axis;
    let primary = 0.5+0.5*Math.cos(relative);
    let secondary = 0.5+0.5*Math.cos(2*relative-0.75+0.35*Math.sin(phase));
    let tertiary = 0.5+0.5*Math.cos(3*relative+0.45*phase);
    let broadSector = radarClamp(0.16+0.56*primary+0.22*secondary+
        0.06*tertiary);
    let organizedArc = simulatedConvectiveArc(system,angle,preparedState);
    return radarClamp((0.32+0.68*organizedArc)*
        (0.22+0.78*broadSector));
}

function simulatedBrokenWall(system,angle,radius){
    let mode = typeof simulatedEyewallFailureMode==='function' ?
        simulatedEyewallFailureMode(system) :
        Math.round(system.eyewallFailureMode || 0);
    if(mode>0){
        let outerRadius = Number.isFinite(system.eyewallOuterRadius) ?
            system.eyewallOuterRadius : 1.55;
        let wallRole = Number.isFinite(radius) && radius>outerRadius*0.72 ? 1 : 0;
        return simulatedEyewallWallContinuity(system,angle,wallRole);
    }
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        radarClamp(Math.max(
            system.eyewallFailure || 0,
            0.72*(system.eyewallFailureEvent || 0)
        ));
    let gaps = radarSmoothStep(-0.4,0.65,Math.sin(3*angle+system.phase+radius*0.6));
    return 1-failure*(0.35+0.50*gaps);
}

function simulatedEyewallReplacementActive(system){
    return !!(system && Number.isFinite(system.eyewallCycle) &&
        system.eyewallCycle>0 && system.eyewallCycle<1);
}

function simulatedEyewallReplacementVisible(system){
    if(simulatedEyewallReplacementActive(system)) return true;
    if(simulatedEyewallReplacementVisualFactor(system)>0.001) return true;
    let memory = system && Number.isFinite(system.eyewallReplacementMemory) ?
        radarClamp(system.eyewallReplacementMemory) : 0;
    let outerWeight = system && Number.isFinite(system.eyewallOuterWeight) ?
        radarClamp(system.eyewallOuterWeight) : 0;
    return memory>0 && outerWeight>0.04;
}

// A successful replacement keeps the new outer wall as the primary wall. The
// handoff signal temporarily retains the two-wall visual cues while the new
// circulation settles, then fades them without leaving a permanent double
// eyewall state.
function simulatedEyewallDoubleWallVisible(system){
    if(simulatedEyewallReplacementActive(system)) return true;
    if(simulatedEyewallReplacementVisualFactor(system)>0.001) return true;
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(system) :
        radarClamp(Math.max(
            system && system.eyewallFailure || 0,
            0.72*(system && system.eyewallFailureEvent || 0)
        ));
    let mode = typeof simulatedEyewallFailureMode==='function' ?
        simulatedEyewallFailureMode(system) :
        Math.round(system && system.eyewallFailureMode || 0);
    return failure>0.05 && mode>0;
}

function simulatedEyewallFailureMode(system){
    if(!system) return 0;
    if(Number.isFinite(system.eyewallFailureEventMode) &&
        system.eyewallFailureEventMode>0)
        return Math.round(system.eyewallFailureEventMode);
    if(Number.isFinite(system.eyewallFailureMode) &&
        system.eyewallFailureMode>0)
        return Math.round(system.eyewallFailureMode);
    return 0;
}

// Failure morphology is wall-specific. Mode 2 keeps a nested, partially
// coherent double eyewall; mode 1 gives the inner and outer walls separate
// gap fields so one can break while the other remains closed.
function simulatedEyewallWallContinuity(system,angle,wallRole,preparedState){
    let failure;
    let mode;
    let phase;
    let event;
    let seed;
    if(preparedState){
        failure = preparedState.failure;
        mode = preparedState.failureMode;
        phase = preparedState.phase;
        event = preparedState.failureEvent;
        seed = preparedState.visualSeed;
    }else{
        failure = typeof simulatedEyewallFailureLevel==='function' ?
            simulatedEyewallFailureLevel(system) :
            radarClamp(Math.max(
                system.eyewallFailure || 0,
                0.72*(system.eyewallFailureEvent || 0)
            ));
        mode = simulatedEyewallFailureMode(system);
        phase = Number.isFinite(system.phase) ? system.phase : 0;
        event = radarClamp(system.eyewallFailureEvent || 0);
        seed = Number.isFinite(system.visualSeed) ? system.visualSeed : 0;
    }
    if(failure<=0) return 1;
    if(mode===2){
        let nestedWave = 0.5+0.5*Math.sin(
            2*angle+phase+seed*0.13+0.45*Math.sin(phase)
        );
        let nestedGap = radarSmoothStep(0.30,0.78,nestedWave);
        return radarClamp(1-failure*(0.12+0.16*nestedGap)*
            (0.72+0.28*event));
    }
    let offset = wallRole===1 ? 2.15+0.35*Math.sin(seed) : 0;
    let wave = 0.5+0.5*Math.sin(
        3*angle+phase+seed*0.17+offset+
        0.32*Math.sin(5*angle-phase*0.7)
    );
    let gap = radarSmoothStep(0.28,0.76,wave);
    let severity = wallRole===1 ? 0.70 : 0.52;
    return radarClamp(1-failure*severity*gap*
        (0.72+0.28*event));
}

// The outer eyewall needs its own width. Reusing the inner-wall width, then
// clipping it to the inner/outer gap, turns the forming ring into a one-pixel
// filament. Let it grow from a visible seed to a mature, broad ring instead.
function simulatedReplacementOuterWallWidth(system,baseWidth,innerRadius,outerRadius){
    if(!Number.isFinite(baseWidth) || baseWidth<=0) return 0;
    let active = simulatedEyewallReplacementActive(system);
    let memory = system && Number.isFinite(system.eyewallReplacementMemory) ?
        radarClamp(system.eyewallReplacementMemory) : 0;
    if(!active && memory<=0) return baseWidth*1.12;
    let phase = active && Number.isFinite(system.eyewallCycle) ?
        radarClamp(system.eyewallCycle) : 1;
    let formation = active ? radarSmoothStep(0.08,0.50,phase) : 1;
    let gap = Math.max(0,outerRadius-innerRadius);
    let width = baseWidth*(1.08+0.22*formation)+
        Math.min(0.10,0.05*gap+0.04*formation);
    return Math.max(width,0.15+0.08*formation);
}

function simulatedReplacementWallContinuity(system,angle,radius){
    if(!simulatedEyewallReplacementActive(system)) return 1;
    // Use the original wall as the base. Add only a small, deterministic gap
    // during the opening window so the ring degrades naturally instead of
    // being replaced by a hard-coded target band.
    let phase = radarClamp(system.eyewallCycle);
    let formation = radarSmoothStep(0.12,0.48,phase);
    let closure = radarSmoothStep(0.68,0.98,phase);
    let opening = formation*(1-closure);
    let gaps = radarSmoothStep(-0.35,0.70,
        Math.sin(3*angle+system.phase+radius*0.6));
    return 1-0.16*opening*gaps;
}

// Deep convection is not a direct readout of the circulation intensity, but
// it is not independent of the lower-level circulation either. A weak
// tropical cyclone can still contain vigorous towers when its moisture and
// tropical structure are favorable; a stronger low-level vortex should then
// raise the deep-convective floor and make VCDG/ECDG cloud tops more common.
// Keep the environmental activity channel separate, and combine it with the
// lower-level intensity only when deriving the rendered convective signal.
function simulatedConvectiveActivity(system){
    let environmentalActivity;
    if(system && Number.isFinite(system.convectiveActivity))
        environmentalActivity = radarClamp(system.convectiveActivity);
    else if(system && Number.isFinite(system.convectionActivity))
        environmentalActivity = radarClamp(system.convectionActivity);

    let tropical = system && Number.isFinite(system.tropicalFactor) ?
        radarClamp(system.tropicalFactor) : 0.72;
    let organization = system && Number.isFinite(system.organization) ?
        radarClamp(system.organization) : 0.55;
    let intensity = simulatedLowerLevelIntensity(system);

    if(environmentalActivity!==undefined){
        // Keep most of the independently sampled/environmental signal so a
        // weak circulation can still be convectively vigorous, while making
        // the lower-level intensity a real contributor instead of a negative
        // term that quietly suppresses the strongest storms.
        return radarClamp(0.74*environmentalActivity+0.26*intensity);
    }

    // The fallback retains a positive weak-system allowance, but now grows
    // with the lower-level circulation so historical and hand-built
    // descriptors follow the same ordering as live descriptors.
    return radarClamp(
        0.28+0.38*tropical+0.12*organization+0.22*intensity
    );
}

// Resolve the lower-level intensity available to imagery descriptors. New
// environment descriptors carry `intensity`; otherwise prefer the live
// wind/pressure proxy when available, with the strength fallback keeping old
// saves and lightweight test fixtures usable.
function simulatedLowerLevelIntensity(system){
    if(system && Number.isFinite(system.intensity))
        return radarClamp(system.intensity);
    if(typeof coreCirculationIntensityProxy==='function' && system &&
        (Number.isFinite(system.windSpeed) || Number.isFinite(system.pressure)))
        return radarClamp(coreCirculationIntensityProxy(system));
    if(system && Number.isFinite(system.strength))
        return radarClamp(system.strength);
    return 0;
}

// The middle of an eyewall-replacement cycle is the simulated eye-opening
// window: the old wall is losing coherence before the new wall has closed.
// A failed replacement leaves a smaller residual opening after the cycle
// finishes. This is intentionally separate from eye visibility, since a clear
// mature eye is not itself a period of weakening convection.
function simulatedEyeOpeningFactor(system){
    if(system && Number.isFinite(system.eyeOpening))
        return radarClamp(system.eyeOpening);

    let phase = system && Number.isFinite(system.eyewallCycle) ?
        radarClamp(system.eyewallCycle) : 0;
    let formation = radarSmoothStep(0.12,0.48,phase);
    let closure = radarSmoothStep(0.68,0.98,phase);
    let cycleOpening = formation*(1-closure);
    let failure = system ? simulatedEyewallFailureLevel(system) : 0;
    return radarClamp(Math.max(cycleOpening,0.72*failure));
}

// The replacement eyewall can form well outside the original eye without
// turning the whole moat into clear sky. Keep the clear-eye expansion as a
// separate, bounded response derived from the opening signal and the live
// post-cycle memory. The wall geometry remains free to show a much stronger
// outer convective ring than this clear-area term allows.
function simulatedReplacementEyeExpansion(system){
    if(!system) return 0;
    let opening = simulatedEyeOpeningFactor(system);
    let cloudMemory = Number.isFinite(system.cloudEyeExpansion) ?
        radarClamp(system.cloudEyeExpansion) : 0;
    let replacementMemory = Number.isFinite(system.eyewallReplacementMemory) ?
        radarClamp(system.eyewallReplacementMemory) : 0;
    let memory = Math.max(cloudMemory,replacementMemory);
    let failure = simulatedEyewallFailureLevel(system);
    let activeExpansionMax = typeof EYEWALL_REPLACEMENT_ACTIVE_EXPANSION_MAX===
        'number' ? EYEWALL_REPLACEMENT_ACTIVE_EXPANSION_MAX : 0.46;
    return radarClamp(Math.max(
        memory,
        activeExpansionMax*0.74*opening,
        activeExpansionMax*0.66*failure
    ));
}

// Shared clear-eye coverage for the cloud, microwave, and polar products.
// `innerRadius` and `outerRadius` are already product-specific and normalized
// to the storm's RMW. The outer ring contributes a shallow warm moat signal,
// but it is deliberately capped so an outer eyewall is not misread as a giant
// clear eye. `cloudEyeExpansion` keeps the transition smooth after the cycle
// state returns to zero.
function simulatedReplacementEyeCoverage(system,radius,innerRadius,outerRadius,
    applyImageryScale=false,preparedState){
    let state = preparedState || simulatedCloudSystemState(system);
    if(!Number.isFinite(radius) || !Number.isFinite(innerRadius) ||
        innerRadius<=0) return 0;
    let expansion = state.replacementEyeExpansion;
    let imageryScale = applyImageryScale ?
        state.imageryEyeScale : 1;
    let visualInnerRadius = innerRadius*imageryScale;
    let visualOuterRadius = Number.isFinite(outerRadius) ?
        outerRadius*imageryScale : outerRadius;
    // The cloud renderer already carries a modest expansion in its product
    // scale; this shared geometric addition is intentionally smaller so the
    // two effects do not multiply into an oversized clear eye.
    let expandedInnerRadius = visualInnerRadius*(1+0.12*expansion);
    let innerMask = Math.exp(-Math.pow(radius/expandedInnerRadius,3.6));
    let innerWeight = Number.isFinite(system.eyewallInnerWeight) ?
        radarClamp(system.eyewallInnerWeight) : 1;
    let outerWeight = Number.isFinite(system.eyewallOuterWeight) ?
        radarClamp(system.eyewallOuterWeight) : 0;
    let opening = state.eyeOpening;
    let replacementVisualFactor = state.replacementVisualFactor;
    let outerContribution = 0;
    if(Number.isFinite(visualOuterRadius) && visualOuterRadius>0 &&
        replacementVisualFactor>0){
        let outerMask = Math.exp(-Math.pow(radius/visualOuterRadius,3.6));
        // The outer wall makes the moat warmer and more legible, but only a
        // fraction of its coverage is allowed to clear the center. This keeps
        // the active double-wall structure visible without a radius-sized eye.
        let outerClearWeight = outerWeight*(0.09+0.16*opening)*
            replacementVisualFactor;
        outerContribution = outerClearWeight*outerMask;
    }
    // Keep the inner subsidence signal available while the old wall weakens;
    // the radius expansion, rather than a collapsing weight, carries the
    // physical eye-opening cue.
    let innerAvailability = 0.84+0.16*innerWeight;
    return Math.min(1,innerAvailability*innerMask+outerContribution);
}

function simulatedConvectionStrength(system){
    let hasActivity = !!(system && (
        Number.isFinite(system.convectiveActivity) ||
        Number.isFinite(system.convectionActivity)
    ));
    let activity;
    if(hasActivity){
        activity = simulatedConvectiveActivity(system);
    }else if(system && Number.isFinite(system.convectionStrength)){
        // Historical descriptors sometimes contain only the already-combined
        // field. Give the lower-level intensity a modest share rather than
        // discarding it at this compatibility boundary.
        let intensity = simulatedLowerLevelIntensity(system);
        activity = radarClamp(0.74*radarClamp(system.convectionStrength)+
            0.26*intensity);
    }else{
        activity = simulatedConvectiveActivity(system);
    }
    let opening = simulatedEyeOpeningFactor(system);
    // Opening weakens the inner convective supply without deleting the outer
    // rain shield. The residual floor also prevents a failed wall from making
    // the imagery look like clear sky for one frame.
    // Eyewall replacement is primarily a structural cue. Keep most of the
    // deep-convective supply so the inner ring remains visible while the
    // forming outer/capping layer can still stand out.
    return radarClamp(activity*(1-0.22*opening));
}

function simulatedRadarReflectivity(u,x,y,z,baseScanMode){
    let moisture = u.field('moisture');
    let sst = u.field('SST');
    if(!Number.isFinite(moisture)) moisture = 0.5;
    if(!Number.isFinite(sst)) sst = 26;

    // A weak, broad background echo represents ordinary precipitation. The
    // SST term is deliberately modest so landfalling storms keep their rain.
    let moisturePotential = radarSmoothStep(0.42,0.82,moisture);
    let warmWaterPotential = radarSmoothStep(24,29,sst);
    // The scan should retain broad precipitation structure without turning
    // weak background echoes into isolated speckles. Use a larger texture
    // scale and a lower contribution for the base-scan product.
    let backgroundNoiseScale = baseScanMode ? 72 : 42;
    let backgroundNoise = radarEvolvingNoise(
        x/backgroundNoiseScale-z*(baseScanMode ? 0.002 : 0.003),
        y/backgroundNoiseScale,z,4.7
    );
    if(baseScanMode)
        // The background is also a lattice field. Limit its contrast so a
        // high-valued cell cannot show through as a fixed isolated spot.
        backgroundNoise = radarBaseScanTextureNoise(backgroundNoise,0.55);
    let background = moisturePotential *
        (baseScanMode ?
            SIMULATED_BASE_SCAN_BACKGROUND_BASE+
            SIMULATED_BASE_SCAN_BACKGROUND_VARIATION*
                radarSmoothStep(0.22,0.78,backgroundNoise) :
            0.32*radarSmoothStep(0.52,0.84,backgroundNoise)) *
        (0.75+0.25*warmWaterPotential);
    let result = radarClamp(background);

    for(let system of simulatedImagerySystems(u,z)){
        let centerX = system.x+Math.cos(system.shearAngle)*system.shearOffset;
        let centerY = system.y+Math.sin(system.shearAngle)*system.shearOffset;
        let dx = (x-centerX)/system.rmwX;
        let dy = (y-centerY)/system.rmwY;
        let radius = Math.hypot(dx,dy);
        if(radius>system.outerRadius*3) continue;
        let angle = Math.atan2(dy,dx);
        // Advect texture around the core; slower rotation outside the eyewall.
        // Screen-space y points south, so Northern Hemisphere cyclones (the
        // positive hemisphere value) need decreasing screen angles to appear
        // counter-clockwise geographically. The Southern Hemisphere reverses.
        // Bound differential twisting: total season age divided by radius
        // winds the texture into subpixel rings after thousands of ticks.
        // Match the outward winding of the band centerline below. In the
        // screen's south-positive Y frame NH bands wind clockwise outward
        // while their material rotates counter-clockwise with time. The same
        // normalized angle is also used by the SAR wind profile so its wall
        // peaks stay on the base-scan eyewall.
        let textureAngle = simulatedBaseScanTextureAngle(
            system,angle,radius,z
        );
        let tx = radius*Math.cos(textureAngle);
        let ty = radius*Math.sin(textureAngle);
        let broadNoise = radarEvolvingNoise(tx*0.85,ty*0.85,z,system.phase);
        let cellScale = baseScanMode ? SIMULATED_BASE_SCAN_CELL_SCALE : 3.2;
        let cellNoise = radarEvolvingNoise(
            tx*cellScale,ty*cellScale,
            z*(baseScanMode ? 0.65 : 1.5),system.phase+8.3
        );
        if(baseScanMode){
            // Keep the broad field readable, but prevent the same few lattice
            // cells from becoming much stronger than neighboring sectors.
            broadNoise = radarBaseScanTextureNoise(broadNoise,0.58);
            cellNoise = radarBaseScanTextureNoise(cellNoise,0.42);
        }

        // Strong, organized tropical systems get a dry eye. Landfall and
        // structural transition reduce this mask so the center fills back in
        // as the eyewall collapses inward.
        let eyeFillFactor = baseScanMode && Number.isFinite(system.eyeFillFactor) ?
            constrain(system.eyeFillFactor,0,1) : 0;
        let inwardCoreCompression = baseScanMode ?
            0.28*eyeFillFactor : 0;
        let eyeRadii = simulatedEyewallRadii(system,textureAngle,baseScanMode,z);
        let eyeRadius = eyeRadii.inner;
        let intensityLevel = simulatedIntensityLevel(system);
        if(baseScanMode){
            // The resolved inner wall is already a structural maximum. Do
            // not let texture noise create a second, fixed maximum on top of
            // it; fade the noise contrast only across the core and restore it
            // gradually in the outer rainband field.
            let coreTextureWidth = 0.42+0.12*intensityLevel+
                0.10*system.shearFactor;
            let coreTextureWeight = Math.exp(-0.5*Math.pow(
                (radius-eyeRadius)/coreTextureWidth,2
            ));
            let coreTextureDamp = 1-0.80*coreTextureWeight;
            broadNoise = radarBaseScanTextureNoise(
                broadNoise,0.58*coreTextureDamp
            );
            cellNoise = radarBaseScanTextureNoise(
                cellNoise,0.42*coreTextureDamp
            );
        }
        // Compress the existing inner structure toward the center. Expanding
        // the wall at the same time makes the collapsing eyewall overlap the
        // former eye instead of leaving a new, artificial central blob.
        let innerEyewallWeight = Number.isFinite(system.eyewallInnerWeight) ?
            system.eyewallInnerWeight : 1;
        let outerEyewallWeight = Number.isFinite(system.eyewallOuterWeight) ?
            system.eyewallOuterWeight : 0;
        let outerEyeShape = eyeRadii.outer;
        // Keep the dry eye compact so the broader eyewall, rather than a
        // large empty center, dominates the mature core.
        let eyeCoverage = simulatedReplacementEyeCoverage(
            system,
            radius,
            (0.58-0.06*intensityLevel)*eyeRadius,
            (0.61-0.05*intensityLevel)*outerEyeShape,
            true
        );
        let visibleEyeFactor = simulatedEyeVisibilityFactor(system);
        let replacementVisible = simulatedEyewallDoubleWallVisible(system);
        let eyeMask = 1-visibleEyeFactor*eyeCoverage;
        // Let the convective ring occupy more than a one-pixel filament at
        // every intensity, with stronger systems receiving a modest additional
        // width as their dense overcast expands.
        let wallWidth = (baseScanMode ? 0.28 : 0.23)+
                (baseScanMode ? 0.12 : 0.16)*broadNoise+
                0.08*intensityLevel+0.09*system.shearFactor;
        if(baseScanMode)
            wallWidth *= 1+0.9*eyeFillFactor;
        let outerWallWidth = simulatedReplacementOuterWallWidth(
            system,wallWidth,eyeRadius,outerEyeShape
        );
        let arcAngle = Math.atan2((y-system.y)/system.rmwY,
            (x-system.x)/system.rmwX);
        let wallContinuity = simulatedConvectiveArc(system,arcAngle);
        let innerEyewall = Math.exp(-0.5*Math.pow(
            (radius-eyeRadius)/wallWidth,2
        ));
        let outerEyewall = Math.exp(-0.5*Math.pow(
            (radius-outerEyeShape)/outerWallWidth,2
        ));
        let innerWallContinuity = simulatedEyewallWallContinuity(
            system,angle,0
        );
        let outerWallContinuity = simulatedEyewallWallContinuity(
            system,angle,1
        );
        let replacementContinuity = simulatedReplacementWallContinuity(
            system,angle,radius
        );
        let eyewall = system.eyewallFactor*(
            innerEyewallWeight*innerEyewall*innerWallContinuity+
            outerEyewallWeight*outerEyewall*outerWallContinuity
        )*wallContinuity*replacementContinuity;
        let outerEnvelope = Math.exp(-Math.pow(radius/system.outerRadius,1.55));

        // Build each rainband independently. Real tropical cyclones do not
        // have a single periodic ring pattern: arms differ in width,
        // intensity, reach, curvature, and continuity. A log-polar centerline
        // keeps the arms gently curved while the per-arm texture breaks them
        // into uneven segments.
        let bandSignal = 0;
        // Pull the existing inner rainbands inward as the core collapses. The
        // remapping fades out beyond the inner core, so the outer rain shield
        // is not unnaturally dragged into the center.
        let structureRadius = radius;
        if(baseScanMode && inwardCoreCompression>0){
            let innerCompressionMask = radarSmoothStep(2.2,0.25,radius);
            structureRadius = radius/
                (1-0.56*inwardCoreCompression*innerCompressionMask);
        }
        for(let band of system.bands){
            let bandAngle = band.phase-system.hemisphere*z*0.008+
                system.hemisphere*band.curvature*Math.log(structureRadius+0.35)+
                0.20*(broadNoise-0.5)+0.08*Math.sin(structureRadius*2.3+band.phase+z*0.015);
            let angularDelta = Math.atan2(
                Math.sin(angle-bandAngle),
                Math.cos(angle-bandAngle)
            );
            let width = band.width*(0.82+0.12*Math.min(structureRadius,3.5));
            let angularCore = Math.exp(-0.5*Math.pow(angularDelta/width,2));
            let radialOnset = radarSmoothStep(
                band.start,band.start+0.42+0.08*band.width,structureRadius
            );
            let reachWidth = 0.34+0.18*band.reach+0.16*system.shearFactor;
            let radialReach = Math.exp(-Math.pow(
                Math.max(0,structureRadius-band.reach)/reachWidth,2
            ));
            let segmentNoise = radarEvolvingNoise(
                tx*(baseScanMode ? 0.9 : 1.4)+band.phase,
                ty*(baseScanMode ? 0.9 : 1.4),
                z*(baseScanMode ? 0.75 : 1),band.phase*1.7
            );
            let segmentTexture = baseScanMode ?
                0.48+0.52*radarSmoothStep(0.25,0.75,segmentNoise) :
                0.12+0.88*radarSmoothStep(0.24,0.72,segmentNoise);
            let segmentWave = (baseScanMode ? 0.90 : 0.72)+
                (baseScanMode ? 0.10 : 0.28)*(0.5+0.5*Math.sin(
                structureRadius*4.4+angle*2+band.phase*7.3
            ));
            let arc = band.strength*angularCore*radialOnset*radialReach*
                segmentTexture*segmentWave;
            bandSignal = Math.max(bandSignal,arc);
        }
        bandSignal = radarClamp(bandSignal);
        // In the inner core the resolved eyewall should be the primary
        // microwave return. Letting a rainband peak and the eyewall stack at
        // the same radius is what produced the few saturated, repeatable
        // spots seen in the base-scan ring. Hand the band contribution back
        // in smoothly outside the eyewall so outer spiral structure remains.
        let innerCoreBandBlend = baseScanMode ?
            radarSmoothStep(0.95,1.85,radius) : 1;
        let rainbandSignal = bandSignal*innerCoreBandBlend;
        let rainbandPresence = Number.isFinite(system.rainbandPotential) ?
            radarClamp(system.rainbandPotential) : 0.58;
        let rainbands = (0.05+0.11*rainbandPresence)*outerEnvelope+
            (0.89+0.11*rainbandPresence)*
                Math.pow(rainbandSignal,system.bandPower*0.72);

        // A weak tropical cyclone can still have precipitation through the
        // center. It should lose coherent spiral arms before it develops a
        // clear eye. The annular eyewall/rainband terms above intentionally
        // vanish at radius zero, so add a diffuse, cell-textured inner core
        // only while the lower-level structure is immature. This is limited
        // to the base scan; it does not alter the wind field or the mature
        // eye/replacement geometry.
        let lowerCoreMaturity = Number.isFinite(system.eyewallFactor) ?
            radarClamp(system.eyewallFactor) : 0;
        if(Number.isFinite(system.eyeFactor))
            lowerCoreMaturity = Math.max(lowerCoreMaturity,
                0.82*radarClamp(system.eyeFactor));
        let tropicalCoreSupport = Number.isFinite(system.tropicalFactor) ?
            radarClamp(system.tropicalFactor) : 1;
        let isTropicalSystem = typeof TROP!=='undefined' &&
            system.type===TROP;
        // Once a system is classified as tropical, retain a precipitation
        // signal even if its warm-core/organization proxy is temporarily
        // depressed. Disturbances and lows still depend on that proxy and
        // can therefore occasionally remain hollow.
        let tropicalCoreGate = isTropicalSystem ? 1 :
            radarSmoothStep(0.18,0.72,tropicalCoreSupport);
        let coreSeed = Number.isFinite(system.visualSeed) ?
            system.visualSeed : Number.isFinite(system.phase) ? system.phase : 0;
        let coreAvailabilityNoise = 0.5+0.5*Math.sin(
            coreSeed*2.17+system.phase*0.43+1.1
        );
        let weakCoreAvailability = 0.78+0.22*coreAvailabilityNoise;
        let weakCoreActivity = baseScanMode ?
            0.38+0.62*simulatedConvectionStrength(system) : 0;
        // A small fraction of poorly organized disturbances/low-pressure
        // centers can have a genuine central lull. Keep this deterministic so
        // playback does not flicker, and keep classified tropical storms out
        // of this near-empty branch.
        if(!isTropicalSystem && weakCoreActivity<0.62 &&
            lowerCoreMaturity<0.25 && coreAvailabilityNoise<0.12)
            weakCoreAvailability = 0.12;
        let weakCorePotential = baseScanMode ?
            tropicalCoreGate*(1-radarSmoothStep(0.12,0.62,lowerCoreMaturity)) *
            weakCoreAvailability : 0;
        let weakCoreRadius = 1.02+0.42*weakCorePotential+
            0.12*system.shearFactor;
        let weakCoreEnvelope = Math.exp(-Math.pow(
            radius/weakCoreRadius,1.75
        ));
        let weakCoreTexture = 0.72+0.28*radarSmoothStep(
            0.24,0.76,0.64*broadNoise+0.36*cellNoise
        );
        let weakCorePrecipitation = weakCorePotential*
            (0.65+0.35*tropicalCoreSupport)*weakCoreActivity*
            weakCoreEnvelope*weakCoreTexture;

        // A transitioning or extratropical cyclone should look more like a
        // broad frontal/comma-shaped precipitation shield than an eyewall.
        let frontSignal = 0.38+0.62*Math.max(0,Math.cos(angle-system.frontAngle));
        let frontalEnvelope = Math.exp(-Math.pow(
            (radius-(1.55+0.45*system.frontalFactor))/
            (1.0+0.55*system.frontalFactor+0.45*system.landSuppression),2
        ));
        let frontalBands = frontalEnvelope*frontSignal*
            (0.55+0.45*bandSignal);
        // Loss of ocean heat supply erodes organized convection, but does not
        // create a front. Outer tropical rain survives a decaying inner core.
        let landTropicalFactor = system.tropicalFactor;
        let rainPersistence = 1-0.35*system.landSuppression;
        let landFrontalFactor = radarClamp(system.frontalFactor);
        let lowerLayerCoreWeight = isTropicalSystem ?
            0.72+0.28*tropicalCoreSupport : tropicalCoreSupport;
        let lowerLayerCoreEcho = baseScanMode ?
            1.25*weakCorePrecipitation*lowerLayerCoreWeight*rainPersistence : 0;

        // Shear shifts and strengthens the downshear side while retaining a
        // recognizable circulation on the upshear side.
        let downshear = Math.max(0,Math.cos(angle-system.shearAngle));
        let asymmetry = 1-0.20*system.shearFactor+
            0.42*system.shearFactor*downshear;
        let localTexture = baseScanMode ?
            0.84+0.16*broadNoise+0.02*cellNoise :
            0.58+0.52*broadNoise+0.24*cellNoise;
        // Embedded convective peaks follow existing rain, while the drier
        // upshear sector opens gaps instead of adding uniform speckle.
        let cells = radarSmoothStep(
            baseScanMode ? 0.54 : 0.57,
            baseScanMode ? 0.74 : 0.86,
            cellNoise
        )*
            Math.max(eyewall,rainbandSignal,0.35*frontalBands);
        let drySlot = 1-(0.25+0.50*system.shearFactor)*
            (1-wallContinuity)*
            radarSmoothStep(1,2.8,radius);
        let echoStrength = baseScanMode && Number.isFinite(system.baseScanStrength) ?
            system.baseScanStrength : Number.isFinite(system.strength) ?
                system.strength : 0;
        // Hand-built and historical descriptors may carry the raw pressure /
        // wind intensity without the newer `baseScanStrength` field. Let that
        // extended signal participate in the lower-level product too, while
        // retaining the environment-shaped value when it is available.
        if(baseScanMode && Number.isFinite(system.intensity))
            echoStrength = Math.max(echoStrength,system.intensity);
        // When a live descriptor carries the separate convection state, let
        // it contribute directly to the precipitation signal. The circulation
        // strength remains part of the mix, but no longer forces a weak storm
        // to have a weak echo. During eye opening this term is reduced by
        // simulatedConvectionStrength(), while the broad outer shield survives.
        let hasConvectiveState = Number.isFinite(system.convectiveActivity) ||
            Number.isFinite(system.convectionActivity) ||
            Number.isFinite(system.convectionStrength) ||
            Number.isFinite(system.eyeOpening);
        if(hasConvectiveState){
            let convectiveEcho = 0.15+0.85*simulatedConvectionStrength(system);
            let tropicalWeight = Number.isFinite(system.tropicalFactor) ?
                radarClamp(system.tropicalFactor) : 1;
            // Base scan is a lower-tropospheric precipitation/wind proxy.
            // Keep convection in the product, but let the circulation signal
            // carry more weight as intensity rises so a strong cyclone does
            // not render like a weak storm with unusually active cells.
            let circulationWeight = baseScanMode ?
                0.58+0.30*Math.pow(intensityLevel,0.75) : 0.44;
            echoStrength = Math.max(0,
                circulationWeight*echoStrength+
                (1-circulationWeight)*convectiveEcho*
                    (0.65+0.35*tropicalWeight)
            );
        }
        let echo = echoStrength*asymmetry*eyeMask*localTexture*drySlot*(
            landTropicalFactor*(0.90*eyewall+
                (baseScanMode ? 0.26 : 0.55)*rainbands*rainPersistence+
                (baseScanMode ? 1.05*weakCorePrecipitation : 0))+
            lowerLayerCoreEcho+
            landFrontalFactor*(0.62*frontalBands+0.16*outerEnvelope*frontSignal)+
            (0.08+0.10*landFrontalFactor)*outerEnvelope*(0.35+0.65*rainbandSignal)+
            (baseScanMode ?
                SIMULATED_BASE_SCAN_CELL_WEIGHT*
                    (0.10+0.90*innerCoreBandBlend) : 0.48)*cells
        );
        echo = baseScanMode ? radarBaseScanToneMap(echo) : radarClamp(echo);

        // The ordinary rainband field is intentionally broad, which can hide
        // an eyewall replacement in a low-resolution base scan. Give the
        // microwave view a stronger structural cue: a dry moat between the
        // decaying inner wall and the forming outer wall, plus a narrow,
        // bright outer ring. This is limited to the base scan so the cloud
        // view keeps its softer, more meteorological appearance.
        let replacementVisualFactor = replacementVisible ? Math.max(
            simulatedEyewallReplacementVisualFactor(system),
            simulatedEyewallFailureLevel(system)
        ) : 0;
        if(baseScanMode && replacementVisualFactor>0.001 &&
            outerEyewallWeight>0.04){
            let replacementSupport = Number.isFinite(system.rainbandActivity) ?
                radarClamp(system.rainbandActivity) : rainbandPresence;
            // Keep an extended intensity tail here instead of clamping the
            // whole transition to the same C5-strength ring. The final tone
            // map remains bounded, but deep systems retain more contrast.
            let replacementStrength = radarBaseScanToneMap(
                echoStrength*system.eyewallFactor*outerEyewallWeight*
                    (1.35+0.45*replacementSupport)*replacementVisualFactor
            );
            let replacementMoat = simulatedReplacementMoat(radius,eyeRadius,outerEyeShape);
            let replacementOuterWall = Math.exp(-0.5*Math.pow(
                (radius-outerEyeShape)/(outerWallWidth*0.90),2
            ));
            // Keep the moat narrow and shallow: it should separate the two
            // walls without erasing the surrounding convective ring.
            echo *= 1-0.72*replacementStrength*replacementMoat;
            echo += replacementStrength*0.48*replacementOuterWall*
                (0.78+0.22*wallContinuity);
            echo = radarBaseScanToneMap(echo);
        }

        // Landfall wears away the lower/core precipitation structure from the
        // landward side. This creates a soft, irregular break in the circular
        // base-scan ring while keeping the outer rain shield visible over the
        // ocean. The abrasion profile is sampled from the actual coastline in
        // Environment.getBaseScanSystems and uses the same gradual collapse
        // severity as the center structure.
        if(baseScanMode){
            let abrasionAngle = Math.atan2(
                (y-system.y)/system.rmwY,
                (x-system.x)/system.rmwX
            );
            let abrasion = simulatedLandAbrasionAtAngle(system,abrasionAngle);
            if(abrasion>0.01){
                let abrasionRadius = Math.hypot(
                    (x-system.x)/system.rmwX,
                    (y-system.y)/system.rmwY
                );
                let ringWear = Math.exp(-0.5*Math.pow(
                    (abrasionRadius-(1.02+0.12*system.landSuppression))/
                    (0.42+0.16*system.landSuppression),2
                ));
                let coreWear = Math.exp(-Math.pow(
                    abrasionRadius/(1.45+0.35*system.landSuppression),2
                ));
                let radialWear = Math.max(ringWear,0.48*coreWear);
                let breakPattern = 0.70+0.30*(0.5+0.5*Math.sin(
                    4*abrasionAngle+system.phase*1.7
                ));
                let wear = radarClamp(abrasion*radialWear*breakPattern);
                // Friction disrupts the wall preferentially. Precipitation is
                // not a surface-wind retrieval and must not vanish over land.
                echo *= 1-0.58*wear;
            }
        }

        // Soft maximum: overlapping storms reinforce one another without
        // producing unbounded values from simple addition.
        result = 1-(1-result)*(1-echo);
    }
    // A soft floor removes tiny, isolated returns while preserving the
    // continuous outer shield. This is applied to every base-scan system,
    // not only the strongest tropical cyclones.
    if(baseScanMode)
        result = radarSmoothStep(
            SIMULATED_BASE_SCAN_DENOISE_LOW,
            SIMULATED_BASE_SCAN_DENOISE_HIGH,
            result
        );
    return radarClamp(result);
}

// Estimate the part of the precipitation column that contains enough frozen
// hydrometeor mass to affect an 85-89 GHz-like observation. Liquid rain can
// occupy a broad shield, but the strongest ice-scattering signal is localized
// to the organized inner core and any resolved replacement eyewall.
function simulatedBaseScanDeepIceSignal(u,x,y,z,echo){
    let systems = typeof simulatedImagerySystems==='function' ?
        simulatedImagerySystems(u,z) : [];
    let result = 0;
    for(let system of systems){
        if(!system || !Number.isFinite(system.x) ||
            !Number.isFinite(system.y)) continue;
        let rmwX = Number.isFinite(system.rmwX) ? Math.max(0.5,system.rmwX) : 1;
        let rmwY = Number.isFinite(system.rmwY) ? Math.max(0.5,system.rmwY) : 1;
        let shearAngle = Number.isFinite(system.shearAngle) ?
            system.shearAngle : 0;
        let shearOffset = Number.isFinite(system.shearOffset) ?
            system.shearOffset : 0;
        let centerX = system.x+Math.cos(shearAngle)*shearOffset;
        let centerY = system.y+Math.sin(shearAngle)*shearOffset;
        let dx = (x-centerX)/rmwX;
        let dy = (y-centerY)/rmwY;
        let radius = Math.hypot(dx,dy);
        let outerRadius = Number.isFinite(system.outerRadius) ?
            system.outerRadius : 4;
        if(radius>outerRadius*2.6) continue;

        let angle = Math.atan2(dy,dx);
        let radii = typeof simulatedEyewallRadii==='function' ?
            simulatedEyewallRadii(system,angle,true,z) :
            {inner:1,outer:1.55};
        let innerRadius = Number.isFinite(radii.inner) ?
            Math.max(0.25,radii.inner) : 1;
        let replacementRadius = Number.isFinite(radii.outer) ?
            Math.max(innerRadius+0.08,radii.outer) : 1.55;
        let shear = Number.isFinite(system.shearFactor) ?
            radarClamp(system.shearFactor) : 0;
        // A deep-ice ring is a resolved eyewall signal, not a default
        // property of every tropical disturbance. Keep the inner wall and
        // annular deep-core term suppressed until the lower-level structure
        // has actually organized; weak storms still receive a broad,
        // center-filled shallow-convection signal below.
        let eyewallMaturity = Number.isFinite(system.eyewallFactor) ?
            radarClamp(system.eyewallFactor) : 0;
        let eyeMaturity = Number.isFinite(system.eyeFactor) ?
            radarClamp(system.eyeFactor) : 0;
        let resolvedCore = radarSmoothStep(0.08,0.44,
            Math.max(eyewallMaturity,0.82*eyeMaturity));
        let wallWidth = 0.24+0.10*shear;
        let innerWall = Math.exp(-0.5*Math.pow(
            (radius-innerRadius)/wallWidth,2
        ));
        let outerWeight = Number.isFinite(system.eyewallOuterWeight) ?
            radarClamp(system.eyewallOuterWeight) : 0;
        let outerWall = Math.exp(-0.5*Math.pow(
            (radius-replacementRadius)/(0.30+0.12*shear),2
        ));
        // Deep towers remain possible inside a partially open eye, but their
        // contribution is weaker away from the resolved eyewall structure.
        let deepCore = Math.exp(-0.5*Math.pow(
            (radius-0.72*innerRadius)/(0.62+0.16*shear),2
        ));
        let diffuseCore = Math.exp(-0.5*Math.pow(
            radius/(0.86+0.18*shear),2
        ));
        deepCore = (1-resolvedCore)*diffuseCore+
            resolvedCore*deepCore;
        let structure = Math.max(
            resolvedCore*innerWall,
            outerWeight*outerWall,
            0.34*deepCore
        );

        // Use the same deep-convective signal as the cloud-top renderer so a
        // strong lower-level circulation also contributes to the ice column;
        // otherwise the base scan and IR-BD products can disagree about the
        // amount of extreme convection in the same eyewall.
        let convection = typeof simulatedConvectionStrength==='function' ?
            simulatedConvectionStrength(system) :
            Number.isFinite(system.convectionStrength) ?
                radarClamp(system.convectionStrength) :
                Number.isFinite(system.convectiveActivity) ?
                    radarClamp(system.convectiveActivity) : 0.35;
        let intensity = typeof simulatedIntensityLevel==='function' ?
            simulatedIntensityLevel(system) :
            Number.isFinite(system.intensity) ? radarClamp(system.intensity) :
                Number.isFinite(system.strength) ? radarClamp(system.strength) : 0;
        let organization = Number.isFinite(system.organization) ?
            radarClamp(system.organization) :
            radarClamp(0.35+0.65*radarClamp(system.eyewallFactor || 0));
        let tropical = Number.isFinite(system.tropicalFactor) ?
            radarClamp(system.tropicalFactor) : 0.7;
        // These factors stand in for the column-integrated ice water path:
        // deep, intense, organized tropical convection produces much more
        // scattering than a shallow or weak rainband.
        let columnPotential = radarClamp(
            (0.15+0.85*convection)*
            (0.25+0.75*intensity)*
            (0.35+0.65*organization)*
            (0.40+0.60*tropical)
        );
        let systemSignal = columnPotential*(0.22+0.78*structure);
        result = 1-(1-result)*(1-radarClamp(systemSignal));
    }
    // A clear eye or quiet ocean should not inherit an ice signal merely
    // because a storm exists nearby; precipitation gates the scattering.
    return radarClamp(result*radarSmoothStep(0.10,0.52,echo));
}

// Weak storms need a visible lower-level wetness cue even when their liquid
// emission and shallow ice terms nearly cancel. Keep that extra contrast out
// of a mature eye/eyewall, where the ordinary brightness-temperature model
// must preserve the low-return center and separated walls.
function simulatedBaseScanWeakCoreWeight(u,x,y,z){
    let systems = typeof simulatedImagerySystems==='function' ?
        simulatedImagerySystems(u,z) : [];
    let result = 0;
    for(let system of systems){
        if(!system || !Number.isFinite(system.x) ||
            !Number.isFinite(system.y)) continue;
        let maturity = Number.isFinite(system.eyewallFactor) ?
            radarClamp(system.eyewallFactor) : 0;
        if(Number.isFinite(system.eyeFactor))
            maturity = Math.max(maturity,0.82*radarClamp(system.eyeFactor));
        let weak = 1-radarSmoothStep(0.12,0.62,maturity);
        if(weak<=0) continue;

        let rmwX = Number.isFinite(system.rmwX) ? Math.max(0.5,system.rmwX) : 1;
        let rmwY = Number.isFinite(system.rmwY) ? Math.max(0.5,system.rmwY) : 1;
        let shearAngle = Number.isFinite(system.shearAngle) ? system.shearAngle : 0;
        let shearOffset = Number.isFinite(system.shearOffset) ? system.shearOffset : 0;
        let centerX = system.x+Math.cos(shearAngle)*shearOffset;
        let centerY = system.y+Math.sin(shearAngle)*shearOffset;
        let radius = Math.hypot((x-centerX)/rmwX,(y-centerY)/rmwY);
        let shear = Number.isFinite(system.shearFactor) ?
            radarClamp(system.shearFactor) : 0;
        let tropical = Number.isFinite(system.tropicalFactor) ?
            radarClamp(system.tropicalFactor) : 1;
        let isTropicalSystem = typeof TROP!=='undefined' &&
            system.type===TROP;
        let tropicalGate = isTropicalSystem ? 1 :
            radarSmoothStep(0.18,0.72,tropical);
        let coreRadius = 1.02+0.42*weak+0.12*shear;
        let envelope = Math.exp(-Math.pow(radius/coreRadius,1.75));
        let activity = Number.isFinite(system.convectionStrength) ?
            radarClamp(system.convectionStrength) :
            typeof simulatedConvectionStrength==='function' ?
                simulatedConvectionStrength(system) : 0.5;
        let weight = weak*tropicalGate*envelope*(0.65+0.35*activity);
        result = 1-(1-result)*(1-radarClamp(weight));
    }
    return radarClamp(result);
}

function simulatedBaseScanBrightnessTemperature(u,x,y,z){
    let echo = radarClamp(simulatedRadarReflectivity(u,x,y,z,true));
    let moisture = u.field('moisture');
    let sst = u.field('SST');
    if(!Number.isFinite(moisture)) moisture = 0.5;
    if(!Number.isFinite(sst)) sst = 26;

    let moisturePotential = radarSmoothStep(0.30,0.84,moisture);
    let warmWaterPotential = radarSmoothStep(23,30,sst);
    // Approximate the clear-sky ocean background of an 85-89 GHz-like
    // window channel. SST and atmospheric moisture shift the baseline, so a
    // single fixed 300 K background is not used for every basin and season.
    let clearSky = SIMULATED_BASE_SCAN_CLEAR_BT_BASE+
        SIMULATED_BASE_SCAN_CLEAR_BT_WARM_WATER*warmWaterPotential+
        SIMULATED_BASE_SCAN_CLEAR_BT_MOISTURE*moisturePotential;
    // Liquid rain/cloud water increases emission before deep ice scattering
    // becomes dominant. This non-monotonic response is the main physical
    // difference from the old reflectivity-to-temperature inversion.
    let liquidSignal = radarSmoothStep(0.08,0.78,echo);
    let liquidEmission = SIMULATED_BASE_SCAN_LIQUID_EMISSION_MAX*
        Math.pow(liquidSignal,0.72)*(0.55+0.45*moisturePotential);
    let weakCoreWarmWeight = simulatedBaseScanWeakCoreWeight(u,x,y,z);
    let liquidEchoContrast = SIMULATED_BASE_SCAN_LIQUID_ECHO_CONTRAST*
        weakCoreWarmWeight*
        Math.pow(radarSmoothStep(0.035,0.34,echo),0.80)*
        (0.55+0.45*moisturePotential);
    let iceSignal = simulatedBaseScanDeepIceSignal(u,x,y,z,echo);
    let iceScattering = SIMULATED_BASE_SCAN_ICE_SCATTERING_MAX*
        Math.pow(iceSignal,0.86);
    let temperature = clearSky+liquidEmission+liquidEchoContrast-
        iceScattering;
    return constrain(
        temperature,SIMULATED_BASE_SCAN_BT_MIN,SIMULATED_BASE_SCAN_BT_MAX
    );
}

ENV_DEFS.defaults.baseScan = {
    displayName: 'Simulated base scan brightness temperature',
    version: 0,
    mapFunc: simulatedBaseScanBrightnessTemperature,
    displayFormat: v=>round(v) + ' K brightness temperature',
    legend: {
        type: 'gradient',
        range: [SIMULATED_BASE_SCAN_BT_MIN,SIMULATED_BASE_SCAN_BT_MAX],
        ticks: [100,120,140,160,180,210,240,270,300],
        labels: ['100 K','120 K','140 K','160 K','180 K','210 K','240 K','270 K','300 K']
    },
    hueMap: simulatedBaseScanColor,
    oceanic: false,
    renderResolution: 4,
    smoothRaster: true,
    pixelatedRaster: false,
    noWobble: true
};
if(ENABLE_SIMULATED_BASE_SCAN_LAYER){
    ENV_DEFS[SIM_MODE_NORMAL].baseScan = {};
    ENV_DEFS[SIM_MODE_HYPER].baseScan = {};
    ENV_DEFS[SIM_MODE_WILD].baseScan = {};
    ENV_DEFS[SIM_MODE_MEGABLOBS].baseScan = {};
    ENV_DEFS[SIM_MODE_EXPERIMENTAL].baseScan = {};
    ENV_DEFS[SIM_MODE_SPOOKY].baseScan = {};
}

// A synthetic infrared brightness-temperature proxy, not a recolored base scan
// field: thin outer cloud and non-precipitating cloud extend beyond rainbands.
// Positive temperatures represent clear sky or shallow cloud.
// Keep a short cold tail below -85 C so the BD product can distinguish VCDG
// from the even colder ECDG category instead of flattening both at one floor.
// The warm end is deliberately shared with the IR-BD product. A clear eye is
// a surface-window measurement, so it must follow warm SSTs instead of being
// capped at the old +20/+25 C display targets.
const SIMULATED_CLOUD_BT_MIN = -100;
const SIMULATED_CLOUD_BT_MAX = 50;
const SIMULATED_CLOUD_CLEAR_BT_MIN = -2;
const SIMULATED_CLOUD_CLEAR_BT_MAX = SIMULATED_CLOUD_BT_MAX;
// This is an observational calibration for the satellite eye-brightness
// product, not a wind-speed threshold. The warmest reported eye brightness
// temperatures cluster near 28 C; the target below still cannot exceed the
// local SST-based radiative ceiling.
const SIMULATED_EYE_BT_OBSERVED_CEILING = 28;
const SIMULATED_EYE_BT_SURFACE_MARGIN = 0.2;

function simulatedCloudEyeScale(system){
    // Stable per-storm variation: rendering and tab switching never draw RNG.
    let phase = Number.isFinite(system.phase) ? system.phase : 0;
    let seed = Math.sin(phase*127.1+78.233)*43758.5453;
    let variation = seed-Math.floor(seed);
    // Use the shared replacement response so the ordinary cloud image and
    // the higher-resolution polar product retain the same post-cycle size.
    let expansion = simulatedReplacementEyeExpansion(system);
    return (0.54+0.18*variation)*
        simulatedEyeTypeRadiusFactor(system)*
        simulatedImageryEyeScale(system)*(1+0.25*expansion);
}

// Dvorak-inspired scene synthesis, not an intensity retrieval. Wind anchors
// the scene class; pressure is deliberately not assigned a basin-specific
// cloud style. Temperature targets are illustrative, not the Dvorak table.
function simulatedDvorakScene(system){
    let wind = Number.isFinite(system.windSpeed) ? system.windSpeed :
        25+140*simulatedIntensityLevel(system);
    let anchors = [[65,4],[77,4.5],[90,5],[102,5.5],[115,6],
        [127,6.5],[140,7],[155,7.5],[170,8]];
    let t = 4;
    for(let i=1;i<anchors.length;i++){
        let a = anchors[i-1], b = anchors[i];
        if(wind>=a[0]) t = a[1]+(b[1]-a[1])*
            constrain((wind-a[0])/(b[0]-a[0]),0,1);
    }
    let maturity = radarSmoothStep(4.5,7.5,t);
    let integrity = (1-0.85*radarClamp(system.eyeFillFactor || 0))*
        (1-0.85*simulatedEyewallFailureLevel(system))*
        (1-0.80*radarClamp(system.landSuppression || 0));
    let tropical = Number.isFinite(system.tropicalFactor) ?
        radarSmoothStep(0.35,0.85,system.tropicalFactor) : 1;
    let eyeReadiness = radarSmoothStep(5,8,t)*integrity*tropical;
    return {
        maturity:maturity*integrity*tropical,
        // Let canopy organization develop across the full hurricane range,
        // independently of the later, sharper transition to a resolved eye.
        canopy:radarSmoothStep(3.5,8,t)*integrity*tropical,
        // This is a continuous structural readiness factor, not an absolute
        // temperature and not a special wind-speed threshold. The absolute
        // eye brightness temperature is derived from local SST in
        // simulatedEyeTemperatureTarget().
        eyeReadiness,
        ringTemperature:-62-20*radarSmoothStep(4.5,8,t)
    };
}

function simulatedEyeTemperatureTarget(system,clearTemperature,preparedState){
    let clear = Number.isFinite(clearTemperature) ? clearTemperature : 25;
    let scene = preparedState ? preparedState.dvorak :
        simulatedDvorakScene(system);
    let eyeReadiness = Number.isFinite(scene.eyeReadiness) ?
        radarClamp(scene.eyeReadiness) : 0;
    let minimum = typeof SIMULATED_CLOUD_CLEAR_BT_MIN==='number' ?
        SIMULATED_CLOUD_CLEAR_BT_MIN : -2;
    // The clear-sky proxy is SST-1 C in this model. Recover that surface
    // reference, then keep the satellite eye brightness temperature just below
    // it. This prevents a very warm synthetic ocean from producing an
    // implausibly hot eye while retaining the observed warm-eye ceiling.
    let inferredSst = clear+1;
    let radiativeCeiling = Math.min(
        SIMULATED_EYE_BT_OBSERVED_CEILING,
        inferredSst-SIMULATED_EYE_BT_SURFACE_MARGIN
    );
    // A partially resolved eye starts at the local clear-sky baseline and
    // approaches the ceiling continuously as its eye structure matures.
    let baseline = Math.min(clear,radiativeCeiling);
    let target = baseline+Math.max(0,radiativeCeiling-baseline)*eyeReadiness;
    return Math.max(minimum,Math.min(
        SIMULATED_EYE_BT_OBSERVED_CEILING,target
    ));
}

function simulatedCloudTemperature(u,x,y,z){
    let moisture = u.field('moisture');
    let sst = u.field('SST');
    if(!Number.isFinite(moisture)) moisture = 0.5;
    if(!Number.isFinite(sst)) sst = 26;
    // Background cloud uses two scales. A single x/65 noise field created the
    // huge smooth lobes that dominated imagery whenever the cyclone-relative
    // sample was misplaced or weak.
    let backgroundBroad = radarEvolvingNoise(
        x/52-z*0.003,y/52+z*0.002,z,2.4
    );
    let backgroundCells = radarEvolvingNoise(
        x/13+z*0.006,y/13-z*0.004,z,11.7
    );
    let backgroundTexture = 0.70*backgroundBroad+0.30*backgroundCells;
    let backgroundCloud = radarSmoothStep(0.38,0.85,moisture)*
        radarSmoothStep(0.34,0.76,backgroundTexture);
    // A bounded surface-window proxy follows local SST in every basin.
    // It is not a calibrated radiative-transfer retrieval. The upper bound
    // is the sensor palette, not a tropical-climate or eye-temperature cap.
    let clearTemperature = constrain(
        sst-1,SIMULATED_CLOUD_CLEAR_BT_MIN,SIMULATED_CLOUD_CLEAR_BT_MAX
    );
    let temperature = clearTemperature-42*backgroundCloud;
    let systems = simulatedImagerySystems(u,z);
    let preparedSystems;
    if(u && u.simulatedCloudPreparedSystemsSource===systems &&
        u.simulatedCloudPreparedSystemsTick===z){
        preparedSystems = u.simulatedCloudPreparedSystems;
    }else{
        preparedSystems = [];
        for(let system of systems) preparedSystems.push({
            system,
            state:simulatedCloudSystemState(system)
        });
        if(u){
            u.simulatedCloudPreparedSystems = preparedSystems;
            u.simulatedCloudPreparedSystemsSource = systems;
            u.simulatedCloudPreparedSystemsTick = z;
        }
    }
    for(let prepared of preparedSystems){
        let system = prepared.system;
        let systemState = prepared.state;
        let shift = system.shearOffset*1.8;
        let dx = (x-system.x-Math.cos(system.shearAngle)*shift)/system.rmwX;
        let dy = (y-system.y-Math.sin(system.shearAngle)*shift)/system.rmwY;
        let radius = Math.hypot(dx,dy);
        if(radius>system.outerRadius*4) continue;
        let angle = Math.atan2(dy,dx);
        let hemisphere = system.hemisphere<0 ? -1 : 1;
        // Sample noise in a logarithmically wound storm-relative frame. This
        // produces advecting cloud cells and spiral filaments rather than
        // decorating a circular Gaussian with a small amount of noise.
        // The inverse texture lookup must subtract the outward band twist.
        // Adding it made cloud filaments spiral opposite to the rainbands.
        let spiralAngle = angle+hemisphere*(
            -0.72*Math.log(radius+0.38)+z*0.016+
            0.45*Math.sin(z*0.016)/(1+radius*0.16)
        );
        let tx = radius*Math.cos(spiralAngle);
        let ty = radius*Math.sin(spiralAngle);
        let broad = radarEvolvingNoise(tx*0.95,ty*0.95,z,system.phase);
        let cells = radarEvolvingNoise(tx*3.6,ty*3.6,z,system.phase+8.3);
        let fine = radarEvolvingNoise(tx*6.2,ty*6.2,z,system.phase+17.1);
        // Fine noise is intentionally a small accent. Real BD imagery groups
        // cold pixels into cloud cells instead of producing uniform speckle.
        let detail = 0.50*broad+0.42*cells+0.08*fine;
        let cellCoverage = 0.40+0.60*radarSmoothStep(0.22,0.78,detail);
        let arcAngle = Math.atan2((y-system.y)/system.rmwY,
            (x-system.x)/system.rmwX);
        let dvorak = systemState.dvorak;
        let convectiveArc = simulatedConvectiveArc(system,arcAngle,systemState);
        let ringSectorShape = simulatedConvectiveRingSector(
            system,arcAngle,systemState
        );
        // Organized intense storms retain a rounded canopy even though
        // individual towers inside it have different temperatures. Damage
        // already reduces scene maturity, allowing distorted weaker cores.
        let coreRoundness = systemState.coreRoundness;
        let shieldRadius = systemState.shieldRadius;
        let downshear = Math.cos(angle-system.shearAngle);
        let outerMask = radarSmoothStep(1.3,3.5,radius);
        let lobes = 0.11*Math.sin(2*spiralAngle+system.phase)+
            0.07*Math.sin(3*spiralAngle-system.phase+radius*0.55);
        let edgeShape = 1+(1-0.97*coreRoundness)*(
            0.16*(broad-0.5)+outerMask*lobes+
            0.20*system.shearFactor*downshear);
        let arms = 0;
        for(let band of system.bands){
            let delta = angle-band.phase+system.hemisphere*z*0.008-
                system.hemisphere*band.curvature*Math.log(radius+0.35);
            let wrapped = Math.atan2(Math.sin(delta),Math.cos(delta));
            let onset = radarSmoothStep(band.start || 0.85,(band.start || 0.85)+0.6,radius);
            let segments = 0.44+0.56*radarEvolvingNoise(
                tx*2.4+band.phase,ty*2.4,z,band.phase*1.7);
            arms = Math.max(arms,Math.exp(-0.5*Math.pow(wrapped/(band.width*1.65),2))*
                Math.exp(-Math.pow(radius/(band.reach*1.8),2))*onset*
                (0.55+0.45*band.strength)*segments);
        }
        // Permit protrusions only where a modeled spiral band joins the
        // outer CDO. Do not use free-standing noise lobes for a mature core.
        let bandAttachment = radarSmoothStep(0.08,0.42,arms)*
            radarSmoothStep(1.7,2.8,radius);
        edgeShape += 0.07*coreRoundness*bandAttachment;
        let shapedRadius = radius/Math.max(0.62,edgeShape);
        let shield = Math.exp(-Math.pow(shapedRadius/shieldRadius,1.75));
        let comma = 0.48+0.52*Math.max(0,Math.cos(angle-system.frontAngle-radius*0.12));
        let eyewallMaturity = systemState.eyewallMaturity;
        // Use one continuous structural scale for every intensity level. The
        // eye/eyewall signal still gates mature annular convection, but the
        // broad cloud canopy and its texture now respond to weaker systems as
        // well instead of changing mainly at the top end.
        let intensityLevel = systemState.intensityLevel;
        let eyeOpening = systemState.eyeOpening;
        let convectiveStrength = systemState.convectiveStrength;
        // The CDO envelope still scales with physical RMW, but the envelope is
        // populated by cloud cells instead of acting as a filled radial disk.
        let coreRadius = systemState.coreRadius;
        let coreEnvelope = Math.exp(-Math.pow(shapedRadius/coreRadius,2));
        let coreCells = coreEnvelope*(0.38+0.62*cellCoverage);
        // Outside the CDO, cloud follows individual spiral bands. A uniform
        // Gaussian canopy here hides all band gaps and paints a circular disk.
        // Keep interband gaps outside the organized CDO instead of cutting
        // scallops into its perimeter. The shared inner arc stays separate.
        let bandRegion = radarSmoothStep(coreRadius*(0.65+0.20*coreRoundness),
            coreRadius*(1.3+0.10*coreRoundness),radius);
        let bandCloud = radarSmoothStep(0.03,0.42,arms);
        let interbandOpening = 1-bandRegion*(1-bandCloud)*0.76;
        let coverage = shield*Math.min(1,
            0.18+0.58*cellCoverage+0.42*arms)*
            (system.tropicalFactor+(1-system.tropicalFactor)*comma)*interbandOpening;
        // An opening eye temporarily reduces the inner dense overcast. Keep
        // the outer cloud shield and spiral bands intact so this reads as a
        // structural weakening rather than total storm disappearance.
        let innerOpeningFade = Math.exp(-Math.pow(radius/2.4,2));
        coverage *= 1-0.30*eyeOpening*innerOpeningFade;
        // IR dense overcast follows the storm's pressure/wind intensity more
        // closely than the rain rate does. It is nevertheless no longer tied
        // one-to-one to the circulation: weak tropical cyclones can retain
        // vigorous towers, while the opening phase attenuates both products.
        let legacyCloudStrength = Number.isFinite(system.strength) ?
            constrain(system.strength,0,1) : 0;
        let cloudStrength = Math.max(
            convectiveStrength,
            legacyCloudStrength*(1-0.45*eyeOpening)
        );
        if(Number.isFinite(system.intensity)){
            let intensity = intensityLevel;
            let eyewall = Number.isFinite(system.eyewallFactor) ?
                constrain(system.eyewallFactor,0,1) : 0;
            let organizedConvection = intensity*(0.45+0.55*eyewall);
            cloudStrength = Math.max(
                cloudStrength,
                (0.20+0.70*organizedConvection)*
                    (1-0.45*eyeOpening)
            );
        }
        // Sheared storms expose an upshear sector; retain a coherent canopy
        // in organized storms rather than carving noise into the whole core.
        let ventilation = 1-0.28*system.shearFactor*
            (1-downshear)*0.5*radarSmoothStep(0.5,2.2,radius);
        let convection = Math.max(coreCells*interbandOpening,
            arms*(0.52+0.48*shield))*cloudStrength*
            (0.85+0.15*radarSmoothStep(24,29,sst))*ventilation;
        // Use the same mature-eyewall signal for a coherent annular boost.
        // It is shaped by the evolving storm descriptor and texture, rather
        // than painting a fixed black ring into the IR-BD product.
        let eyewallRadii = simulatedEyewallRadii(
            system,spiralAngle,false,z,systemState
        );
        // Vary the wall center with the same cells used by the CDO. This keeps
        // a closed eyewall without producing a mathematically concentric ring.
        let wallDisplacement = 1+(1-0.92*coreRoundness)*(
            0.08*(cells-0.5)+0.04*Math.sin(3*spiralAngle+system.phase));
        let eyewallRadius = eyewallRadii.inner*wallDisplacement;
        let eyewallWidth = 0.28+0.08*intensityLevel+
            0.08*system.shearFactor+0.05*(1-eyewallMaturity);
        let outerEyewallWidth = simulatedReplacementOuterWallWidth(
            system,eyewallWidth,eyewallRadius,eyewallRadii.outer
        );
        let innerRing = Math.exp(-0.5*Math.pow(
            (radius-eyewallRadius)/eyewallWidth,2
        ));
        let outerWeight = Number.isFinite(system.eyewallOuterWeight) ?
            radarClamp(system.eyewallOuterWeight) : 0;
        let innerWeight = Number.isFinite(system.eyewallInnerWeight) ?
            radarClamp(system.eyewallInnerWeight) : 1;
        let outerRing = Math.exp(-0.5*Math.pow(
            (radius-eyewallRadii.outer*wallDisplacement)/outerEyewallWidth,2
        ));
        let innerWallContinuity = simulatedEyewallWallContinuity(
            system,angle,0,systemState
        );
        let outerWallContinuity = simulatedEyewallWallContinuity(
            system,angle,1,systemState
        );
        let eyewallRing = Math.min(1,
            innerWeight*innerRing*innerWallContinuity+
            outerWeight*outerRing*outerWallContinuity
        );
        let replacementActive = systemState.doubleWallVisible;
        let replacementVisualFactor = replacementActive ?
            systemState.replacementVisualFactor : 0;
        let annularConvection = eyewallMaturity*eyewallRing*
            convectiveArc*(0.58+0.42*ringSectorShape)*
            simulatedReplacementWallContinuity(system,angle,radius)*
            (0.64+0.36*cellCoverage)*(0.72+0.28*cloudStrength)*
            (1-0.30*eyeOpening*innerOpeningFade);
        let coldness = radarClamp(
            (0.70*coverage+0.52*convection)*
                (1-0.20*systemState.failure*
                    Math.exp(-Math.pow(radius/2.8,2)))+
                0.26*annularConvection
        );
        // Keep a readable warm moat between the two convective rings in the
        // cloud/IR products as well as in the microwave product. The effect is
        // bounded so a replacement cycle still retains its broad cloud shield.
        if(outerWeight>0.04 && replacementVisualFactor>0.001){
            let replacementSupport = Number.isFinite(system.rainbandActivity) ?
                radarClamp(system.rainbandActivity) : 0.58;
            let replacementStrength = constrain(
                intensityLevel*eyewallMaturity*outerWeight*
                    (1.15+0.32*replacementSupport)*replacementVisualFactor,
                0,1
            );
            let replacementEyeRadius = eyewallRadii.outer;
            let moatCenter = 0.5*(eyewallRadius+replacementEyeRadius);
            let replacementMoat = Math.exp(-0.5*Math.pow(
                (radius-moatCenter)/(outerEyewallWidth*0.70),2
            ));
            let replacementOuterRing = Math.exp(-0.5*Math.pow(
                (radius-replacementEyeRadius)/(outerEyewallWidth*0.88),2
            ));
            // A thicker outer wall has a broader cold tail. Deepen the moat
            // response with it so the ring remains visibly separate instead
            // of filling the gap with the wall's low-resolution edge.
            coldness *= 1-0.52*replacementStrength*replacementMoat;
            coldness += 0.17*replacementStrength*replacementOuterRing;
            coldness = radarClamp(coldness);
        }
        let innerEyewallWeight = Number.isFinite(system.eyewallInnerWeight) ?
            system.eyewallInnerWeight : 1;
        let outerEyewallWeight = Number.isFinite(system.eyewallOuterWeight) ?
            system.eyewallOuterWeight : 0;
        let outerEyeRadius = systemState.cloudOuterEyeRadius;
        let cloudEyeScale = systemState.cloudEyeScale;
        // A perfectly radial clear mask reads like a cut-out, especially
        // after the raster is enlarged. Let the same slow cloud cells that
        // shape the surrounding canopy bend the eye boundary a little. The
        // amplitudes stay deliberately small: this adds a believable warm
        // moat without turning the eye into a second rainband.
        let eyeAxis = Number.isFinite(system.shearAngle) ?
            system.shearAngle : system.phase;
        let eyeShape = 1+
            0.022*system.shearFactor*Math.cos(arcAngle-eyeAxis)+
            0.018*(1-coreRoundness)*Math.sin(2*arcAngle+system.phase)+
            (0.035+0.025*(1-coreRoundness))*(broad-0.5)+
            (0.018+0.018*(1-coreRoundness))*(cells-0.5);
        let warpedEyeRadius = radius/Math.max(0.84,eyeShape);
        let eyeTexture = radarClamp(0.56*broad+0.30*cells+0.14*fine);
        let eyeVeil = radarSmoothStep(0.46,0.76,eyeTexture);
        let innerEyeRadius = (0.58-0.06*intensityLevel)*cloudEyeScale;
        let outerEyeScale = Math.min(1.3+0.7*
            systemState.failure,outerEyeRadius)*cloudEyeScale;
        let eyeCoverage = simulatedReplacementEyeCoverage(
            system,
            warpedEyeRadius,
            innerEyeRadius,
            (0.61-0.05*intensityLevel)*outerEyeScale,
            false,
            systemState
        );
        // Subsidence clears the eye nonlinearly: even a very cold surrounding
        // canopy should not erase the warm center of a mature eye.
        let eye = Math.pow(
            1-systemState.eyeVisibility*eyeCoverage,
            1.15
        );
        // Warm eyes still contain thin cirrus and small convective wisps. Add
        // them as a restrained veil instead of cooling the whole center or
        // leaving a perfectly uniform hole in the cloud field.
        let eyeCloudVeil = eyeCoverage*eyeVeil*
            (0.035+0.085*dvorak.maturity)*
            (0.72+0.28*convectiveStrength);
        eye = Math.min(1,eye+eyeCloudVeil);
        // A diffuse, evolving canopy grows through organized cell clusters.
        // Avoid a flat inner disk all crossing a BD threshold at once.
        let canopyRadius = 1.25+0.65*dvorak.canopy+
            0.18*(broad-0.5)*(1-0.98*coreRoundness);
        let canopyEnvelope = Math.exp(-Math.pow(shapedRadius/canopyRadius,3));
        let coldSurround = canopyEnvelope*dvorak.canopy*
            (1-0.28*(1-cellCoverage)*(1-0.85*coreRoundness));
        let targetColdness = (clearTemperature-dvorak.ringTemperature-
            12*(broad-0.5)-8*(cells-0.5))/(clearTemperature+85);
        coldness += Math.max(0,targetColdness-coldness)*coldSurround;
        // High cirrus partly hides the subsiding moat in IR; apply after the
        // canopy so it cannot completely overwrite the two-wall structure.
        if(replacementVisualFactor>0.001){
            let moat = simulatedReplacementMoat(radius,eyewallRadius,
                eyewallRadii.outer*wallDisplacement);
            coldness *= 1-0.16*outerWeight*eyewallMaturity*
                replacementVisualFactor*moat;
        }
        // Retain the cirrus canopy in the inactive sector, but let its deep
        // convection weaken into the same broad gap seen in the base scan.
        let arcEnvelope = 1-radarSmoothStep(2.0,3.4,radius);
        coldness *= 1-0.28*(1-convectiveArc)*arcEnvelope;
        // Embedded cold towers have their own smoothly evolving envelope.
        // Apply their cooling AFTER the normalized bulk-cloud clamp: that
        // clamp represents canopy coverage, not a -85 C physical ceiling.
        // The deep-convective field has two scales: lower-level intensity and
        // environmental activity establish a connected cold floor, while the
        // tower texture supplies the colder ECDG cores. This avoids reducing
        // even a major cyclone to a few isolated threshold-crossing pixels.
        let towerCells = radarEvolvingNoise(tx*2.0,ty*2.0,z*0.65,
            system.phase+31.4);
        let towerCluster = radarSmoothStep(0.42,0.78,
            0.70*towerCells+0.30*cells);
        let intensitySupport = radarSmoothStep(0.30,0.90,
            systemState.intensityLevel);
        let activitySupport = radarSmoothStep(0.35,0.90,
            systemState.convectiveStrength);
        let eyewallSupport = radarSmoothStep(0.25,0.75,
            eyewallMaturity);
        let deepCoreOrganization = radarClamp(intensitySupport*
            activitySupport*(0.45+0.55*eyewallSupport));
        let deepRingEnvelope = Math.exp(-0.5*Math.pow(
            (radius-eyewallRadius)/
                (eyewallWidth*(0.95+0.18*deepCoreOrganization)),2
        ))*(0.25+0.75*eyewallSupport);
        // A replacement cycle must retain its warmer inter-wall moat. Do not
        // let the new connected deep-convection floor bridge the two walls at
        // low raster resolution.
        if(outerWeight>0.04 && replacementVisualFactor>0.001){
            let deepMoat = simulatedReplacementMoat(radius,eyewallRadius,
                eyewallRadii.outer*wallDisplacement);
            deepRingEnvelope *= 1-0.85*deepMoat;
        }
        let towerSupport = radarClamp(Math.max(convection,
            annularConvection*0.9,coldSurround*cloudStrength))*
            (1-(1-convectiveArc)*arcEnvelope);
        let deepFloorSupport = radarClamp(Math.max(towerSupport,
            convectiveArc*(0.70+0.30*deepCoreOrganization)));
        // A mature, intense eyewall raises the local tower occupancy floor;
        // retain texture above it so VCDG remains irregular and ECDG remains
        // preferentially concentrated in the strongest cells.
        towerCluster = radarClamp(towerCluster+
            (0.06+0.14*deepCoreOrganization)*
            deepRingEnvelope);
        let deepShieldCooling = (1.4+2.8*deepCoreOrganization)*
            deepRingEnvelope*deepFloorSupport*
            (0.65+0.35*systemState.convectiveStrength);
        let towerCooling = 28*towerCluster*towerSupport*
            (0.55+0.45*systemState.convectiveStrength);
        let towerVariation = ((cells-0.5)*10+(fine-0.5)*2)*convection+
            deepShieldCooling+towerCooling;
        let stormTemperature = clearTemperature-
            ((clearTemperature+85)*coldness+towerVariation)*eye;
        // Resolve subsidence warming independently of the environmental
        // precipitation-strength multiplier that previously left extreme
        // typhoons with a -46 C center. Existing eye/replacement geometry
        // still controls where the opening is, and damage gates the gain.
        let warmEye = radarClamp(eyeCoverage*dvorak.maturity);
        let subsidenceEyeTarget = simulatedEyeTemperatureTarget(
            system,clearTemperature,systemState
        );
        stormTemperature += Math.max(0,
            subsidenceEyeTarget-stormTemperature)*warmEye;
        // Apply only a small post-subsidence cooling so the veil remains
        // visible in the ordinary cloud product while the eye stays warm.
        stormTemperature -= eyeCloudVeil*(5+4*dvorak.maturity);
        // Appearance-only CDO regularization. Keep the existing cloud/IR
        // physics above intact, then blend only the dense-overcast core toward
        // a stable radial reference. The reference still comes from the same
        // SST, Dvorak scene, eye mask, and storm intensity, so the cloud
        // product remains coupled to the underlying simulation while its
        // contour is less deformed by threshold-amplified texture.
        let cdoRoundness = 0.70+0.22*coreRoundness;
        // Retain resolved cell-scale boundary displacement even in a mature
        // storm. BD thresholds magnify this into irregular, connected edges.
        let cdoShape = 1+0.055*(broad-0.5)+0.025*(cells-0.5)+(1-cdoRoundness)*(
            0.10*(broad-0.5)+
            0.035*Math.sin(2*spiralAngle+system.phase)+
            0.025*Math.sin(3*spiralAngle-system.phase)
        );
        let cdoRadius = radius/Math.max(0.90,cdoShape);
        let cdoBlend = 0.38*coreRoundness*
            radarSmoothStep(coreRadius*1.55,coreRadius*0.62,cdoRadius)*
            radarSmoothStep(0.32,0.72,radius);
        let cdoReferenceColdness = radarClamp(
            (clearTemperature-dvorak.ringTemperature)/(clearTemperature+85)+
            // Retain broad cloud-cell modulation in the reference. It is
            // intentionally low amplitude and low frequency: enough to keep
            // the ring meteorologically textured without reintroducing the
            // jagged threshold noise that this pass is meant to suppress.
            0.045*(broad-0.5)+0.025*(cells-0.5)
        );
        let cdoReferenceTemperature = clearTemperature-
            (clearTemperature+85)*cdoReferenceColdness*eye;
        // The convective ring gets a second, narrower appearance pass. Sample
        // the already-derived microwave return only around the ring and use it
        // as a bounded strength anchor. This keeps the cloud product tied to
        // the underlying precipitation maximum without letting base-scan
        // texture carve independent holes through the CDO.
        let convectiveRingMask = Math.exp(-0.5*Math.pow(
            (cdoRadius-eyewallRadius)/Math.max(0.22,eyewallWidth*1.35),2
        ));
        let underlyingEcho = 0.35;
        if(convectiveRingMask>0.08 &&
            typeof simulatedRadarReflectivity==='function' &&
            typeof SIMULATED_BASE_SCAN_BACKGROUND_BASE==='number'){
            let shearAngle = Number.isFinite(system.shearAngle) ?
                system.shearAngle : 0;
            // Cloud tops use the same storm-relative point as the base scan,
            // removing only the extra apparent downshear displacement used by
            // the cloud renderer itself.
            let frameOffset = Number.isFinite(system.shearOffset) ?
                system.shearOffset*0.8 : 0;
            underlyingEcho = simulatedRadarReflectivity(
                u,
                x-Math.cos(shearAngle)*frameOffset,
                y-Math.sin(shearAngle)*frameOffset,
                z,true
            );
        }
        if(!Number.isFinite(underlyingEcho)) underlyingEcho = 0.35;
        let underlyingSupport = radarSmoothStep(0.16,0.58,
            radarClamp(underlyingEcho));
        // Keep the radial enhancement broad, but let its strongest portion
        // follow the same smooth sector as the resolved ring. The product of
        // this envelope and the sampled base return prevents a full synthetic
        // black circle when the underlying scan only supports an arc.
        let ringEvidence = radarClamp(
            radarClamp(0.46+0.54*underlyingSupport)*
            radarClamp(0.52+0.48*convectiveArc)*ringSectorShape
        );
        let ringContinuity = radarSmoothStep(0.18,0.62,ringEvidence);
        let ringReferenceColdness = radarClamp(
            0.70*cdoReferenceColdness+0.30*underlyingSupport
        );
        let ringReferenceTemperature = clearTemperature-
            (clearTemperature+85)*ringReferenceColdness*eye;
        let ringBlend = 0.34*cdoRoundness*convectiveRingMask*
            (0.16+0.84*ringContinuity)*
            (0.78+0.22*underlyingSupport);
        stormTemperature = stormTemperature*(1-cdoBlend)+
            cdoReferenceTemperature*cdoBlend;
        stormTemperature = stormTemperature*(1-ringBlend)+
            ringReferenceTemperature*ringBlend;
        // Appearance-only eye cleanup. Use a low-order, nearly circular mask
        // and only warm toward the existing Dvorak eye target; this preserves
        // the modeled eye visibility and keeps replacement-cycle openings
        // from being painted over by a perfect central disk.
        let eyeVisibility = systemState.eyeVisibility;
        let eyeContinuity = radarSmoothStep(0.18,0.72,eyeVisibility)*
            radarSmoothStep(0.18,0.62,dvorak.maturity);
        let eyeAppearanceShape = 1+
            0.018*system.shearFactor*Math.cos(arcAngle-eyeAxis)+
            0.014*(1-coreRoundness)*Math.sin(2*arcAngle+system.phase);
        let eyeAppearanceRadius = Math.max(0.22,innerEyeRadius*0.98);
        let eyeCoreMask = radarSmoothStep(1.10,0.16,
            radius/(eyeAppearanceRadius*Math.max(0.94,eyeAppearanceShape)));
        let eyeAppearanceTarget = simulatedEyeTemperatureTarget(
            system,clearTemperature,systemState
        );
        let eyeRoundness = 0.84+0.16*coreRoundness;
        let eyeBlend = 0.32*eyeRoundness*eyeContinuity*eyeCoreMask;
        stormTemperature = stormTemperature*(1-eyeBlend)+
            Math.max(stormTemperature,eyeAppearanceTarget)*eyeBlend;
        temperature = Math.min(temperature,stormTemperature);
        // The broad environmental cloud field is combined with the storm by
        // a minimum above, so a warm eye must be restored after that merge or
        // the background canopy can cover it again. Keep the correction
        // restricted to the same continuous eye kernel and target only the
        // already-derived warm-eye temperature.
        let eyeClearBlend = 0.76*eyeRoundness*eyeContinuity*eyeCoreMask;
        temperature = temperature*(1-eyeClearBlend)+
            Math.max(temperature,eyeAppearanceTarget)*eyeClearBlend;
        // Do not let a low-moisture clear-sky baseline masquerade as the eye
        // temperature at the resolved eye center. The appearance blend above
        // intentionally preserves texture, but a well-defined eye still has
        // a modeled thermodynamic target that acts as its upper bound.
        let eyeTemperatureCapBlend = eyeContinuity*eyeCoreMask;
        temperature = temperature*(1-eyeTemperatureCapBlend)+
            Math.min(temperature,eyeAppearanceTarget)*eyeTemperatureCapBlend;
    }
    return Math.max(SIMULATED_CLOUD_BT_MIN,
        Math.min(SIMULATED_CLOUD_BT_MAX,temperature));
}

// IR-BD is the Dvorak false-gray enhancement applied to the same long-wave
// infrared cloud-top temperatures as the ordinary cloud image. The repeated
// gray levels are intentional: they make the cold cloud-top bands used in
// subjective tropical-cyclone analysis easy to distinguish.
const SIMULATED_IR_BD_BT_MIN = -100;
// Keep this declaration self-contained because the BD shade helper is also
// loaded independently by lightweight tests and tooling.
const SIMULATED_IR_BD_BT_MAX = 50;
const SIMULATED_IR_BD_CDG_MIN = -85;
const SIMULATED_IR_BD_VCDG_MIN = -89;
const SIMULATED_IR_BD_CDG_SHADE = 85;
const SIMULATED_IR_BD_VCDG_SHADE = 55;
const SIMULATED_IR_BD_ECDG_SHADE = 25;

function simulatedIrBdTemperature(u,x,y,z){
    // The BD product is an enhancement curve, not a second temperature
    // retrieval. Keeping this value unchanged preserves the physical meaning
    // of the cloud-top temperature shown by the underlying IR image.
    return simulatedCloudTemperature(u,x,y,z);
}

function simulatedIrBdShade(temperature){
    temperature = Number.isFinite(temperature) ?
        constrain(temperature,SIMULATED_IR_BD_BT_MIN,SIMULATED_IR_BD_BT_MAX) :
        SIMULATED_IR_BD_BT_MAX;
    let shade;
    if(temperature>9){
        // Warm medium gray (WMG): retain a continuous clear/shallow-cloud
        // gradient before the first enhanced BD interval.
        // Reference BAND14-BD bar is black above about +25 C, then
        // brightens toward +9 C; extending the legend must not stretch it.
        shade = map(temperature,25,9,0,255,true);
    }else if(temperature>=-30){
        // Off white (OW), +9 to -30 C.
        // The warm cloud interval brightens as cloud tops get colder.
        shade = map(temperature,9,-30,109,202,true);
    }else if(temperature>=-41){
        // Dark gray (DG), -30 to -41 C.
        shade = 60;
    }else if(temperature>=-53){
        // Medium gray (MG), -41 to -53 C.
        shade = 110;
    }else if(temperature>=-63){
        // Light gray (LG), -53 to -63 C.
        shade = 160;
    }else if(temperature>=-69){
        // Black (B), -63 to -69 C.
        shade = 0;
    }else if(temperature>=-75){
        // White (W), -69 to -75 C.
        shade = 255;
    }else if(temperature>-80){
        // Cold medium gray (CMG), -75 to -80 C.
        shade = 135;
    }else if(temperature>SIMULATED_IR_BD_CDG_MIN){
        // Cold dark gray (CDG), -80 to -85 C.
        shade = SIMULATED_IR_BD_CDG_SHADE;
    }else if(temperature>=SIMULATED_IR_BD_VCDG_MIN){
        // Very cold dark gray (VCDG), -85 to -89 C.
        shade = SIMULATED_IR_BD_VCDG_SHADE;
    }else{
        // Extremely cold dark gray (ECDG), colder than -89 C.
        shade = SIMULATED_IR_BD_ECDG_SHADE;
    }
    return shade;
}

function simulatedIrBdColor(temperature){
    colorMode(RGB);
    let rgba = simulatedIrBdRgba(temperature);
    return color(rgba[0],rgba[1],rgba[2],rgba[3]);
}

function simulatedIrBdRgba(temperature,target){
    let shade = simulatedIrBdShade(temperature);
    let rgba = target || [];
    rgba[0] = shade;
    rgba[1] = shade;
    rgba[2] = shade;
    rgba[3] = 255;
    return rgba;
}

function simulatedCloudRgba(temperature,target){
    let cloud = radarSmoothStep(20,-75,temperature);
    // Satellite cloud tops are not paper white. Keep a cool blue-gray tint
    // and reserve the brightest values for the deepest towers, which gives
    // the CDO some depth instead of one flat plastic-looking highlight.
    let shade = 96+126*cloud;
    let blue = Math.min(244,shade+9+7*cloud);
    let warmCloud = radarSmoothStep(27,10,temperature);
    let opacity = 28*warmCloud+
        218*radarSmoothStep(20,-15,temperature);
    let rgba = target || [];
    rgba[0] = shade;
    rgba[1] = Math.min(236,shade+3);
    rgba[2] = blue;
    rgba[3] = opacity;
    return rgba;
}

function simulatedCloudColor(temperature){
    colorMode(RGB);
    let rgba = simulatedCloudRgba(temperature);
    return color(rgba[0],rgba[1],rgba[2],rgba[3]);
}

// -- simulated SAR surface-wind retrieval -- //

// SAR products commonly expose wind retrievals in both m/s and knots. The
// simulator stores its wind field in knots, so the display keeps knots as the
// source unit and derives the m/s labels in the imagery panel.
const SIMULATED_SAR_WIND_MIN = 0;
// The SAR product is a lower-level wind retrieval. Do not truncate it at the
// ordinary C5 range: extended-category and hypercane storms can reach the
// same 440 kt ceiling used by the spawn catalogue.
const SIMULATED_SAR_WIND_MAX = 440;
const SIMULATED_SAR_KNOTS_PER_MS = 1.943844;

function simulatedSarWindOuterFade(normalizedRadius){
    if(!Number.isFinite(normalizedRadius) || normalizedRadius<=0) return 1;
    // Start the handoff only beyond the resolved circulation. The stronger
    // tail reduction prevents several intense storms from summing into a
    // false hurricane-strength background while leaving the core and outer
    // replacement wall readable in both the map and SAR scan.
    return 1-0.86*radarSmoothStep(2.8,5.6,normalizedRadius);
}

function simulatedSarStormRelativeRadius(u,x,y){
    let systems = u && Array.isArray(u.simulatedSystems) ?
        u.simulatedSystems : [];
    let system;
    if(u && u.storm instanceof Object)
        system = systems.find(item=>item && item.storm===u.storm);
    if(!system) system = systems.find(item=>item &&
        Number.isFinite(item.x) && Number.isFinite(item.y));
    if(!system || !Number.isFinite(system.rmwX) ||
        !Number.isFinite(system.rmwY) || system.rmwX<=0 || system.rmwY<=0)
        return undefined;
    return Math.hypot((x-system.x)/system.rmwX,
        (y-system.y)/system.rmwY);
}

function simulatedSarSurfaceTexture(x,y,z,stormRadius){
    // A SAR retrieval contains ocean-scale variability that is unrelated to
    // distance from the cyclone. Increase that variability outside the core
    // so the far field does not expose the wind model's radial decay as clean
    // color contours, while preserving a calmer eye/eyewall signal.
    let hasStormRadius = Number.isFinite(stormRadius) && stormRadius>=0;
    let farField = hasStormRadius ?
        radarSmoothStep(1.25,4.2,stormRadius) : 1;
    let mesoscale = radarEvolvingNoise(
        x*0.032-y*0.011+z*0.0008,
        y*0.032+x*0.009-z*0.0004,z,113.7
    );
    let streaks = radarEvolvingNoise(
        x*0.078+y*0.019-z*0.0005,
        y*0.022-x*0.052+z*0.0007,z,187.4
    );
    let local = radarEvolvingNoise(x*0.12,y*0.12,z,52.7);
    let fine = radarEvolvingNoise(x*0.48,y*0.48,z,91.3);
    let structured = 0.64*(mesoscale-0.5)+0.36*(streaks-0.5);
    return 1+(0.06+0.18*farField)*structured+
        (0.025+0.025*farField)*(local-0.5)+
        0.015*(fine-0.5);
}

function simulatedSarColor(windSpeed){
    colorMode(RGB);
    let rgba = simulatedSarRgba(windSpeed);
    return color(rgba[0],rgba[1],rgba[2],rgba[3]);
}

function simulatedSarRgba(windSpeed,out=[0,0,0,0]){
    windSpeed = Number.isFinite(windSpeed) ?
        constrain(windSpeed,SIMULATED_SAR_WIND_MIN,SIMULATED_SAR_WIND_MAX) :
        SIMULATED_SAR_WIND_MIN;
    // Reuse the palette and write directly to the caller's pixel scratch buffer.
    let stops = simulatedSarRgba.stops || (simulatedSarRgba.stops = [
        [0,8,22,178],
        [17,0,83,245],
        [34,0,205,246],
        [54,32,239,171],
        [75,178,244,28],
        [95,255,220,0],
        [115,255,139,0],
        [136,232,25,24],
        [155,138,18,116],
        [170,245,238,250],
        [210,255,150,235],
        [270,255,80,205],
        [330,205,35,170],
        [400,116,18,145],
        [440,255,255,255]
    ]);
    let upperIndex = 1;
    while(upperIndex<stops.length-1 && windSpeed>stops[upperIndex][0]) upperIndex++;
    let lower = stops[upperIndex-1];
    let upper = stops[upperIndex];
    let blend = Math.max(0,Math.min(1,(windSpeed-lower[0])/(upper[0]-lower[0])));
    for(let channel=1;channel<=3;channel++)
        out[channel-1] = Math.round(lower[channel]+blend*(upper[channel]-lower[channel]));
    out[3] = 255;
    return out;
}

function simulatedSarWindSpeed(u,x,y,z){
    if(!u || !u.basin || !u.basin.env ||
        !(u.basin.env.getSurfaceWind instanceof Function)) return 0;

    // SAR and the E-key surface-wind layer deliberately use the same query:
    // the scan is a view of the simulated surface wind field, not a second
    // storm-only wind model. This also keeps nearby systems and background
    // steering consistent between the map and the scan panel.
    let wind = u.basin.env.getSurfaceWind(
        x,y,z,u.sarVector
    );
    let speed = wind && wind.mag instanceof Function ? wind.mag() : 0;
    if(!Number.isFinite(speed)) speed = 0;
    return constrain(speed,SIMULATED_SAR_WIND_MIN,SIMULATED_SAR_WIND_MAX);
}

ENV_DEFS.defaults.clouds = {
    displayName: 'Simulated infrared cloud image',
    version: 0,
    mapFunc: simulatedCloudTemperature,
    displayFormat: v=>v>18 ? 'Clear / shallow cloud' : round(v)+' °C (simulated cloud top)',
    legend: {
        type: 'gradient',
        range: [20,-85],
        ticks: [20,-15,-50,-85],
        labels: ['Clear','Low cloud','Cold','Deep convection']
    },
    hueMap: simulatedCloudColor,
    oceanic: false,
    renderResolution: 4,
    smoothRaster: true,
    noWobble: true
};
if(ENABLE_SIMULATED_CLOUD_LAYER){
    for(let mode of [SIM_MODE_NORMAL,SIM_MODE_HYPER,SIM_MODE_WILD,
        SIM_MODE_MEGABLOBS,SIM_MODE_EXPERIMENTAL,SIM_MODE_SPOOKY]){
        ENV_DEFS[mode].clouds = {};
    }
}

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

function fujiwharaInteractionRange(sys0,sys1){
    // On the regional maps, the 120 px base onset is roughly the commonly
    // cited 750 n mi (about 1400 km) interaction distance. Larger circulations
    // begin influencing one another sooner than compact storms.
    let size0 = Number.isFinite(sys0.circulationSize) ? sys0.circulationSize : 3;
    let size1 = Number.isFinite(sys1.circulationSize) ? sys1.circulationSize : 3;
    let range = map((size0+size1)/2,1,5,120,180);
    if(sys0.type===MONSOON || sys1.type===MONSOON) range *= 1.12;
    if(sys0.type===EXTROP || sys1.type===EXTROP) range *= 1.08;
    return range;
}

function fujiwharaVortexStrength(sys){
    // Point-vortex dynamics make each center respond to the circulation of
    // the *other* vortex. Blend pressure and wind so unusual broad or compact
    // storms still produce a sensible translation speed in pixels per hour.
    let pressure = Number.isFinite(sys.pressure) ? sys.pressure : 1010;
    let wind = Number.isFinite(sys.windSpeed) ? sys.windSpeed : 25;
    let pressureStrength = map(constrain(pressure,900,1015),1015,900,0.55,3);
    let windStrength = map(constrain(wind,20,160),20,160,0.55,3);
    return (pressureStrength+windStrength)/2;
}

STORM_ALGORITHM.defaults.interaction = function(sys0, sys1){
    let interactionData = {};

    let offset = p5.Vector.sub(sys0.pos,sys1.pos);
    let distance = offset.mag();
    let interactionRange = fujiwharaInteractionRange(sys0,sys1);
    if(distance<interactionRange && distance>0){
        let proximity = 1-distance/interactionRange;

        // A northern-hemisphere pair turns counter-clockwise geographically.
        // Screen-space y points south, so this is a clockwise vector rotation;
        // hem() reverses it in the Southern Hemisphere.
        let selfStrength = fujiwharaVortexStrength(sys0);
        let otherStrength = fujiwharaVortexStrength(sys1);
        let tangentialSpeed = otherStrength*pow(proximity,0.35);
        let v = offset.copy();
        v.rotate(sys0.basin.hem(-TAU/4));
        v.setMag(tangentialSpeed);

        // Explicit one-hour position steps otherwise gain a little radius from
        // every tangent move. Correct that integration drift about the pair's
        // intensity-weighted centroid; this is not an extra physical inflow.
        let centroidRadius = distance*otherStrength/(selfStrength+otherStrength);
        let inwardSpeed = min(0.18,sq(tangentialSpeed)/(2*max(1,centroidRadius)));

        // Very close vortices also drift towards their shared centroid, which
        // permits a realistic capture/merger instead of an indefinitely tight
        // numerical orbit.
        let captureRadius = interactionRange*0.58;
        if(distance<captureRadius)
            inwardSpeed += 0.22*sq(1-distance/captureRadius);
        if(inwardSpeed>0){
            let inward = offset.copy().mult(-1);
            inward.setMag(inwardSpeed);
            v.add(inward);
        }

        interactionData.fuji = v;
        interactionData.shear = 6*sq(proximity)*map(
            constrain(sys1.windSpeed,20,160),20,160,0.35,1
        );
        // Two broad cold-core lows cannot retain separate closed centers at the
        // compact spacing tolerated by tropical vortices. Coalesce the weaker
        // center before the pair settles into an unrealistically tight orbit.
        let broadCenterMerge = sys0.type===EXTROP && sys1.type===EXTROP ?
            StormData.minimumCenterSeparation(sys0,sys1) : 0;
        let vortexMerge = map(
            constrain(sys0.pressure,1000,1030),1030,1000,
            interactionRange/5,interactionRange/15
        );
        if((distance < broadCenterMerge || distance < vortexMerge || distance<5) && sys0.pressure > sys1.pressure)
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

// Circulation intensity contributes a bounded share of the convective signal.
// Keep it separate from the environmental convective target so a low-wind
// tropical cyclone is still allowed to maintain strong deep convection.
//
// The old proxy clipped both inputs to the ordinary C5 envelope. That made
// C6+ systems (and very deep outliers that were not assigned an extended
// category) indistinguishable from a normal major hurricane to every feature
// that consumed this proxy. Preserve the familiar response through the C5
// range, then use a logarithmic tail: there is no artificial ceiling, but a
// 400 kt / 700 hPa system does not get an absurdly large multiplier either.
function coreCirculationIntensityProxy(sys){
    let wind = sys && Number.isFinite(sys.windSpeed) ? sys.windSpeed : 30;
    let pressure = sys && Number.isFinite(sys.pressure) ? sys.pressure : 1010;
    let windPart = extendedIntensityComponent((wind-20)/140);
    let pressurePart = extendedIntensityComponent((1010-pressure)/110);
    return 0.68*windPart+0.32*pressurePart;
}

function extendedIntensityComponent(value){
    value = Math.max(0,Number.isFinite(value) ? value : 0);
    return value<=1 ? value : 1+Math.log(1+value-1);
}

function coreCirculationIntensityFactor(sys){
    // Environmental support terms are deliberately bounded. They should not
    // inherit the extended intensity tail as a negative weak-storm allowance.
    return constrain(coreCirculationIntensityProxy(sys),0,1);
}

// Eye structure is a separate inner-core characteristic from the broader
// circulation-size level. These fallbacks keep the simulation helpers usable
// with old descriptors and small analysis fixtures that do not load storm.js.
const CORE_EYE_TYPE_FALLBACK_PROFILES = [
    {intensificationRate:1.38,pressurePotential:1.10,windPotential:1.08},
    {intensificationRate:1.22,pressurePotential:1.06,windPotential:1.04},
    {intensificationRate:1,pressurePotential:1,windPotential:1},
    {intensificationRate:0.92,pressurePotential:0.98,windPotential:0.98},
    {intensificationRate:0.86,pressurePotential:0.96,windPotential:0.96}
];

function coreEyeTypeProfile(sys){
    let index = sys && Number.isFinite(sys.eyeType) ? round(sys.eyeType) : 2;
    index = max(0,min(4,index));
    if(typeof StormData!=='undefined' &&
        typeof StormData.eyeTypeProfile==='function'){
        let profile = StormData.eyeTypeProfile(index);
        if(profile) return profile;
    }
    return CORE_EYE_TYPE_FALLBACK_PROFILES[index];
}

function coreEyeTypeMaturity(sys){
    if(!sys || (sys.type!==TROP && sys.type!==SUBTROP)) return 0;
    let wind = Number.isFinite(sys.windSpeed) ? sys.windSpeed : 0;
    let organization = Number.isFinite(sys.organization) ?
        constrain(sys.organization,0,1) : 0.5;
    let warmCore = Number.isFinite(sys.lowerWarmCore) &&
        Number.isFinite(sys.upperWarmCore) ?
        constrain(min(sys.lowerWarmCore,sys.upperWarmCore),0,1) : 0.7;
    let windMaturity = constrain((wind-34)/70,0,1);
    return constrain(
        windMaturity*(0.42+0.58*organization)*(0.55+0.45*warmCore),
        0,1
    );
}

function coreEyeTypeIntensificationMultiplier(sys){
    let profile = coreEyeTypeProfile(sys);
    return 1+(profile.intensificationRate-1)*coreEyeTypeMaturity(sys);
}

function coreEyeTypePressurePotential(sys){
    let profile = coreEyeTypeProfile(sys);
    return 1+(profile.pressurePotential-1)*coreEyeTypeMaturity(sys);
}

function coreEyeTypeWindPotential(sys){
    let profile = coreEyeTypeProfile(sys);
    return 1+(profile.windPotential-1)*coreEyeTypeMaturity(sys);
}

function coreEyeDiameterBounds(sys){
    let index = sys && Number.isFinite(sys.eyeType) ? round(sys.eyeType) : 2;
    index = max(0,min(4,index));
    // Keep the helper usable in small test/forecast runtimes that only expose
    // the eye-type potential fields rather than the full constants table.
    let minimums = [3,10,20,40,80];
    let maximums = [10,20,40,80,120];
    let profile = coreEyeTypeProfile(sys);
    let minimum = profile && Number.isFinite(profile.diameterMin) ?
        profile.diameterMin : minimums[index];
    let maximum = profile && Number.isFinite(profile.diameterMax) ?
        profile.diameterMax : maximums[index];
    return [minimum,maximum];
}

function coreEyeContractionPotential(sys){
    if(!sys || (sys.type!==TROP && sys.type!==SUBTROP)) return 0;

    let startWind = typeof EYE_CONTRACTION_START_WIND==='number' ?
        EYE_CONTRACTION_START_WIND : 85;
    let fullWind = typeof EYE_CONTRACTION_FULL_WIND==='number' ?
        EYE_CONTRACTION_FULL_WIND : 150;
    let startPressure = typeof EYE_CONTRACTION_START_PRESSURE==='number' ?
        EYE_CONTRACTION_START_PRESSURE : 980;
    let fullPressure = typeof EYE_CONTRACTION_FULL_PRESSURE==='number' ?
        EYE_CONTRACTION_FULL_PRESSURE : 910;
    let wind = Number.isFinite(sys.windSpeed) ? sys.windSpeed : 0;
    let pressure = Number.isFinite(sys.pressure) ? sys.pressure : 1010;
    let windPotential = constrain(
        (wind-startWind)/(fullWind-startWind),0,1
    );
    let pressurePotential = constrain(
        (startPressure-pressure)/(startPressure-fullPressure),0,1
    );
    let organization = Number.isFinite(sys.organization) ?
        constrain(sys.organization,0,1) : 0.55;
    let warmCore = Number.isFinite(sys.lowerWarmCore) &&
        Number.isFinite(sys.upperWarmCore) ?
        constrain(min(sys.lowerWarmCore,sys.upperWarmCore),0,1) : 0.7;
    let maturity = coreEyeTypeMaturity(sys);
    let intensity = 0.70*windPotential+0.30*pressurePotential;
    // Strong winds alone are not enough: the eye must be supported by an
    // organized, warm-core inner circulation before it is allowed to tighten.
    return constrain(
        intensity*(0.55+0.45*maturity)*
        (0.70+0.30*organization)*(0.70+0.30*warmCore),
        0,1
    );
}

function updateEyeDiameter(sys){
    if(!sys) return 0;

    let bounds = coreEyeDiameterBounds(sys);
    let minimum = bounds[0];
    let maximum = bounds[1];
    let profile = coreEyeTypeProfile(sys);
    let defaultDiameter = profile && Number.isFinite(profile.typicalDiameter) ?
        profile.typicalDiameter : (minimum+maximum)/2;
    let current = Number.isFinite(sys.eyeDiameter) ?
        sys.eyeDiameter : defaultDiameter;
    // Keep the uncontracted size separately so a weakening storm can reopen
    // its eye. It is initialized from the current value for old saves, while
    // new active systems preserve their originally sampled eye diameter.
    if(!Number.isFinite(sys.eyeDiameterBase))
        sys.eyeDiameterBase = current;
    let base = constrain(sys.eyeDiameterBase,minimum,maximum);
    let maxReduction = typeof EYE_CONTRACTION_MAX_REDUCTION==='number' ?
        EYE_CONTRACTION_MAX_REDUCTION : 0.42;
    let contraction = coreEyeContractionPotential(sys);
    let target = constrain(base*(1-maxReduction*contraction),minimum,base);
    let contractionResponse = typeof EYE_CONTRACTION_RESPONSE==='number' ?
        EYE_CONTRACTION_RESPONSE : 0.16;
    let expansionResponse = typeof EYE_EXPANSION_RESPONSE==='number' ?
        EYE_EXPANSION_RESPONSE : 0.07;
    let response = target<current ? contractionResponse : expansionResponse;

    sys.eyeDiameterBase = base;
    sys.eyeDiameter = constrain(
        lerp(current,target,response),minimum,base
    );
    sys.eyeContraction = base>0 ?
        constrain(1-sys.eyeDiameter/base,0,1) : 0;
    sys.eyeContractionPotential = contraction;
    return sys.eyeDiameter;
}

// Keep this local helper independent from the imagery section so forecast and
// unit-test slices that start at the storm algorithm remain self-contained.
function coreEyeOpeningFactor(sys){
    let phase = sys && Number.isFinite(sys.eyewallCycle) ?
        constrain(sys.eyewallCycle,0,1) : 0;
    let formation = constrain((phase-0.10)/0.30,0,1);
    formation = formation*formation*(3-2*formation);
    let closure = constrain((phase-0.68)/0.30,0,1);
    closure = closure*closure*(3-2*closure);
    let failure = sys ? constrain(Math.max(
        sys.eyewallFailure || 0,0.72*(sys.eyewallFailureEvent || 0)
    ),0,1) : 0;
    return constrain(Math.max(formation*(1-closure),0.72*failure),0,1);
}

function convectiveEnvironmentTarget(sys,moisture,SST,shear,lnd,tropicalness){
    moisture = Number.isFinite(moisture) ? moisture : 0.5;
    SST = Number.isFinite(SST) ? SST : 26;
    shear = Number.isFinite(shear) ? shear : 0;
    let moisturePotential = constrain((moisture-0.28)/0.54,0,1);
    let thermalPotential = constrain((SST-23)/7,0,1);
    let tropicalSupport = 0.55+0.45*constrain(
        Number.isFinite(tropicalness) ? tropicalness : 0.5,0,1
    );
    let organization = sys && Number.isFinite(sys.organization) ?
        constrain(sys.organization,0,1) : 0.55;
    let organizationSupport = 0.84+0.16*organization;
    let shearSupport = 1-0.26*constrain(shear/8,0,1);
    // Land removes the ocean heat flux but should not instantly erase the
    // storm's existing convective shield.
    let surfaceSupport = lnd ? 0.48+0.18*(1-constrain(lnd,0,1)) : 1;
    let intensity = coreCirculationIntensityFactor(sys);
    let target = (0.16+0.50*moisturePotential+0.34*thermalPotential)*
        tropicalSupport*organizationSupport*shearSupport*surfaceSupport;
    // A weak circulation receives a small positive allowance rather than a
    // penalty. Environmental buoyancy can therefore outpace wind intensity
    // for a while, as it often does in young tropical systems.
    target += 0.08*(1-intensity)*tropicalSupport;
    return constrain(target,0.12,1);
}

function updateConvectiveActivity(sys,moisture,SST,shear,lnd,tropicalness){
    let current = Number.isFinite(sys.convectiveActivity) ?
        constrain(sys.convectiveActivity,0,1) : undefined;
    if(current===undefined){
        let intensity = coreCirculationIntensityFactor(sys);
        let tropical = constrain(Number.isFinite(tropicalness) ? tropicalness : 0.5,0,1);
        let organization = Number.isFinite(sys.organization) ?
            constrain(sys.organization,0,1) : 0.55;
        // Seed the channel with enough spread that weak systems are not all
        // initialized as equally quiet. Subsequent updates are deterministic
        // and environment-driven.
        current = constrain(
            0.42+0.16*tropical+0.10*organization+0.10*(1-intensity),
            0.18,0.90
        );
    }
    let target = convectiveEnvironmentTarget(
        sys,moisture,SST,shear,lnd,tropicalness
    );
    let opening = coreEyeOpeningFactor(sys);
    // Let the state remember part of the opening-related suppression, while
    // the imagery layer applies the full spatial attenuation immediately.
    // Keep the live convective state close to its environmental target. The
    // raster layer carries the modest visual opening cue, so the cycle does
    // not gradually drain the storm's convection over its full duration.
    target *= 1-0.10*opening;
    let response = target<current ? 0.16 : 0.065;
    if(opening>0.35) response = Math.max(response,0.08);
    sys.convectiveActivity = constrain(
        lerp(current,target,response),0,1
    );
    return sys.convectiveActivity;
}

// Rainbands are an outer-core convective state rather than a property of the
// rendered imagery. This deliberately uses a cheaper environmental target
// than the raster model so it can be updated for every active system, even
// when no cyclone is selected. Moisture is given the largest contribution:
// humid air makes spiral bands easier to sustain before the circulation has
// become especially strong.
function rainbandEnvironmentTarget(sys,moisture,SST,shear,lnd,tropicalness){
    moisture = Number.isFinite(moisture) ? moisture : 0.5;
    SST = Number.isFinite(SST) ? SST : 26;
    shear = Number.isFinite(shear) ? shear : 0;
    let moisturePotential = constrain((moisture-0.30)/0.44,0,1);
    let thermalPotential = constrain((SST-22.5)/6.5,0,1);
    let tropicalSupport = 0.35+0.65*constrain(
        Number.isFinite(tropicalness) ? tropicalness : 0.5,0,1
    );
    let organization = sys && Number.isFinite(sys.organization) ?
        constrain(sys.organization,0,1) : 0.55;
    let organizationSupport = 0.42+0.58*organization;
    let shearSupport = 1-0.22*constrain(shear/8,0,1);
    let surfaceSupport = lnd ?
        0.52+0.20*(1-constrain(lnd,0,1)) : 1;
    let intensity = coreCirculationIntensityFactor(sys);

    let target = (0.05+0.65*moisturePotential+0.30*thermalPotential)*
        tropicalSupport*organizationSupport*shearSupport*surfaceSupport;
    // Moist environments can produce organized spiral bands around a weak
    // circulation. This positive allowance is what makes band formation lead
    // the inner-core response instead of waiting for hurricane-force winds.
    target += 0.12*moisturePotential*(1-0.55*intensity)*tropicalSupport;
    return constrain(target,0.04,1);
}

function updateRainbandActivity(sys,moisture,SST,shear,lnd,tropicalness){
    if(!sys) return 0;
    let current = Number.isFinite(sys.rainbandActivity) ?
        constrain(sys.rainbandActivity,0,1) : undefined;
    if(current===undefined){
        let organization = Number.isFinite(sys.organization) ?
            constrain(sys.organization,0,1) : 0.45;
        let tropical = constrain(Number.isFinite(tropicalness) ? tropicalness : 0.5,0,1);
        current = constrain(0.20+0.20*tropical+0.16*organization,0.08,0.62);
    }
    let target = rainbandEnvironmentTarget(
        sys,moisture,SST,shear,lnd,tropicalness
    );
    let convection = Number.isFinite(sys.convectiveActivity) ?
        constrain(sys.convectiveActivity,0,1) : undefined;
    if(convection!==undefined)
        target = lerp(target,convection,0.42);

    let previous = current;
    // Formation responds faster than decay: a moist pulse should be visible
    // within a few hourly simulation steps, while dry air removes bands more
    // gradually and leaves a realistic remnant shield.
    let moisturePotential = constrain((
        (Number.isFinite(moisture) ? moisture : 0.5)-0.30
    )/0.44,0,1);
    let response = target>=current ? 0.12+0.08*moisturePotential : 0.065;
    current = constrain(lerp(current,target,response),0,1);
    sys.rainbandActivity = current;

    let rise = Math.max(0,current-previous);
    // This is a bounded readiness signal, not a frame-time visual randomizer.
    // Persistent bands remain eligible to seed replacement, while a rapid
    // increase in a humid environment gets an extra formation pulse.
    sys.rainbandFormation = constrain(
        0.58*current+0.26*moisturePotential+1.8*rise,0,1
    );
    return current;
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

// Estimate how much of the inner circulation is interacting with land. The
// center point is intentionally dominant: a storm crossing an island should
// weaken materially, while a storm whose outer circulation only clips a coast
// should receive a much smaller penalty. Keep this as a scalar exposure for
// the thermodynamic model; the asymmetric land abrasion used by imagery is a
// separate visual effect.
function landfallExposureAtStorm(sys,lnd){
    let centerTerrain = Number.isFinite(lnd) ? constrain(lnd,0,1) : 0;
    if(centerTerrain>0){
        // Even low coastal terrain removes the ocean heat source. Elevation
        // changes the severity only modestly so a small island is not treated
        // as harmless simply because its pixels are low relief.
        let relief = radarSmoothStep(0.501,1,centerTerrain);
        return 0.86+0.14*relief;
    }

    // A center over water can still have the inner wind field over a coast.
    // If the map/runtime is unavailable (including small unit-test fixtures),
    // fall back to no peripheral exposure rather than guessing a scale.
    if(typeof land==='undefined' || !land ||
        typeof land.getAtXY!=='function' || !sys || !sys.pos ||
        !sys.basin || typeof MAP_TYPES==='undefined') return 0;

    let mapData = MAP_TYPES[sys.basin.mapType];
    if(!mapData) return 0;
    let radius = Number.isFinite(sys.radiusOfMaxWind) ?
        Math.max(8,sys.radiusOfMaxWind) : 30;
    let rmwX;
    let rmwY;
    if(mapData.form==='earth'){
        let longitudeSpan = mapData.east-mapData.west;
        if(longitudeSpan<=0) longitudeSpan += 360;
        let latitudeSpan = Math.abs(mapData.north-mapData.south);
        if(longitudeSpan<=0 || latitudeSpan<=0) return 0;

        let latitude = 0;
        if(typeof sys.coord==='function'){
            let c = sys.coord();
            if(c && Number.isFinite(c.latitude)) latitude = c.latitude;
        }
        let latitudeCosine = Math.max(0.25,Math.cos(latitude*Math.PI/180));
        let longitudeScale = WIDTH/longitudeSpan;
        let latitudeScale = HEIGHT/latitudeSpan;
        rmwX = radius/(60*latitudeCosine)*longitudeScale;
        rmwY = radius/60*latitudeScale;
    }else{
        // Procedural maps do not have a longitude/latitude scale. Their land
        // pixels are generated in the same 960x540 coordinate system, so use
        // a conservative physical-to-pixel conversion for the brush query.
        let radiusPixels = 10+(radius-8)*50/82;
        rmwX = radiusPixels;
        rmwY = radiusPixels;
    }
    if(!Number.isFinite(rmwX) || !Number.isFinite(rmwY)) return 0;

    // Sample the inner core and the edge of the circulation. The response is
    // capped well below a direct landfall even if most of the sampled ring is
    // over land, which keeps a coastal brush a secondary effect.
    let radii = [0.65,0.95,1.3,1.7];
    let weights = [1,0.82,0.5,0.22];
    let sectors = 16;
    let exposure = 0;
    let totalWeight = 0;
    for(let sample=0;sample<radii.length;sample++){
        let radialWeight = weights[sample];
        for(let sector=0;sector<sectors;sector++){
            let angle = sector*TAU/sectors;
            let sampleX = sys.pos.x+Math.cos(angle)*rmwX*radii[sample];
            let sampleY = sys.pos.y+Math.sin(angle)*rmwY*radii[sample];
            if(sampleX<0 || sampleX>WIDTH || sampleY<0 || sampleY>HEIGHT) continue;
            let terrain = land.getAtXY(sampleX,sampleY);
            totalWeight += radialWeight;
            if(terrain){
                let relief = radarSmoothStep(0.501,1,constrain(terrain,0,1));
                exposure += radialWeight*(0.55+0.45*relief);
            }
        }
    }
    if(totalWeight<=0) return 0;
    return constrain(exposure/totalWeight*0.42,0,0.42);
}

// Landfall damage to a storm's lower warm core should not disappear on the
// first ocean sample after the center leaves land. Keep a small amount of
// transient land-exposure memory on the live system and let it fade over
// several days. This state is deliberately not part of advisories or saves.
function lowerWarmCoreRecoveryFactor(sys,lnd,SST){
    if(!Number.isFinite(sys.landWarmCoreDamage)) sys.landWarmCoreDamage = 0;
    // Keep the helper independently callable for older save/test runtimes
    // that load this function without the surrounding algorithm definitions.
    let exposure = typeof landfallExposureAtStorm==='function' ?
        landfallExposureAtStorm(sys,lnd) :
        (Number.isFinite(lnd) && lnd>0 ? 0.86 : 0);
    let intensityFactor = landfallIntensityFactor(sys);
    let warmWaterRepair = landfallWarmWaterRepairFactor(SST);
    sys.landExposure = exposure;
    // Do not mark the storm as "not mature" while it is still over water;
    // most systems spend many hours over water before their first landfall.
    if(exposure>0 && sys.landfallMature===undefined)
        sys.landfallMature = exposure>0 && sys.windSpeed>=34 &&
            sys.organization>=0.45 && sys.lowerWarmCore>=0.42;
    if(exposure>0){
        let terrain = constrain(Number.isFinite(lnd) ? lnd : 0,0,1);
        // Landfall starts a lower-core collapse, but it is not an instant
        // switch. Move the damage toward an exposure-dependent target over
        // many hourly ticks; sustained inland exposure deepens the scar.
        // The map value is elevation, not fractional land coverage. Even low
        // coastal plains remove ocean heat flux; terrain changes the timescale.
        let relief = terrain>0 ? radarSmoothStep(0.501,1,terrain) : exposure;
        // Keep landfall as a gradual lower-core penalty. The previous target
        // was close to the full exposure value and made short island crossings
        // erase too much of the warm core.
        let targetDamage = 0.68*exposure;
        let intensityResponse = 0.28+0.72*intensityFactor;
        let collapseRate = 1-Math.exp(-(0.040+0.028*relief)*
            intensityResponse*(0.55+0.45*exposure));
        sys.landWarmCoreDamage += Math.max(0,targetDamage-
            sys.landWarmCoreDamage)*collapseRate;
        // A direct landfall should not rebuild the warm core during the same
        // tick. A peripheral brush retains most of the ocean response.
        return 1-exposure;
    }
    // Smooth recovery preserves a memory of inland exposure without a fixed
    // daily subtraction erasing a short island crossing on the next tick.
    // Warm water restores the ocean heat flux and moist inner-core
    // convection. Let high SST shorten the damage-memory timescale, while
    // cold water keeps the post-landfall scar persistent.
    // Slightly shorten the post-landfall repair timescale once the storm is
    // back over water, while keeping recovery gradual and SST-dependent.
    sys.landWarmCoreDamage *= Math.exp(-warmWaterRepair/28);
    if(sys.landWarmCoreDamage<0.0001) sys.landWarmCoreDamage = 0;
    let recoveryBoost = 0.92+0.08*warmWaterRepair;
    return constrain(1-0.60*sys.landWarmCoreDamage*recoveryBoost,0,1);
}

// Land friction and moisture loss are not equally effective against every
// circulation. Use the current wind as a deliberately shallow intensity
// proxy: a weak depression/TS receives a slower response, while a major
// hurricane still accumulates damage quickly. The floor keeps weak systems
// from becoming immune during a long inland crossing.
function landfallIntensityFactor(sys){
    let wind = sys && Number.isFinite(sys.windSpeed) ? sys.windSpeed : 60;
    let windPosition = constrain((wind-25)/105,0,1);
    return 0.2+0.8*windPosition;
}

// Once a storm is back over water, SST controls how quickly oceanic heat and
// deep convection rebuild the inner core. Keep the effect bounded so warm
// water helps repair a damaged structure without making recovery instant.
function landfallWarmWaterRepairFactor(SST){
    let temperature = Number.isFinite(SST) ? SST : 26;
    let warmWaterPosition = constrain((temperature-24)/6,0,1);
    return 0.65+0.95*warmWaterPosition;
}

function applyLowerWarmCoreResponse(previous,current,sensitivity,recoveryFactor,landDamage){
    let delta = current-previous;
    let rate = delta>0 ?
        min(1,sensitivity)*constrain(recoveryFactor,0,1) : sensitivity;
    // Landfall weakens the lower warm core over hours, not in one update. A
    // damaged core also recovers more slowly when it briefly returns over
    // water, matching the lingering friction/dry-air scar.
    landDamage = constrain(Number.isFinite(landDamage) ? landDamage : 0,0,1);
    if(delta<0 && landDamage>0)
        rate = min(1,sensitivity)*(0.42+0.36*(1-landDamage));
    return constrain(previous+delta*rate,0,1);
}

function landfallOrganizationFloor(sys,previousOrganization){
    let damage = Number.isFinite(sys.landWarmCoreDamage) ?
        constrain(sys.landWarmCoreDamage,0,1) : 0;
    let exposure = Number.isFinite(sys.landExposure) ?
        constrain(sys.landExposure,0,1) : 0;
    let wasMature = sys.landfallMature===true ||
        (sys.landfallMature===undefined && previousOrganization>=0.45);
    // Preserve a remnant of an established tropical circulation while it is
    // crossing or just leaving land. Without this floor, the land penalty can
    // drive organization to exactly zero; the pressure/wind model then sees a
    // wave and keeps weakening the storm even after it is back over water.
    if(max(damage,exposure)<=0.04 || !wasMature ||
        sys.windSpeed<34 || sys.lowerWarmCore<0.42 || sys.upperWarmCore<0.45)
        return 0;
    return 0.35+0.18*(1-damage);
}

function updateLandfallRadiusOfMaxWind(sys,shear,lnd){
    let landDamage = constrain(
        Number.isFinite(sys.landWarmCoreDamage) ? sys.landWarmCoreDamage : 0,
        0,1
    );
    if(landDamage<=0 || sys.type===MONSOON || !tropOrSub(sys.type)) return;
    // Friction and loss of the inner warm core broaden the wind maximum while
    // the outer circulation and rainfall shield persist.
    let targetRadius = targetRadiusOfMaxWind(sys,shear,lnd)*
        (1+0.78*landDamage);
    targetRadius = StormData.constrainRadiusOfMaxWind(targetRadius,sys.type);
    let adjustmentRate = 0.025+0.035*landDamage;
    sys.radiusOfMaxWind = StormData.constrainRadiusOfMaxWind(
        lerp(sys.radiusOfMaxWind,targetRadius,adjustmentRate),sys.type
    );
}

// Return the relative strength of the original and replacement eyewalls. The
// outer wall forms gradually, then hands off to a broader post-replacement
// eye. Once the cycle succeeds, the old inner wall goes away instead of
// leaving a permanent double-eyewall state.
function eyewallReplacementWeights(phase,failure=0,mode=0,memory=0,event=0){
    failure = Math.max(radarClamp(failure),0.72*radarClamp(event));
    memory = radarClamp(memory);
    if(failure>0){
        let normal = eyewallReplacementWeights(phase,0,0,memory);
        let failedInnerTarget = mode===1 ?
            (event>0 ? 0.24 : 0.08) : 0.65;
        return {
            inner: normal.inner*(1-failure)+failedInnerTarget*failure,
            outer: normal.outer*(1-failure)+0.8*failure
        };
    }
    phase = Number.isFinite(phase) ? constrain(phase,0,1) : 0;
    // A successful replacement leaves the new outer wall as the only primary
    // eyewall. The eye-size memory remains separate, so this handoff does not
    // force the clear eye back to the original radius.
    let postInner = memory>0 ? 0 : 1;
    let postOuter = memory>0 ? 1 : 0;
    if(phase<=0 || phase>=1)
        return {inner:postInner,outer:postOuter};
    let formation = radarSmoothStep(0.08,0.50,phase);
    // The old ring decays as the secondary ring takes over. Transfer the
    // weight into the new wall only after its radius has nearly converged.
    let closure = radarSmoothStep(0.80,1,phase);
    let inner = 1-0.78*radarSmoothStep(0.28,0.72,phase);
    return {
        inner: inner*(1-closure)+postInner*closure,
        outer: formation*(1-0.10*closure)*(1-closure)+postOuter*closure
    };
}

function eyewallReplacementWeakening(phase){
    phase = Number.isFinite(phase) ? constrain(phase,0,1) : 0;
    if(phase<=0 || phase>=1) return 0;
    let weights = eyewallReplacementWeights(phase);
    // A replacement should only gently perturb the circulation itself. Most
    // of its signal is carried by the two-wall imagery morphology below.
    return constrain(0.10*Math.sin(Math.PI*phase)+0.02*weights.outer,0,0.14);
}

// Convert the visual handoff memory into a small physical RMW expansion too.
// Without this, the imagery can show a settled outer wall while the normal
// core update quietly contracts the model back to its pre-replacement radius.
// The active expansion remains modest; the post-cycle memory is the part that
// prevents the RMW from snapping back to its original size.
function eyewallReplacementRadiusExpansion(sys,weights,cycleWeakening){
    let memory = sys && Number.isFinite(sys.eyewallReplacementMemory) ?
        radarClamp(sys.eyewallReplacementMemory) : 0;
    let failure = typeof simulatedEyewallFailureLevel==='function' ?
        simulatedEyewallFailureLevel(sys) : radarClamp(Math.max(
            sys && sys.eyewallFailure || 0,
            0.72*(sys && sys.eyewallFailureEvent || 0)
        ));
    let postGain = typeof EYEWALL_REPLACEMENT_POST_RADIUS_GAIN==='number' ?
        EYEWALL_REPLACEMENT_POST_RADIUS_GAIN : 0.90;
    let persistentExpansion = postGain*memory+0.65*failure;
    let activeExpansion = cycleWeakening>0 && weights ?
        0.35*radarClamp(weights.outer) : 0;
    return Math.max(persistentExpansion,activeExpansion);
}

function normalizeEyewallReplacementState(sys){
    if(!Number.isFinite(sys.eyewallCycle)) sys.eyewallCycle = 0;
    if(!Number.isFinite(sys.eyewallCycleCooldown) || sys.eyewallCycleCooldown<0)
        sys.eyewallCycleCooldown = 0;
    if(!Number.isFinite(sys.eyewallCycleDuration) || sys.eyewallCycleDuration<1)
        sys.eyewallCycleDuration = 48;
    sys.eyewallCycle = constrain(sys.eyewallCycle,0,1);
    sys.eyewallFailure = radarClamp(sys.eyewallFailure || 0);
    if(!Number.isFinite(sys.eyewallReplacementMemory) ||
        sys.eyewallReplacementMemory<0)
        sys.eyewallReplacementMemory = 0;
    sys.eyewallReplacementMemory = radarClamp(sys.eyewallReplacementMemory);
    if(!Number.isFinite(sys.eyewallReplacementHandoff) ||
        sys.eyewallReplacementHandoff<0)
        sys.eyewallReplacementHandoff = 0;
    sys.eyewallReplacementHandoff = radarClamp(
        sys.eyewallReplacementHandoff
    );
    if(!Number.isFinite(sys.eyewallFailureEvent) ||
        sys.eyewallFailureEvent<0)
        sys.eyewallFailureEvent = 0;
    sys.eyewallFailureEvent = radarClamp(sys.eyewallFailureEvent);
    if(!Number.isFinite(sys.eyewallFailureEventMode) ||
        sys.eyewallFailureEventMode<0)
        sys.eyewallFailureEventMode = 0;
    sys.eyewallFailureEventMode = constrain(
        Math.round(sys.eyewallFailureEventMode),0,2
    );
    if(!Number.isFinite(sys.eyewallFailureEventDuration) ||
        sys.eyewallFailureEventDuration<1)
        sys.eyewallFailureEventDuration =
            typeof EYEWALL_REPLACEMENT_FAILURE_EVENT_DURATION==='number' ?
                EYEWALL_REPLACEMENT_FAILURE_EVENT_DURATION : 18;
}

function updateEyewallReplacementCycle(sys,lnd,shear){
    normalizeEyewallReplacementState(sys);
    let wasActive = sys.eyewallCycle>0 && sys.eyewallCycle<1;
    let handoffDuration = typeof EYEWALL_REPLACEMENT_HANDOFF_DURATION===
        'number' ? EYEWALL_REPLACEMENT_HANDOFF_DURATION : 30;
    let handoffDecay = 1-Math.exp(-1/Math.max(1,handoffDuration));
    if(wasActive) sys.eyewallReplacementHandoff = 0;
    else if(sys.eyewallReplacementHandoff>0)
        sys.eyewallReplacementHandoff *= 1-handoffDecay;
    if(sys.eyewallFailureEvent>0){
        let eventDecay = 1-Math.exp(-1/sys.eyewallFailureEventDuration);
        sys.eyewallFailureEvent = Math.max(0,
            sys.eyewallFailureEvent*(1-eventDecay)
        );
        if(sys.eyewallFailureEvent<0.02)
            sys.eyewallFailureEventMode = 0;
    }
    // Resolve once per cycle, never per render frame. Failed walls develop
    // gradually, persist after the cycle and decay faster after landfall.
    if(sys.eyewallCycle>0 && sys.eyewallCycle<0.55) sys.eyewallFailureChecked = false;
    if(sys.eyewallCycle>=0.55 && !sys.eyewallFailureChecked){
        sys.eyewallFailureChecked = true;
        let chance = constrain(0.18+0.22*radarClamp(shear/6)+
            0.25*(1-radarClamp(sys.organization))+(lnd ? 0.15 : 0),0.18,0.65);
        sys.eyewallFailureMode = random()<chance ? (random()<0.5 ? 1 : 2) : 0;
    }
    let failedCycle = sys.eyewallCycle>=0.55 && sys.eyewallFailureMode>0;
    sys.eyewallFailure += failedCycle ? (1-sys.eyewallFailure)*0.16 :
        -sys.eyewallFailure*(1-Math.exp(-1/(lnd ? 12 : 48)));
    let residualExpansion = typeof EYEWALL_REPLACEMENT_RESIDUAL_EXPANSION===
        'number' ? EYEWALL_REPLACEMENT_RESIDUAL_EXPANSION : 0.24;
    let failureExpansion = typeof EYEWALL_REPLACEMENT_FAILURE_EXPANSION===
        'number' ? EYEWALL_REPLACEMENT_FAILURE_EXPANSION : 0.34;
    // Seed the post-cycle target as soon as a replacement starts. It grows
    // gradually with the wall, so the completed cycle already has a resolved
    // destination and cannot snap to the original eye.
    if(wasActive && sys.eyewallReplacementMemory<=0)
        sys.eyewallReplacementMemory = residualExpansion;
    sys.eyewallCycleCooldown = max(0,sys.eyewallCycleCooldown-1);

    let completedCycle = false;
    if(wasActive){
        // Landfall accelerates an unfinished cycle, allowing the replacement
        // ring to collapse over time instead of deleting the structure on the
        // first land sample.
        let accelerated = lnd || sys.type!==TROP || sys.windSpeed<80;
        let rate = (accelerated ? 1.6 : 1)/sys.eyewallCycleDuration;
        sys.eyewallCycle += rate;
        if(sys.eyewallCycle>=1){
            sys.eyewallCycle = 0;
            completedCycle = true;
            sys.eyewallCycleCooldown = random(
                EYEWALL_REPLACEMENT_MIN_COOLDOWN,
                EYEWALL_REPLACEMENT_MAX_COOLDOWN
            );
        }
    }

    // The completed outer wall leaves a smaller residual eye expansion. It
    // is deliberately a separate memory from the phase so resetting the
    // cycle flag cannot restore the original eye in one simulation step.
    if(completedCycle){
        sys.eyewallReplacementHandoff = 1;
        if(sys.eyewallFailureMode>0){
            // A failed replacement leaves a broader, less settled core and
            // emits a short-lived event for the imagery to resolve.
            sys.eyewallFailureEvent = 1;
            sys.eyewallFailureEventMode = sys.eyewallFailureMode;
            sys.eyewallFailureEventDuration =
                typeof EYEWALL_REPLACEMENT_FAILURE_EVENT_DURATION==='number' ?
                    EYEWALL_REPLACEMENT_FAILURE_EVENT_DURATION : 18;
            sys.eyewallReplacementMemory = Math.max(
                sys.eyewallReplacementMemory,failureExpansion
            );
        }else{
            sys.eyewallReplacementMemory = Math.max(
                sys.eyewallReplacementMemory,residualExpansion
            );
        }
    }else{
        if(sys.eyewallReplacementMemory>0){
            let memoryDecay = typeof EYEWALL_REPLACEMENT_MEMORY_DECAY==='number' ?
                EYEWALL_REPLACEMENT_MEMORY_DECAY : 0.0015;
            let residualFloor = sys.eyewallFailureMode>0 ||
                sys.eyewallFailureEvent>0 ? failureExpansion : residualExpansion;
            sys.eyewallReplacementMemory = Math.max(
                residualFloor,
                sys.eyewallReplacementMemory*(1-memoryDecay)
            );
        }
    }

    if(!Number.isFinite(sys.cloudEyeExpansion)) sys.cloudEyeExpansion = 0;
    // Keep the active eye response modest. The outer eyewall itself carries
    // the strong visual signal; the clear eye only grows to a bounded target
    // and then relaxes toward the residual post-cycle memory.
    let activeExpansionMax = typeof EYEWALL_REPLACEMENT_ACTIVE_EXPANSION_MAX===
        'number' ? EYEWALL_REPLACEMENT_ACTIVE_EXPANSION_MAX : 0.46;
    let activeExpansionTarget = sys.eyewallCycle>0 && !lnd && sys.type===TROP ?
        activeExpansionMax*radarSmoothStep(0.2,0.75,sys.eyewallCycle) : 0;
    let expansionTarget = Math.max(activeExpansionTarget,
        sys.eyewallReplacementMemory);
    let expansionRate = expansionTarget>sys.cloudEyeExpansion ? 0.12 :
        1-Math.exp(-1/(lnd ? 12 : 48));
    sys.cloudEyeExpansion = radarClamp(sys.cloudEyeExpansion+
        (expansionTarget-sys.cloudEyeExpansion)*expansionRate);

    if(wasActive) return;
    if(sys.eyewallCycle>=1) sys.eyewallCycle = 0;
    if(sys.eyewallCycleCooldown>0 || sys.eyewallFailure>0.1 || lnd || sys.type!==TROP) return;
    if(sys.windSpeed<EYEWALL_REPLACEMENT_MIN_WIND ||
        sys.organization<EYEWALL_REPLACEMENT_MIN_ORGANIZATION ||
        sys.lowerWarmCore<EYEWALL_REPLACEMENT_MIN_WARM_CORE ||
        sys.upperWarmCore<EYEWALL_REPLACEMENT_MIN_WARM_CORE) return;

    // A replacement is seeded by a sufficiently organized outer rainband
    // field. The state is maintained by updateRainbandActivity during the
    // normal storm tick, so this check remains meaningful when the selected
    // storm imagery (and therefore the detailed rainband raster) is absent.
    // Keep a compatibility fallback for old live systems and small fixtures
    // that do not yet carry the live rainband state.
    let rainbandActivity = Number.isFinite(sys.rainbandActivity) ?
        constrain(sys.rainbandActivity,0,1) :
        constrain(0.40+0.40*radarClamp(sys.organization),0,1);
    let rainbandFormation = Number.isFinite(sys.rainbandFormation) ?
        constrain(sys.rainbandFormation,0,1) : rainbandActivity;
    let rainbandReadiness = constrain(
        0.58*rainbandActivity+0.42*rainbandFormation,0,1
    );
    let rainbandThreshold = typeof RAINBAND_REPLACEMENT_THRESHOLD==='number' ?
        RAINBAND_REPLACEMENT_THRESHOLD : 0.56;

    let windMaturity = map(sys.windSpeed,EYEWALL_REPLACEMENT_MIN_WIND,155,0.35,1,true);
    let organizationMaturity = map(
        sys.organization,EYEWALL_REPLACEMENT_MIN_ORGANIZATION,0.92,0.45,1,true
    );
    let warmCoreMaturity = map(
        min(sys.lowerWarmCore,sys.upperWarmCore),
        EYEWALL_REPLACEMENT_MIN_WARM_CORE,1,0.5,1,true
    );
    let shearMaturity = map(shear,0,6,1,0.25,true);
    let rainbandMaturity = constrain(
        (rainbandReadiness-rainbandThreshold)/
            (1-rainbandThreshold),0,1
    );
    let baseTriggerRate = typeof EYEWALL_REPLACEMENT_TRIGGER_RATE==='number' ?
        EYEWALL_REPLACEMENT_TRIGGER_RATE : 0.0035;
    let rainbandTriggerRate = typeof RAINBAND_REPLACEMENT_TRIGGER_RATE==='number' ?
        RAINBAND_REPLACEMENT_TRIGGER_RATE : 0.010;
    // Keep the background chance for a mature cyclone, but make an actively
    // forming, moist band field the dominant route into a replacement cycle.
    let triggerRate = baseTriggerRate*(0.08+0.92*rainbandMaturity)+
        rainbandTriggerRate*rainbandMaturity;
    let triggerChance = triggerRate*
        windMaturity*organizationMaturity*warmCoreMaturity*shearMaturity;
    if(random()<triggerChance){
        sys.eyewallCycle = 0.001;
        sys.eyewallReplacementHandoff = 0;
        sys.eyewallReplacementMemory = Math.max(
            sys.eyewallReplacementMemory,residualExpansion
        );
        sys.eyewallFailureChecked = false;
        sys.eyewallFailureMode = 0;
        sys.eyewallCycleDuration = random(
            EYEWALL_REPLACEMENT_MIN_DURATION,
            EYEWALL_REPLACEMENT_MAX_DURATION
        );
    }
}

function circulationIntensificationRate(sys){
    let level = StormData.constrainCirculationSize(sys.circulationSize);
    let rate;
    if(level<1) rate = 1.8;
    else if(level>5) rate = 0.45;
    else rate = [1.6,1.3,1,0.75,0.55][level-1];
    // A mature compact eye can contract the inner circulation efficiently,
    // so its pressure fall responds faster. The multiplier fades in only
    // after tropical-storm strength and organization are present.
    return rate*coreEyeTypeIntensificationMultiplier(sys);
}

function circulationEnvironmentalSensitivity(sys){
    let level = StormData.constrainCirculationSize(sys.circulationSize);
    if(level<1) return 1.55;
    if(level>5) return 0.6;
    return [1.45,1.2,1,0.85,0.7][level-1];
}

function windPressureSizeFactors(sys){
    if(sys.type===MONSOON){
        let radius = constrain(sys.radiusOfMaxWind,45,110);
        return {
            pressure: map(radius,45,110,1.12,1.35),
            wind: map(radius,45,110,0.86,0.65)
        };
    }
    if(sys.type===EXTROP){
        let radius = constrain(sys.radiusOfMaxWind,25,140);
        return {
            pressure: map(radius,25,140,1.05,1.3),
            wind: map(radius,25,140,0.96,0.72)
        };
    }
    let radius = constrain(sys.radiusOfMaxWind,8,70);
    return {
        // Compact systems may reach a deeper pressure minimum in the same
        // environment; retain the broader-system end of the scale.
        pressure: map(radius,8,70,1.05,1.22),
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

// Upper-level outflow should primarily change how quickly a tropical cyclone
// approaches its environmental pressure ceiling, not create an unbounded new
// ceiling. Use a slightly nonlinear response so a genuinely strong channel is
// more effective than the old linear multiplier while weak signals remain
// close to neutral.
function tropicalOutflowPressureRateMultiplier(troughOutflow){
    let outflow = constrain(
        Number.isFinite(troughOutflow) ? troughOutflow : 0,0,1
    );
    return 1+2.2*pow(outflow,0.90);
}

// Pressure and wind are updated in separate steps. Give the wind response a
// smaller, bounded boost so a rapidly deepening storm does not keep reporting
// yesterday's wind speed for several hours, while avoiding an instant jump to
// the pressure-wind target.
function tropicalOutflowWindRateMultiplier(troughOutflow){
    let outflow = constrain(
        Number.isFinite(troughOutflow) ? troughOutflow : 0,0,1
    );
    return 1+0.90*pow(outflow,0.85);
}

// The strongest burst often occurs while a cyclone is phasing with the
// trough, before the outflow channel has reached its steady value. Track the
// environmental signal with a short low-pass memory and turn only its rising
// edge into a transient pulse. The pulse is live-only and decays naturally
// when the channel stops strengthening.
function tropicalOutflowPhasingBurst(sys,environmentalOutflow,tropicalSupport){
    if(!sys) return 0;
    let signal = constrain(
        Number.isFinite(environmentalOutflow) ? environmentalOutflow : 0,
        0,1
    );
    let previous = Number.isFinite(sys.troughOutflowMemory) ?
        constrain(sys.troughOutflowMemory,0,1) : 0;
    let rising = Math.max(0,signal-previous);
    sys.troughOutflowMemory = lerp(previous,signal,0.35);
    let support = constrain(
        Number.isFinite(tropicalSupport) ? tropicalSupport : 0,0,1
    );
    return constrain(1.65*rising*support,0,1);
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
        return max(
            1,
            stormRelativeWind*thermalEfficiency*coreEyeTypeWindPotential(sys)
        );
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
    let lowerWarmCoreRecovery = lowerWarmCoreRecoveryFactor(sys,lnd,SST);
    let landCoreDamage = constrain(sys.landWarmCoreDamage,0,1);
    let landExposure = constrain(
        Number.isFinite(sys.landExposure) ? sys.landExposure : (lnd ? 0.86 : 0),
        0,1
    );
    // `landCoreDamage` is a memory of earlier exposure; the instantaneous
    // exposure distinguishes a direct crossing from a coastal brush. Keep a
    // small residual stress after re-emergence so the storm can recover, but
    // do not continue applying full landfall losses for days over water.
    let landStress = constrain(max(landExposure,0.25*landCoreDamage),0,1);
    let landImpact = landStress*(0.35+0.65*landfallIntensityFactor(sys));
    
    // Over water, retain the existing lower core when the environment is not
    // strong enough to rebuild it. On land that floor is wrong: it makes the
    // target at least the current value, so friction can accumulate in
    // landWarmCoreDamage without ever pulling lowerWarmCore down.
    let oceanWarmCoreTarget = max(
        pow(map(SST,10,25,0,1,true),3),sys.lowerWarmCore
    );
    let landWarmCoreTarget = max(0.38,1-0.58*landCoreDamage);
    // Friction cannot rebuild a core that is already weaker than the
    // exposure-derived target. Keep the no-recovery guard local to land
    // contact; over water, the damaged target below may rise again normally.
    let exposedWarmCoreTarget = min(sys.lowerWarmCore,landWarmCoreTarget);
    let targetWarmCore = (
        landExposure>0 ? exposedWarmCoreTarget :
        landCoreDamage>0 ? min(oceanWarmCoreTarget,landWarmCoreTarget) :
            oceanWarmCoreTarget
    )*map(jet,0,75,sq(1-sys.depth),1,true);
    sys.lowerWarmCore = lerp(sys.lowerWarmCore,targetWarmCore,sys.lowerWarmCore>targetWarmCore ? map(jet,0,75,0.4,0.06,true) : 0.04);
    sys.upperWarmCore = lerp(sys.upperWarmCore,sys.lowerWarmCore,sys.lowerWarmCore>sys.upperWarmCore ? 0.05 : 0.4);
    sys.lowerWarmCore = constrain(sys.lowerWarmCore,0,1);
    sys.upperWarmCore = constrain(sys.upperWarmCore,0,1);
    sys.lowerWarmCore = applyLowerWarmCoreResponse(
        previousLowerWarmCore,
        sys.lowerWarmCore,
        environmentalSensitivity,
        lowerWarmCoreRecovery,
        landCoreDamage
    );
    sys.upperWarmCore = constrain(previousUpperWarmCore+(sys.upperWarmCore-previousUpperWarmCore)*environmentalSensitivity,0,1);
    let tropicalness = constrain(map(sys.lowerWarmCore,0.5,1,0,1),0,sys.upperWarmCore);
    let nontropicalness = constrain(map(sys.lowerWarmCore,0.75,0,0,1),0,1);
    let extratropicalPotential = extratropicalDevelopmentPotential(jet,moisture,shear,lnd);
    let environmentalOutflow = troughOutflowPotential(
        sys,jet,moisture,shear,SST,lnd
    );
    let tropicalOutflowSupport = tropicalness*
        map(previousOrganization,0.42,0.82,0,1,true);
    let troughOutflow = environmentalOutflow*tropicalOutflowSupport;
    let troughOutflowBurst = tropicalOutflowPhasingBurst(
        sys,environmentalOutflow,tropicalOutflowSupport
    );
    sys.troughOutflowBurst = troughOutflowBurst;
    // A rising outflow channel can briefly ventilate the storm more strongly
    // than its instantaneous steady-state value suggests. Keep this boost
    // separate so it cannot raise the long-term thermodynamic ceiling.
    let effectiveOutflow = constrain(
        troughOutflow+0.35*troughOutflowBurst,0,1
    );
    let outflowPressureRate = tropicalOutflowPressureRateMultiplier(effectiveOutflow);
    let outflowWindRate = tropicalOutflowWindRateMultiplier(effectiveOutflow);
    let effectiveTropicalShear = shear*lerp(1,0.55,effectiveOutflow);

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
    sys.organization += 2.4*troughOutflow+1.5*troughOutflowBurst;
    sys.organization -= pow(1.3,20-SST)*tropicalness;
    if(landImpact>0)
        sys.organization -= (1.5+8*landImpact)*
            map(tropicalness,0,1,0.35,1,true);
    sys.organization = constrain(
        organizationBeforeEnvironment+(sys.organization-organizationBeforeEnvironment)*environmentalSensitivity,
        0,100
    )/100;
    if(isMonsoon && sys.organization>previousOrganization)
        sys.organization = lerp(previousOrganization,sys.organization,0.25);
    let organizationFloor = landfallOrganizationFloor(sys,previousOrganization);
    if(organizationFloor>0)
        sys.organization = max(sys.organization,organizationFloor);

    updateWindFieldStructure(sys,shear,lnd);
    updateConvectiveActivity(sys,moisture,SST,effectiveTropicalShear,lnd,tropicalness);
    // This lightweight outer-core update runs regardless of UI selection. It
    // supplies the replacement judgment with a real rainband precursor
    // without rasterizing full structure for every unselected storm.
    updateRainbandActivity(sys,moisture,SST,effectiveTropicalShear,lnd,tropicalness);
    updateEyewallReplacementCycle(sys,lnd,shear);
    let cycleWeights = eyewallReplacementWeights(
        sys.eyewallCycle,
        sys.eyewallFailure,
        Number.isFinite(sys.eyewallFailureEventMode) &&
            sys.eyewallFailureEventMode>0 ?
            sys.eyewallFailureEventMode : sys.eyewallFailureMode,
        sys.eyewallReplacementMemory,
        sys.eyewallFailureEvent
    );
    let cycleWeakening = Math.max(eyewallReplacementWeakening(sys.eyewallCycle),0.22*sys.eyewallFailure);
    let replacementRadiusExpansion = eyewallReplacementRadiusExpansion(
        sys,cycleWeights,cycleWeakening
    );
    if(replacementRadiusExpansion>0){
        let cycleRadiusTarget = targetRadiusOfMaxWind(sys,shear,lnd) *
            (1+replacementRadiusExpansion);
        // Once the active cycle has closed, let the persistent memory hold the
        // expanded radius without creating a new abrupt radius jump.
        let radiusAdjustment = cycleWeakening>0 ? 0.06 : 0.025;
        sys.radiusOfMaxWind = StormData.constrainRadiusOfMaxWind(
            lerp(sys.radiusOfMaxWind,cycleRadiusTarget,radiusAdjustment),sys.type
        );
    }
    updateLandfallRadiusOfMaxWind(sys,shear,lnd);
    let sizeFactors = windPressureSizeFactors(sys);
    // Preserve the normal 25-30 C intensity curve, then let exceptionally warm
    // water keep adding potential without another upper clamp. The logarithmic
    // pressure response below supplies diminishing returns while still allowing
    // arbitrarily high SSTs to produce arbitrarily intense storms.
    let normalThermalPotential = lnd ? 0 :
        (map(SST,25,30,0,1,true)+max(0,map(SST,30,36,0,0.55))) *
        (1-0.75*landImpact);
    // Below 25 C, only an exceptionally efficient trough outflow channel can
    // unlock part of the otherwise unavailable pressure-fall potential. Keep
    // this capped so marginal water cannot imitate a deep warm pool.
    let marginalOutflowPotential = lnd ? 0 : min(
        0.45,
        map(SST,23.5,26,0,1,true)*troughOutflow*2.25 *
            (1-0.75*landImpact)
    );
    let thermalPotential = max(normalThermalPotential,marginalOutflowPotential);
    let targetPressure = 1010-25*log(1+thermalPotential)/log(1.17);
    targetPressure = lerp(1010,targetPressure,pow(sys.organization,3));
    targetPressure = 1010-(1010-targetPressure)*sizeFactors.pressure*
        coreEyeTypePressurePotential(sys);
    if(cycleWeakening>0)
        targetPressure = 1010-(1010-targetPressure)*(1-0.3*cycleWeakening);
    let pressureRate = (sys.pressure>targetPressure?0.05:0.08)*tropicalness;
    if(sys.pressure>targetPressure) pressureRate *= circulationIntensificationRate(sys);
    else pressureRate *= environmentalSensitivity;
    if(landImpact>0)
        // A center over land loses heat flux, but pressure does not
        // equilibrate to the ambient value in a single island-crossing
        // interval. Scale the response by exposure and intensity so a weak
        // cyclone does not receive the same abrupt pressure penalty.
        pressureRate *= 1-0.38*landImpact;
    if(sys.pressure>targetPressure) pressureRate *= outflowPressureRate;
    if(isMonsoon && sys.pressure>targetPressure) pressureRate *= 0.25;
    sys.pressure = lerp(sys.pressure,targetPressure,pressureRate);
    let pressureNoiseFactor = isMonsoon ? 0.35 : 1;
    let extratropicalTarget = 1014-58*pow(extratropicalPotential,1.35);
    let extratropicalRate = map(extratropicalPotential,0.25,1,0.002,0.034,true)*nontropicalness;
    if(sys.pressure>extratropicalTarget) extratropicalRate *= circulationIntensificationRate(sys);
    else extratropicalRate *= environmentalSensitivity;
    sys.pressure = lerp(sys.pressure,extratropicalTarget,extratropicalRate);
    if(sys.pressure>targetPressure && sys.organization>0.62){
        sys.pressure -= 0.32*pow(effectiveOutflow,1.35);
        // This small, capped impulse represents the initial mass exhaust as
        // the storm locks into the divergent side of the trough.
        sys.pressure -= 0.22*pow(troughOutflowBurst,1.20);
    }
    if(extratropicalPotential>0.86 && !lnd)
        sys.pressure -= map(extratropicalPotential,0.86,1,0,0.5,true)*nontropicalness;
    sys.pressure += random(-0.65,0.85)*(1-extratropicalPotential)*nontropicalness*pressureNoiseFactor;
    if(sys.organization<0.3) sys.pressure += random(-2,2.5)*tropicalness*pressureNoiseFactor;
    sys.pressure += 0.5*sys.interaction.shear/(1+map(sys.lowerWarmCore,0,1,4,0));
    sys.pressure += map(jet,0,75,5*pow(1-sys.depth,4),0,true);

    let targetWind = pressureWindTarget(sys,sizeFactors);
    if(isMonsoon) targetWind = min(65,targetWind);
    if(landCoreDamage>0)
        targetWind *= 1-0.32*landCoreDamage;
    if(cycleWeakening>0) targetWind *= 1-0.25*cycleWeakening;
    let windRate = isMonsoon && targetWind>sys.windSpeed ? 0.04 : 0.15;
    if(targetWind>sys.windSpeed) windRate *= circulationIntensificationRate(sys);
    else windRate *= environmentalSensitivity;
    if(targetWind>sys.windSpeed) windRate *= outflowWindRate;
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
    let lowerWarmCoreRecovery = lowerWarmCoreRecoveryFactor(sys,lnd,SST);
    let landCoreDamage = constrain(sys.landWarmCoreDamage,0,1);
    let landExposure = constrain(
        Number.isFinite(sys.landExposure) ? sys.landExposure : (lnd ? 0.86 : 0),
        0,1
    );
    let landStress = constrain(max(landExposure,0.25*landCoreDamage),0,1);
    let landIntensityFactor = landfallIntensityFactor(sys);
    let landImpact = landStress*(0.35+0.65*landIntensityFactor);
    
    sys.lowerWarmCore = lerp(sys.lowerWarmCore,0,map(jet,0,75,0.07,0));
    sys.lowerWarmCore = lerp(sys.lowerWarmCore,1,map(jet,50,100,0,map(SST,16,26,0,0.13,true),true));
    if(sys.upperWarmCore > sys.lowerWarmCore)
        sys.upperWarmCore = sys.lowerWarmCore;
    else
        sys.upperWarmCore = lerp(sys.upperWarmCore,sys.lowerWarmCore,0.015);
    sys.lowerWarmCore = constrain(sys.lowerWarmCore,0,1);
    sys.upperWarmCore = constrain(sys.upperWarmCore,0,1);
    if(landCoreDamage>0)
        sys.lowerWarmCore = min(
            sys.lowerWarmCore,max(0.38,1-0.58*landCoreDamage)
        );
    sys.lowerWarmCore = applyLowerWarmCoreResponse(
        previousLowerWarmCore,
        sys.lowerWarmCore,
        environmentalSensitivity,
        lowerWarmCoreRecovery,
        landCoreDamage
    );
    sys.upperWarmCore = constrain(previousUpperWarmCore+(sys.upperWarmCore-previousUpperWarmCore)*environmentalSensitivity,0,1);
    let tropicalness = (sys.lowerWarmCore+sys.upperWarmCore)/2;
    let extratropicalness = 1-tropicalness;
    let extratropicalPotential = extratropicalDevelopmentPotential(jet,moisture,shear,lnd);
    let environmentalOutflow = troughOutflowPotential(
        sys,jet,moisture,shear,SST,lnd
    );
    let tropicalOutflowSupport = tropicalness*
        map(previousOrganization,0.42,0.82,0,1,true);
    let troughOutflow = environmentalOutflow*tropicalOutflowSupport;
    let troughOutflowBurst = tropicalOutflowPhasingBurst(
        sys,environmentalOutflow,tropicalOutflowSupport
    );
    sys.troughOutflowBurst = troughOutflowBurst;
    let effectiveOutflow = constrain(
        troughOutflow+0.35*troughOutflowBurst,0,1
    );
    let outflowPressureRate = tropicalOutflowPressureRateMultiplier(effectiveOutflow);
    let outflowWindRate = tropicalOutflowWindRateMultiplier(effectiveOutflow);
    let effectiveTropicalShear = shear*lerp(1,0.55,effectiveOutflow);

    if(!lnd)
        sys.organization = lerp(sys.organization,1,sq(tropicalness)*map(SST,21,31,0,0.05,true));
    sys.organization = lerp(sys.organization,0,pow(3,effectiveTropicalShear*(1-moisture)*2.3)*0.0005);
    sys.organization = lerp(sys.organization,1,
        0.018*troughOutflow+0.010*troughOutflowBurst
    );
    // Keep the old high-relief friction cue small; the unified land-stress
    // response below supplies the gradual weakening for both lowland and
    // mountainous terrain.
    if(lnd>0.7)
        sys.organization = lerp(sys.organization,0,
            0.008*(0.35+0.65*landIntensityFactor));
    if(landImpact>0)
        sys.organization -= (0.012+0.04*landImpact)*
            map(tropicalness,0,1,0.35,1,true);
    sys.organization = constrain(
        previousOrganization+(sys.organization-previousOrganization)*environmentalSensitivity,
        0,1
    );
    if(isMonsoon && sys.organization>previousOrganization)
        sys.organization = lerp(previousOrganization,sys.organization,0.25);
    let organizationFloor = landfallOrganizationFloor(sys,previousOrganization);
    if(organizationFloor>0)
        sys.organization = max(sys.organization,organizationFloor);

    updateWindFieldStructure(sys,shear,lnd);
    updateConvectiveActivity(sys,moisture,SST,effectiveTropicalShear,lnd,tropicalness);
    updateRainbandActivity(sys,moisture,SST,effectiveTropicalShear,lnd,tropicalness);
    updateEyewallReplacementCycle(sys,lnd,shear);
    let cycleWeights = eyewallReplacementWeights(
        sys.eyewallCycle,
        sys.eyewallFailure,
        Number.isFinite(sys.eyewallFailureEventMode) &&
            sys.eyewallFailureEventMode>0 ?
            sys.eyewallFailureEventMode : sys.eyewallFailureMode,
        sys.eyewallReplacementMemory,
        sys.eyewallFailureEvent
    );
    let cycleWeakening = Math.max(
        eyewallReplacementWeakening(sys.eyewallCycle),
        0.22*sys.eyewallFailure
    );
    let replacementRadiusExpansion = eyewallReplacementRadiusExpansion(
        sys,cycleWeights,cycleWeakening
    );
    if(replacementRadiusExpansion>0){
        let cycleRadiusTarget = targetRadiusOfMaxWind(sys,shear,lnd) *
            (1+replacementRadiusExpansion);
        let radiusAdjustment = cycleWeakening>0 ? 0.06 : 0.025;
        sys.radiusOfMaxWind = StormData.constrainRadiusOfMaxWind(
            lerp(sys.radiusOfMaxWind,cycleRadiusTarget,radiusAdjustment),sys.type
        );
    }
    updateLandfallRadiusOfMaxWind(sys,shear,lnd);
    let sizeFactors = windPressureSizeFactors(sys);
    let hardCeiling = map(SST,21,31,1015,880);
    if(lnd)
        hardCeiling = 990;
    else
        hardCeiling = 1010-(1010-hardCeiling)*coreEyeTypePressurePotential(sys);
    let softCeiling = map(sys.organization,0.93,0.98,lerp(1020,hardCeiling,0.7),hardCeiling,true);
    softCeiling = 1010-(1010-softCeiling)*sizeFactors.pressure;
    let landPressureAdjustment = landExposure>0 ?
        0.35+0.65*landIntensityFactor : 1;
    sys.pressure = lerp(sys.pressure,1032,0.006*landPressureAdjustment);
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
    if(sys.pressure>softCeiling) tropicalPressureRate *= outflowPressureRate;
    sys.pressure = lerp(sys.pressure,softCeiling,tropicalPressureRate);
    if(sys.pressure>softCeiling && sys.organization>0.62){
        sys.pressure -= 0.32*pow(effectiveOutflow,1.35);
        sys.pressure -= 0.22*pow(troughOutflowBurst,1.20);
    }
    if(sys.pressure<1000)
        sys.pressure = lerp(sys.pressure,1000,min(1,tropicalness*(1-sys.organization)*0.01*environmentalSensitivity));
    sys.pressure = lerp(sys.pressure,1040,map(sys.pos.y,HEIGHT*0.97,HEIGHT,0,0.15,true));
    let terrainPressureRate = min(1,
        map(lnd,0.8,0.93,0,0.2,true)*environmentalSensitivity
    );
    if(terrainPressureRate>0)
        terrainPressureRate *= 0.35+0.65*landIntensityFactor;
    sys.pressure = lerp(sys.pressure,1040,terrainPressureRate);
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
            // A landfall interrupts rapid deepening, but must not erase a
            // mature cyclone's circulation. The gradual land-stress term
            // above handles weakening and lets an island-crossing storm keep
            // its TS/C1/C2 identity when it exits within a day.
        }
    }else if(random()<0.0001*circulationIntensificationRate(sys))
        sys.kaboom = 1;

    // Kaboom changes pressure and core structure above, so derive the wind from
    // those final values in the same tick. A faster response prevents rapidly
    // deepening storms from retaining a wind speed that belongs to an old pressure.
    let targetWind = pressureWindTarget(sys,sizeFactors);
    if(isMonsoon) targetWind = min(65,targetWind);
    if(landCoreDamage>0)
        targetWind *= 1-0.32*landCoreDamage;
    let windRate = isMonsoon && targetWind>sys.windSpeed ? 0.04 : 0.15;
    if(targetWind>sys.windSpeed) windRate *= circulationIntensificationRate(sys);
    else windRate *= environmentalSensitivity;
    if(targetWind>sys.windSpeed){
        windRate *= outflowWindRate;
        if(sys.kaboom===2)
            windRate = min(1,0.85*circulationIntensificationRate(sys)*outflowWindRate);
    }
    sys.windSpeed = lerp(sys.windSpeed,targetWind,windRate);

    if(sys.pressure > 1030 || sys.interaction.kill > 0)
        sys.kill = true;
};

// -- Type Determination -- //

const EXTRATROPICAL_TRANSITION_MIN_LATITUDE = 25;

function stormAbsoluteLatitude(sys){
    if(!sys || typeof sys.coord!=='function') return 90;
    let coord = sys.coord();
    return coord && Number.isFinite(coord.latitude) ? abs(coord.latitude) : 90;
}

function lowLatitudeLandfallBlocksExtratropicalTransition(sys){
    // Landfall can temporarily make a tropical cyclone look cold-core in the
    // lower troposphere. At low latitude that should not be enough to label
    // the system extratropical; retain its current tropical-family type until
    // it has genuinely moved into the baroclinic zone.
    if(stormAbsoluteLatitude(sys)>=EXTRATROPICAL_TRANSITION_MIN_LATITUDE)
        return false;
    let damage = Number.isFinite(sys.landWarmCoreDamage) ?
        constrain(sys.landWarmCoreDamage,0,1) : 0;
    let exposure = Number.isFinite(sys.landExposure) ?
        constrain(sys.landExposure,0,1) : 0;
    return max(damage,exposure)>0.04 || sys.landfallMature===true;
}

function landfallTropicalClassificationGrace(sys){
    let damage = Number.isFinite(sys.landWarmCoreDamage) ?
        constrain(sys.landWarmCoreDamage,0,1) : 0;
    let exposure = Number.isFinite(sys.landExposure) ?
        constrain(sys.landExposure,0,1) : 0;
    // A brief island crossing should not turn a still-dangerous warm-core
    // cyclone into a wave just because one hourly update crossed a threshold.
    // Release the grace once the wind is below TS strength or the core has
    // genuinely become too cold/decoupled for a tropical cyclone.
    return max(damage,exposure)>0.04 &&
        sys.windSpeed>=34 && sys.lowerWarmCore>=0.42 &&
        sys.upperWarmCore>=0.45;
}

STORM_ALGORITHM.defaults.typeDetermination = function(sys,u){
    let nextType = sys.type;
    switch(sys.type){
        case TROP:
            if(landfallTropicalClassificationGrace(sys)) break;
            nextType = sys.lowerWarmCore<0.55 ? EXTROP : ((sys.organization<0.4 && sys.windSpeed<50) || sys.windSpeed<20) ? sys.upperWarmCore<0.56 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.56 ? SUBTROP : TROP;
            break;
        case SUBTROP:
            nextType = sys.lowerWarmCore<0.55 ? EXTROP : ((sys.organization<0.4 && sys.windSpeed<50) || sys.windSpeed<20) ? sys.upperWarmCore<0.57 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.57 ? SUBTROP : TROP;
            break;
        case TROPWAVE:
            nextType = sys.lowerWarmCore<0.55 ? EXTROP : (sys.organization<0.45 || sys.windSpeed<25) ? sys.upperWarmCore<0.56 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.56 ? SUBTROP : TROP;
            break;
        case MONSOON:
            if(sys.lowerWarmCore<0.5)
                nextType = EXTROP;
            else if(sys.windSpeed<20)
                nextType = sys.upperWarmCore<0.52 ? EXTROP : TROPWAVE;
            else if(sys.organization>=0.72 && sys.upperWarmCore>=0.62)
                nextType = TROP;
            else if(sys.organization>=0.78)
                nextType = SUBTROP;
            break;
        default:
            nextType = sys.lowerWarmCore<0.6 ? EXTROP : (sys.organization<0.45 || sys.windSpeed<25) ? sys.upperWarmCore<0.57 ? EXTROP : TROPWAVE : sys.upperWarmCore<0.57 ? SUBTROP : TROP;
    }
    if(nextType===EXTROP && sys.type!==EXTROP &&
        lowLatitudeLandfallBlocksExtratropicalTransition(sys))
        nextType = sys.type;
    sys.type = nextType;
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
