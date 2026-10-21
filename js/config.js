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
    follow: 4, // lerp rate (1/s)
    demoSpeed: 40, // M2 only: units/s the camera tours the track
  },
  world: {
    groundSize: 3000,
    groundColor: 0x3f9b43,
    trackY: 0.02,
    kerbY: 0.04,
    startY: 0.06,
  },
  track: {
    // Centreline control points [x, z], closed loop, travel order
    points: [
      [-100, 110], [0, 110], [100, 110],
      [170, 90], [195, 30],
      [150, -25], [85, -35],
      [70, -95], [118, -142],
      [50, -190], [-45, -178],
      [-115, -165], [-165, -115],
      [-115, -80], [-50, -68],
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
  },
};
