export const CONFIG = {
  render: {
    maxPixelRatio: 2,
    clearColor: 0x2e7d32,
  },
  light: {
    ambient: 0.75,
    sun: 0.55,
    sunPos: [20, 100, 30],
  },
  camera: {
    viewHeight: 140, // world units visible vertically, same on every desktop screen
    viewHeightTouch: 95, // same, zoomed in on touch devices (small screens)
    height: 100,
    follow: 5, // lerp rate (1/s)
    lookAhead: 0.35, // seconds of velocity the camera leads by
    shakePerImpact: 0.06, // world units of shake per unit of impact speed
    shakeMax: 1.6,
    shakeDecay: 7, // 1/s
  },
  loop: {
    step: 1 / 60, // fixed physics timestep (s)
    maxFrame: 0.1, // clamp frame delta (tab-switch protection)
  },
  car: {
    maxSpeed: 82, // units/s forward
    reverseMax: 14,
    accel: 50,
    brake: 95,
    reverseAccel: 18,
    drag: 0.25, // proportional drag (1/s)
    rolling: 5, // constant coast-down decel when off throttle
    turnRate: 2.5, // rad/s at full steer
    turnSpeedRef: 14, // speed at which full turn rate is reached
    highSpeedTurn: 0.55, // fraction of turn rate lost at max speed
    grip: 4.5, // lateral velocity decay (1/s); lower = more slide
    slipDrag: 0.35, // speed lost per unit of sideways speed (drifting scrubs speed)
    steerSmooth: 9, // keyboard steer ramp (1/s)
    length: 4.6,
    width: 2.2,
    height: 0.9,
    radius: 1.4, // wall-collision radius
    overSpeedDecel: 3, // 1/s pull-down when above the surface speed cap
    grass: { speedMul: 0.4, dragAdd: 1.2, gripMul: 0.5 },
  },
  collision: {
    circles: [-1.2, 0, 1.2], // circle centres along the car's length
    radius: 1.15,
    restitution: 0.35, // bounciness of car-to-car hits
    speedLoss: 0.03, // extra fraction of speed lost per impact
  },
  effects: {
    skidSlip: 8, // sideways speed that leaves tyre marks
    brakeSkidSpeed: 45, // braking above this speed also marks
    skidWidth: 0.35,
    skidMinStep: 0.6, // units between mark segments
    skidMaxJump: 4,
    skidSegments: 700,
    skidLife: 12, // seconds
    skidAlpha: 0.55,
    skidY: 0.08,
    dustMax: 160,
    dustRate: 40, // particles/s per car at speed 40
    dustLife: 0.7,
    dustSize: 2.2, // world units
    dustAlpha: 0.5,
    dustSpread: 3,
    dustY: 2.4,
    impactMin: 4, // ignore bumps slower than this
    impactAudioRange: 40, // AI-vs-AI hits are audible this close to the player
  },
  audio: {
    master: 0.5,
    engineVol: 0.07,
    engineBase: 55, // Hz at standstill
    engineRange: 170, // extra Hz at top speed
    squealVol: 0.08,
    squealSlip: 7,
    thumpVol: 0.6,
    beepVol: 0.15,
  },
  race: {
    laps: 3,
    checkpoints: [0.25, 0.5, 0.75], // fractions of the loop, passed in order before the line counts
    graceTime: 6, // seconds the race continues after the player finishes
  },
  countdown: {
    seconds: 3, // 3-2-1 before GO
    goShow: 0.8, // how long "GO!" stays up
  },
  grid: {
    rowGap: 9, // units between grid rows
    lateral: 3.4, // units left/right of the centreline
    playerSlot: 2, // 0,1 = front row (left,right), 2,3 = second row
  },
  ai: {
    lookAhead: 10, // units
    lookAheadTime: 0.35, // extra seconds of speed
    steerGain: 2.2,
    cornerSafety: 0.88, // fraction of the physical min turn radius used when picking corner speed
    brakeDecel: 70, // units/s^2 assumed when planning braking
    minCornerSpeed: 14,
    maxOffset: 5, // units from centreline
    avoidDist: 26,
    avoidBehind: 5, // also avoid cars this far alongside/behind
    avoidWidth: 4,
    avoidOffset: 4.5,
    followDist: 16, // match the speed of a car this close ahead
    followMul: 0.97,
    tightGap: 7, // closer than this behind a car: slow below its speed
    avoidSmooth: 6, // 1/s
    rubberGain: 0.6, // speed multiplier per lap of gap to the player
    rubberMax: 0.08, // max speed-up when the player is ahead
    rubberSlow: 0.01, // max slow-down when the player is behind
    mistakeEvery: 4, // seconds between mistake rolls
    mistakeSteer: 0.2,
    mistakeTime: 0.3,
    stuckSpeed: 2,
    stuckTime: 1.5,
    reverseTime: 1.2,
  cars: [
      { name: 'Blue', color: 0x1e88e5, speedMul: 0.97, offset: -2.5, wobble: 0.5, mistake: 0.06 },
      { name: 'Yellow', color: 0xfdd835, speedMul: 1.0, offset: 2.0, wobble: 0.4, mistake: 0.04 },
      { name: 'Green', color: 0x43a047, speedMul: 1.03, offset: 0.0, wobble: 0.3, mistake: 0.02 },
    ],
    aiSlots: [0, 1, 3],
  },
  difficulty: { easy: 0.92, normal: 1.02, hard: 1.1 }, // AI speed multipliers
  // AI car physics multipliers per difficulty (the player always uses 1)
  difficultyPerf: {
    easy: { speed: 1, accel: 1, turn: 1 },
    normal: { speed: 1, accel: 1, turn: 1 },
    hard: { speed: 1, accel: 1, turn: 1 },
  },
  hud: { speedScale: 1.86 }, // world units/s -> displayed mph
  scenery: {
    margin: 4, // gap between the barrier and any prop
    spread: 110, // how far past the track bounds props are scattered
    density: 0.0011, // props per square unit (upper bound; spacing may cut it)
  },
  ghost: { opacity: 0.4, every: 2 }, // every = record one sample per N physics ticks
  cars: ['car01', 'car03', 'car04', 'car06', 'car08', 'car09', 'car10', 'car11', 'car12', 'car13', 'car14', 'car15', 'car16', 'car17', 'car18', 'car19', 'car20', 'car21', 'car22', 'car23', 'car24', 'car25', 'car26', 'car27', 'car28', 'car29', 'car30', 'car31', 'car32', 'car33', 'car34', 'car35', 'car36', 'car37', 'car38', 'car40', 'car41', 'car42', 'car43'], // sprite ids in assets/cars/
  player: {
    color: 0xe53935,
    startBack: 6, // units behind the start line
  },
  world: {
    groundSize: 3000,
    groundColor: 0x3f9b43,
    trackY: 0.02,
    kerbY: 0.04,
    wallY: 1.2,
    startY: 0.06,
  },
  track: {
    width: 14,
    samples: 300,
    asphaltColor: 0x3a3a3f,
    kerbWidth: 1.6,
    kerbRunSamples: 2, // samples per red/white stripe
    kerbColors: [0xd32f2f, 0xffffff],
    startDepth: 4,
    startCells: [10, 2], // checker cells across x along
    wallDist: 13, // barrier distance from centreline (must stay < tightest corner radius)
    wallThick: 1.2,
    wallColors: [0xcfd8dc, 0x78909c],
    wallRunSamples: 3,
    wallKill: 0.9, // fraction of into-wall velocity removed on impact
    wallScrape: 1.5, // speed bled per second while sliding along a wall (1/s)
  },
};

// Playable circuits. Each is merged over CONFIG.track, so any track.* key
// (width, colours, wallDist...) can be overridden per track. Points are [x, z]
// centreline control points, closed loop in travel order; the first point is the
// start line and must sit mid-straight. Keep corner radius above ~15 and
// different sections more than ~32 units apart so the barriers never overlap.
export const TRACKS = [
  {
    id: 'classic',
    name: 'Classic',
    scenery: 'forest',
    points: [
      [-100, 110], [0, 110], [100, 110],
      [170, 90], [195, 30],
      [158, -18], [100, -40],
      [85, -92], [140, -125],
      [120, -190], [30, -200],
      [-120, -172], [-180, -128],
      [-140, -78], [-50, -68],
      [-30, -20], [-80, 10], [-170, 10],
      [-195, 60], [-165, 100],
    ],
  },
  {
    id: 'speedway',
    name: 'Speedway',
    scenery: 'desert',
    groundColor: 0xb89a5e,
    asphaltColor: 0x34343a,
    points: [
      [0, 130], [130, 130], [240, 115], [300, 55],
      [300, -35], [245, -95], [170, -98], [125, -78],
      [80, -112], [20, -100], [-60, -100], [-150, -92],
      [-230, -50], [-262, 20], [-235, 95], [-150, 130],
    ],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    scenery: 'snow',
    groundColor: 0xa9b8c4,
    asphaltColor: 0x4a4f57,
    points: [
      [-40, 150], [60, 150], [130, 148], [190, 125],
      [208, 70], [168, 28], [112, 22], [78, -12],
      [102, -58], [172, -84], [218, -132], [192, -188],
      [120, -198], [60, -168], [0, -188], [-70, -202],
      [-138, -165], [-158, -108], [-118, -82], [-35, -72],
      [-10, -22], [-85, 12], [-160, 30], [-195, 85],
      [-185, 128], [-130, 150],
    ],
  },
  {
    id: 'city',
    name: 'City',
    scenery: 'city',
    groundColor: 0x6d7378,
    asphaltColor: 0x2e2f34,
    width: 12,
    samples: 420,
    points: [
      [-60, 150], [-8, 150], [44, 166], [96, 134], [148, 166], [190, 150],
      [217, 139], [228, 112], [217, 86], [190, 75], [148, 91], [96, 59],
      [44, 91], [-8, 59], [-60, 91], [-112, 59], [-164, 75], [-190, 75],
      [-217, 64], [-228, 38], [-217, 11], [-190, 0], [-154, 16], [-102, -16],
      [-50, 16], [2, -16], [54, 16], [106, -16], [158, 0], [190, 0],
      [217, -11], [228, -38], [217, -64], [190, -75], [154, -59], [102, -91],
      [50, -59], [-2, -91], [-54, -59], [-106, -91], [-158, -75], [-215, -75],
      [-280, -55], [-284, -3], [-316, 49], [-284, 101], [-290, 150], [-245, 175],
      [-190, 170], [-130, 150],
    ],
  },
];
