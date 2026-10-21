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
