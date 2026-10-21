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
    viewHeight: 140, // world units visible vertically, same on every device
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
    maxSpeed: 60, // units/s forward
    reverseMax: 14,
    accel: 34,
    brake: 70,
    reverseAccel: 18,
    drag: 0.25, // proportional drag (1/s)
    rolling: 5, // constant coast-down decel when off throttle
    turnRate: 2.5, // rad/s at full steer
    turnSpeedRef: 14, // speed at which full turn rate is reached
    highSpeedTurn: 0.45, // fraction of turn rate lost at max speed
    grip: 7, // lateral velocity decay (1/s); lower = more slide
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
    skidSlip: 6, // sideways speed that leaves tyre marks
    brakeSkidSpeed: 32, // braking above this speed also marks
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
    squealSlip: 5,
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
    cornerSafety: 0.96, // fraction of the physical min turn radius used when picking corner speed
    brakeDecel: 52, // units/s^2 assumed when planning braking
    minCornerSpeed: 14,
    maxOffset: 4, // units from centreline
    avoidDist: 20,
    avoidBehind: 3.5, // also avoid cars this far alongside/behind
    avoidWidth: 3,
    avoidOffset: 3.5,
    followDist: 9, // match the speed of a car this close ahead
    followMul: 0.99,
    avoidSmooth: 5, // 1/s
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
    hard: { speed: 1.06, accel: 1.15, turn: 1.04 },
  },
  hud: { speedScale: 1.86 }, // world units/s -> displayed mph
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
    // Centreline control points [x, z], closed loop, travel order
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
