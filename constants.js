const TITLE = "Cyclone Simulator";
const VERSION_NUMBER = "0.34";

const SAVE_FORMAT = 7;  // Format #7 in use starting in v0.4
const EARLIEST_COMPATIBLE_FORMAT = 0;
const ENVDATA_COMPATIBLE_FORMAT = 0;

const WIDTH = 960; // 16:9 aspect ratio
const HEIGHT = 540;
const DIAMETER = 10;    // Storm icon diameter
const STORM_HIT_RADIUS = 20; // Keep the original click/touch target size
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const ADVISORY_TICKS = 6;    // Number of ticks per advisory
const YEAR_LENGTH = 365.2425*24;        // The length of a year in ticks; used for seasonal activity
const STEP = 30;            // Number of milliseconds in real time a simulation step lasts at default speed
const NHEM_DEFAULT_YEAR = moment.utc().year();
const SHEM_DEFAULT_YEAR = moment.utc().month() < 6 ? NHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR+1;
const DEPRESSION_LETTER = "H";
const WINDSPEED_ROUNDING = 5;
// const MAP_DEFINITION = 2;   // normal scaler for the land map
const EARTH_SB_IDS = {
    world: 0,
    nhem: 1,
    atl: 2,
    atlland: 3,
    epac: 4,
    epacland: 5,
    cpac: 6,
    wpac: 7,
    pagasa: 8,
    bob: 9,
    arb: 10,
    nioland: 11,
    medi: 12,
    shem: 128,
    aus: 129,
    jakarta: 130,
    pm: 131,
    swio: 132,
    spac: 133,
    satl: 134,
    nio: 192
};
const MAP_TYPES = [     // Land generation controls and option presets for different map types
    {   
		label: "Two Continents",
        form: "linear",
        landBiasFactors: [
            5/8,        // Where the "center" should be for land/ocean bias (0-1 scale from west to east)
            0.15,       // Bias factor for the west edge (positive = land more likely, negative = sea more likely)
            -0.3,       // Bias factor for the "center" (as defined by .landBiasFactors[0])
            0.1         // Bias factor for the east edge
        ],
        optionPresets: {
            designations: 22
        }
    },
    {   
		label: "East Continent",
        form: "linear",
        landBiasFactors: [
            5/8,
            -0.3,
            -0.3,
            0.15
        ],
        optionPresets: {
            designations: 22
        }
    },
    {   
		label: "West Continent",
        form: "linear",
        landBiasFactors: [
            1/2,
            0.15,
            -0.3,
            -0.3
        ],
        optionPresets: {
            designations: 22
        }
    },
    {   
		label: "Island Ocean",
        form: "linear",
        landBiasFactors: [
            1/2,
            -0.28,
            -0.28,
            -0.28
        ],
        optionPresets: {
            designations: 22
        }
    },
    {   
		label: "Central Continent",
        form: "radial",
        landBiasFactors: [
            1/2,    // Where the east-west center should be (0-1 scale from west to east)
            1/2,    // Where the north-south center should be (0-1 scale from north to south)
            1/2,    // First control distance (in terms of the geometric mean of the canvas dimensions)
            1,      // Second control distance
            0.15,   // Bias factor for the center
            -0.27,   // Bias factor for the first control distance
            -0.3    // Bias factor for the second control distance and outward
        ],
        optionPresets: {
            designations: 22
        }
    },
    {   
		label: "Central Inland Sea",
        form: "radial",
        landBiasFactors: [
            1/2,
            1/2,
            3/8,
            1,
            -0.3,
            0.2,
            0.3
        ],
        optionPresets: {
            designations: 22
        }
    },
    {   
		label: "Atlantic",
        form: 'earth',
        west: -102.67,
        east: 3,
        north: 59.45,
        south: 0,
        mainSubBasin: EARTH_SB_IDS.atl,
        optionPresets: {
            hem: 1,
            scale: 0,
            designations: 0
        }
    },
    {   
		label: "Eastern Pacific",
        form: 'earth',
        west: -180,
        east: -74.33,
        north: 59.45,
        south: 0,
        mainSubBasin: EARTH_SB_IDS.epac,
        optionPresets: {
            hem: 1,
            scale: 0,
            designations: 1
        }
    },
    {   
		label: "Western Pacific",
        form: 'earth',
        west: 94.42,
        east: -159.91,
        north: 59.45,
        south: 0,
        mainSubBasin: EARTH_SB_IDS.wpac,
        optionPresets: {
            hem: 1,
            scale: 3,
            designations: 3
        }
    },
    {   
		label: "Northern Indian Ocean",
        form: 'earth',
        west: 25.95,
        east: 131.62,
        north: 59.45,
        south: 0,
        mainSubBasin: EARTH_SB_IDS.nio,
        optionPresets: {
            hem: 1,
            scale: 4,
            designations: 5
        }
    },
    {   
		label: "Australian Region",
        form: 'earth',
        west: 82.03,
        east: -172.29,
        north: 0,
        south: -59.45,
        mainSubBasin: EARTH_SB_IDS.aus,
        optionPresets: {
            hem: 2,
            scale: 2,
            designations: 6
        }
    },
    {   
		label: "South Pacific",
        form: 'earth',
        west: 147.2,
        east: -107.13,
        north: 0,
        south: -59.45,
        mainSubBasin: EARTH_SB_IDS.spac,
        optionPresets: {
            hem: 2,
            scale: 2,
            designations: 7
        }
    },
    {   
		label: "South-West Indian Ocean",
        form: 'earth',
        west: 17.25,
        east: 122.93,
        north: 0,
        south: -59.45,
        mainSubBasin: EARTH_SB_IDS.swio,
        optionPresets: {
            hem: 2,
            scale: 5,
            designations: 8
        }
    },
    {   
		label: "South Atlantic",
        form: 'earth',
        west: -81.48,
        east: 24.19,
        north: 0,
        south: -59.45,
        mainSubBasin: EARTH_SB_IDS.satl,
        optionPresets: {
            hem: 2,
            scale: 0,
            designations: 9
        }
    },
    {   
		label: "Mediterranean",
        form: 'earth',
        west: -10.32,
        east: 42.52,
        north: 55.38,
        south: 25.65,
        mainSubBasin: EARTH_SB_IDS.medi,
        optionPresets: {
            hem: 1,
            scale: 0,
            designations: 10
        }
    }
];
const EARTH_MAP_PATH = 'resources/earth.png';
const EXTROP = 0;
const SUBTROP = 1;
const TROP = 2;
const TROPWAVE = 3;
// Keep new storm types at the end so numeric IDs in existing saves remain valid.
const MONSOON = 4;
const STORM_TYPES = 5;

// Eye diameters are stored in nautical miles. NOAA/AOML describes observed
// tropical-cyclone eyes spanning roughly 5-120 miles, with most around
// 20-40 miles; the pinhole-eye climatology uses <10 n mi. The five gameplay
// bins below turn those observations into stable, readable structural types.
// The 3 n mi lower bound is a simulation floor, not a claim that smaller eyes
// cannot be observed.
const EYE_TYPE_PINHOLE = 0;
const EYE_TYPE_SMALL = 1;
const EYE_TYPE_MEDIUM = 2;
const EYE_TYPE_LARGE = 3;
const EYE_TYPE_GIANT = 4;
const EYE_TYPE_COUNT = 5;
const EYE_TYPE_DEFS = Object.freeze([
    Object.freeze({
        key: 'pinhole',
        label: 'Pinhole eye (\u9488\u773c)',
        diameterMin: 3,
        diameterMax: 10,
        diameterLabel: '<10 nmi',
        typicalDiameter: 6,
        // Compact eyes contract and spin up more efficiently in the model.
        intensificationRate: 1.38,
        pressurePotential: 1.10,
        windPotential: 1.08,
        visualScale: 0.45
    }),
    Object.freeze({
        key: 'small',
        label: 'Small eye (\u5c0f\u773c)',
        diameterMin: 10,
        diameterMax: 20,
        diameterLabel: '10-20 nmi',
        typicalDiameter: 15,
        intensificationRate: 1.22,
        pressurePotential: 1.06,
        windPotential: 1.04,
        visualScale: 0.70
    }),
    Object.freeze({
        key: 'medium',
        label: 'Medium eye (\u4e2d\u773c)',
        diameterMin: 20,
        diameterMax: 40,
        diameterLabel: '20-40 nmi',
        typicalDiameter: 30,
        intensificationRate: 1,
        pressurePotential: 1,
        windPotential: 1,
        visualScale: 1
    }),
    Object.freeze({
        key: 'large',
        label: 'Large eye (\u5927\u773c)',
        diameterMin: 40,
        diameterMax: 80,
        diameterLabel: '40-80 nmi',
        typicalDiameter: 60,
        intensificationRate: 0.92,
        pressurePotential: 0.98,
        windPotential: 0.98,
        visualScale: 1.45
    }),
    Object.freeze({
        key: 'giant',
        label: 'Giant eye (\u5de8\u773c)',
        diameterMin: 80,
        diameterMax: 120,
        diameterLabel: '80-120 nmi',
        typicalDiameter: 100,
        intensificationRate: 0.86,
        pressurePotential: 0.96,
        windPotential: 0.96,
        visualScale: 1.8
    })
]);

// A mature tropical cyclone can contract its clear eye as the inner core
// tightens. These limits affect the live clear-eye diameter, not the broader
// circulation or the persistent eye-type category. The type-specific minimum
// diameter remains the final floor, so the eye can become very small without
// disappearing altogether.
const EYE_CONTRACTION_START_WIND = 85;
const EYE_CONTRACTION_FULL_WIND = 150;
const EYE_CONTRACTION_START_PRESSURE = 980;
const EYE_CONTRACTION_FULL_PRESSURE = 910;
const EYE_CONTRACTION_MAX_REDUCTION = 0.42;
const EYE_CONTRACTION_RESPONSE = 0.16;
const EYE_EXPANSION_RESPONSE = 0.07;
const WIND_FIELD_STYLE_NHC = 0;
const WIND_FIELD_STYLE_JTWC = 1;
const WIND_FIELD_STYLE_JMA = 2;
const WIND_FIELD_STYLE_NAMES = Object.freeze(['NHC', 'JTWC', 'JMA']);
const WIND_FIELD_STYLE_COUNT = WIND_FIELD_STYLE_NAMES.length;
const WIND_FIELD_QUADRANT_COUNT = 4;
const WIND_FIELD_QUADRANT_ARC_SAMPLES = 6;
const WIND_FIELD_JMA_MAX_ECCENTRICITY = 0.35;
const MONSOON_ICON = Object.freeze({
    symbol: 'MD',
    centerDiameter: 1.15,
    selectedDiameter: 1.35,
    circulationWidth: 2.25,
    circulationHeight: 1.6
});
const KEY_LEFT_BRACKET = 219;
const KEY_RIGHT_BRACKET = 221;
const KEY_F11 = 122;
const KEY_REPEAT_COOLDOWN = 15;
const KEY_REPEATER = 5;
const MAX_SNOW_LAYERS = 50;
const SNOW_SEASON_OFFSET = 5/6;
const ENV_LAYER_TILE_SIZE = 20;
const ISOBAR_GRID_SIZE = 12;
const ISOBAR_INTERVAL = 4;
const ISOBAR_LABEL_INTERVAL = 8;

// Temporary feature switches for derived weather imagery. The field
// implementations remain available so these layers can be restored without
// rebuilding their simulation logic.
const ENABLE_SIMULATED_BASE_SCAN_LAYER = false;
const ENABLE_SIMULATED_CLOUD_LAYER = false;

// Eyewall replacement cycles are only meaningful for mature tropical
// cyclones. The cycle is transient live-simulation state and is not recorded
// in storm advisories or saved basin data.
const EYEWALL_REPLACEMENT_MIN_WIND = 105;
const EYEWALL_REPLACEMENT_MIN_ORGANIZATION = 0.68;
const EYEWALL_REPLACEMENT_MIN_WARM_CORE = 0.7;
const EYEWALL_REPLACEMENT_MIN_DURATION = 36;
const EYEWALL_REPLACEMENT_MAX_DURATION = 60;
const EYEWALL_REPLACEMENT_MIN_COOLDOWN = 48;
const EYEWALL_REPLACEMENT_MAX_COOLDOWN = 96;
const EYEWALL_REPLACEMENT_TRIGGER_RATE = 0.0035;
// Eye-size response for a live eyewall replacement. The new outer wall can
// be much more prominent than the clear-eye expansion, so keep this response
// bounded and leave a smaller residual eye after a completed cycle.
const EYEWALL_REPLACEMENT_ACTIVE_EXPANSION_MAX = 0.46;
const EYEWALL_REPLACEMENT_RESIDUAL_EXPANSION = 0.24;
const EYEWALL_REPLACEMENT_MEMORY_DECAY = 0.0015;
const EYEWALL_REPLACEMENT_FAILURE_EXPANSION = 0.34;
const EYEWALL_REPLACEMENT_FAILURE_EVENT_DURATION = 18;
const EYEWALL_REPLACEMENT_POST_RADIUS_GAIN = 0.90;
// A successful replacement hands the imagery from the active two-wall
// structure to the settled outer wall over several simulation days. This is
// visual-only state; the physical cycle still completes at its normal time.
const EYEWALL_REPLACEMENT_HANDOFF_DURATION = 30;
// Rainband activity is simulated as a small live-only state on each active
// system. It gives eyewall replacement a physical precursor even when no
// cyclone is selected and the imagery raster is not being rendered.
const RAINBAND_REPLACEMENT_THRESHOLD = 0.56;
const RAINBAND_REPLACEMENT_TRIGGER_RATE = 0.010;

const NC_OFFSET_RANDOM_FACTOR = 4096;
const ACE_WIND_THRESHOLD = 34;
const ACE_DIVISOR = 10000;
const DAMAGE_DIVISOR = 1000;
// Wind-circle impact levels used by the damage/death model.  The existing
// exponential potentials describe the storm's overall intensity; these local
// multipliers make the 34/50/64 kt bands progressively more damaging.
const WIND_IMPACT_LEVELS = Object.freeze([
    {threshold:34, damageMultiplier:0.05, deathMultiplier:0.01},
    {threshold:50, damageMultiplier:0.15, deathMultiplier:0.04},
    {threshold:64, damageMultiplier:0.35, deathMultiplier:0.12}
]);
const WIND_IMPACT_REFERENCE_RADIUS = 100; // nautical miles; keeps exposure on the old scale
const WIND_IMPACT_REFERENCE_AREA = Math.PI * Math.pow(WIND_IMPACT_REFERENCE_RADIUS,2);
const WIND_IMPACT_RADIAL_SAMPLES = 3;
const ENVDATA_NOT_FOUND_ERROR = "envdata-not-found";
const LOADED_SEASON_REQUIRED_ERROR = "loaded-season-required";
const LOAD_MENU_BUTTONS_PER_PAGE = 6;
const DEFAULT_MAIN_SUBBASIN = 0;
const DEFAULT_OUTBASIN_SUBBASIN = 255;
const DESIG_CROSSMODE_ALWAYS = 0;
const DESIG_CROSSMODE_STRICT_ALWAYS = 1;
const DESIG_CROSSMODE_REGEN = 2;
const DESIG_CROSSMODE_STRICT_REGEN = 3;
const DESIG_CROSSMODE_KEEP = 4;
const SCALE_MEASURE_ONE_MIN_KNOTS = 0;
const SCALE_MEASURE_TEN_MIN_KNOTS = 1;
const SCALE_MEASURE_MILLIBARS = 2;
const SCALE_MEASURE_INHG = 3;
const SCALE_MEASURE_ONE_MIN_MPH = 4;
const SCALE_MEASURE_TEN_MIN_MPH = 5;
const SCALE_MEASURE_ONE_MIN_KMH = 6;
const SCALE_MEASURE_TEN_MIN_KMH = 7;
const MIN_SPEED = -5;
const MAX_SPEED = 5;

// Saving/loading-related constants

const AUTOSAVE_SAVE_NAME = "Autosave";
const DB_KEY_SETTINGS = "settings";
const LOADED_SEASON_EXPIRATION = 150000;    // minimum duration in miliseconds after a season was last accessed before it unloads (2.5 minutes)
const FORMAT_WITH_SAVED_SEASONS = 1;
const FORMAT_WITH_INDEXEDDB = 2;
const FORMAT_WITH_IMPROVED_ENV = 3;
const FORMAT_WITH_SUBBASIN_SEASON_STATS = 4;
const FORMAT_WITH_STORM_SUBBASIN_DATA = 5;
const FORMAT_WITH_SCALES = 6;
const FORMAT_WITH_EARTH_SUBBASINS = 7;
const FORMAT_WITH_LONG_LAT = 7;

// Legacy saving/loading-related constants (backwards-compatibility)

const LEGACY_SAVE_NAME_PREFIX = "Slot ";
const LOCALSTORAGE_KEY_PREFIX = "cyclone-sim-";
const LOCALSTORAGE_KEY_SAVEDBASIN = "savedbasin-";
const LOCALSTORAGE_KEY_BASIN = "basin";
const LOCALSTORAGE_KEY_FORMAT = "format";
const LOCALSTORAGE_KEY_NAMES = "names";
const LOCALSTORAGE_KEY_SEASON = "season-";
const LOCALSTORAGE_KEY_SETTINGS = "settings";
const SAVING_RADIX = 36;
// const ENVDATA_SAVE_FLOAT = -2;
const ENVDATA_SAVE_MULT = 10000;
// const ACTIVESYSTEM_SAVE_FLOAT = -2;

const HELP_TEXT = "Keyboard Controls:\n" +
    "\t\tSPACE - Pause/resume simulation\n" +
    "\t\tA - Step simulation one hour while paused\n" +
    "\t\tB - Clear buoy, then click the map to place a new one\n" +
    "\t\tE - Cycle through map layers (including wind and isobars)\n" +
    "\t\tF - Toggle wind field display\n" +
    "\t\tT - Cycle through track display modes\n" +
    "\t\tV - Toggle storm icons\n" +
    "\t\tW - Toggle intensity indicators below storm icons (kts / hPa)\n" +
    "\t\tM - Toggle magnifying glass for map layers\n" +
    "\t\t[ - Decrease simulation speed (half)\n" +
    "\t\t] - Increase simulation speed (double)\n" +
    "\t\tLEFT ARROW - Step backwards through analysis\n" +
    "\t\tRIGHT ARROW - Step forewards through analysis\n" +
    "\t\tCLICK + [special key] - Spawn [corresponding storm system]\n" +
    "\t\t\t\tX - Extratropical cyclone\n" +
    "\t\t\t\tL - Tropical Low/Wave\n" +
    "\t\t\t\tN - Monsoon Depression (MD)\n" +
    "\t\t\t\tD - Tropical Depression\n" +
    "\t\t\t\tS - Tropical Storm\n" +
    "\t\t\t\tU - Fujiwhara pair (two Category 2 cyclones)\n" +
    "\t\t\t\t[number key 1-9] - Category [1-9]* Tropical Cyclone\n" +
    '\t\t\t\t0 - Category 10* Tropical Cyclone\n' +
    '\t\t\t\tY - Hyperclone*\n' +
    '\t\t\t\t\t*must use Extended Saffir-Simpson scale to see C6+ storms';

const COLORS = {};      // For storing all colors used in the graphics

function defineColors(){    // Since p5 color() function doesn't work until setup(), this is called in setup()
    COLORS.bg = color(10,55,155);
    COLORS.storm = {};
    COLORS.storm[EXTROP] = color(220,220,220);
    COLORS.storm[TROPWAVE] = color(130,130,240);
    COLORS.storm[MONSOON] = color(45,190,205);
    COLORS.storm.extL = "red";
    COLORS.land = [];
    COLORS.land.push([0.85, color(190,190,190)]);
    COLORS.land.push([0.8, color(160,160,160)]);
    COLORS.land.push([0.75, color(145,115,90)]);
    COLORS.land.push([0.7, color(160,125,100)]);
    COLORS.land.push([0.65, color(35,145,35)]);
    COLORS.land.push([0.6, color(35,160,35)]);
    COLORS.land.push([0.55, color(30,175,30)]);
    COLORS.land.push([0.53, color(205,205,105)]);
    COLORS.land.push([0.5, color(230,230,105)]);
    COLORS.snow = color(240);
    COLORS.outBasin = color(45,70,120);
    COLORS.subBasinOutline = color(255,255,0);
    COLORS.UI = {};
    COLORS.UI.bar = color(200,100);
    COLORS.UI.box = color(200,170);
    COLORS.UI.buttonBox = color(200,170);
    COLORS.UI.buttonHover = color(200);
    COLORS.UI.text = color(0);
    COLORS.UI.greyText = color(130);
    COLORS.UI.redText = color(240,0,0);
    COLORS.UI.nonSelectedInput = color(70);
    COLORS.UI.input = color(255);
    COLORS.UI.loadingSymbol = color(0,40,85);
}
