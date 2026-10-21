import { CONFIG, TRACKS } from './config.js';
import { createTrackData } from './track.js';
import { buildTrackMesh } from './trackMesh.js';

// Build the data + scene mesh for TRACKS[index]. Per-track keys override CONFIG.track.
export function makeTrack(index) {
  const def = TRACKS[index];
  const cfg = { ...CONFIG.track, ...def };
  const data = createTrackData(cfg);
  const world = { ...CONFIG.world, groundColor: def.groundColor ?? CONFIG.world.groundColor };
  return { id: def.id, name: def.name, data, mesh: buildTrackMesh(data, cfg, world) };
}

export function disposeTrack(track) {
  track.mesh.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.map?.dispose();
    o.material.dispose();
  });
}
