// WebAudio synth SFX — no assets, poker-table feel without gambling vibe
let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
function tone(freq: number, dur = 0.08, type: OscillatorType = 'sine', gain = 0.12, when = 0) {
  try {
    const c = ac();
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.02);
  } catch { /* muted */ }
}
export const sfx = {
  deal() { tone(520, 0.06, 'triangle', 0.1); tone(780, 0.05, 'triangle', 0.07, 0.05); },
  flip() { tone(340, 0.07, 'square', 0.05); tone(660, 0.06, 'triangle', 0.08, 0.04); },
  chip() { tone(1200, 0.05, 'square', 0.06); tone(1600, 0.07, 'square', 0.05, 0.05); },
  combo() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'sawtooth', 0.06, i * 0.07)); },
  adopt() { tone(880, 0.1, 'triangle', 0.1); tone(1174, 0.14, 'triangle', 0.1, 0.09); },
  retire() { tone(300, 0.15, 'sawtooth', 0.07); tone(200, 0.2, 'sawtooth', 0.06, 0.1); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, i * 0.12)); },
  turn() { tone(440, 0.09, 'sine', 0.09); },
};
