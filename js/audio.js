import { CONFIG } from './config.js';

const A = CONFIG.audio;

// WebAudio engine/squeal loops plus one-shot beeps and thumps. The context is
// created on the first user gesture (mobile requirement). Mute is applied on the master gain.
export function createAudio(muted) {
  let ctx = null;
  let master, engineGain, osc1, osc2, squealGain;
  let isMuted = muted;

  function build() {
    master = ctx.createGain();
    master.gain.value = isMuted ? 0 : A.master;
    master.connect(ctx.destination);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(engineGain).connect(master);
    osc1.start();
    osc2.start();

    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 3;
    squealGain = ctx.createGain();
    squealGain.gain.value = 0;
    noise.connect(bp).connect(squealGain).connect(master);
    noise.start();
  }

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      build();
    }
    if (ctx.state !== 'running') ctx.resume();
  }
  const gestures = ['pointerdown', 'keydown', 'touchend'];
  const onGesture = () => {
    unlock();
    if (ctx && ctx.state === 'running') gestures.forEach((g) => window.removeEventListener(g, onGesture));
  };
  gestures.forEach((g) => window.addEventListener(g, onGesture));

  function envelope(node, peak, dur) {
    const t = ctx.currentTime;
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  return {
    setMuted(m) {
      isMuted = m;
      if (master) master.gain.value = m ? 0 : A.master;
    },
    // active: race running; speed 0..1 of top speed; slip: sideways speed
    update({ active, speed, throttle, slip, onTrack }) {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const f = A.engineBase + speed * A.engineRange + throttle * 12;
      osc1.frequency.setTargetAtTime(f, t, 0.05);
      osc2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
      engineGain.gain.setTargetAtTime(active ? A.engineVol * (0.55 + 0.45 * throttle) : 0, t, 0.08);
      const sq = active && onTrack ? Math.min(1, Math.max(0, (slip - A.squealSlip) / 8)) : 0;
      squealGain.gain.setTargetAtTime(sq * A.squealVol, t, 0.05);
    },
    beep(high) {
      if (!ctx || ctx.state !== 'running') return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = high ? 880 : 440;
      o.connect(g).connect(master);
      envelope(g, A.beepVol, high ? 0.5 : 0.18);
      o.start();
      o.stop(ctx.currentTime + (high ? 0.55 : 0.22));
    },
    thump(strength) {
      if (!ctx || ctx.state !== 'running') return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      o.connect(g).connect(master);
      envelope(g, A.thumpVol * Math.min(1, strength / 20), 0.3);
      o.start();
      o.stop(t + 0.32);
    },
  };
}
