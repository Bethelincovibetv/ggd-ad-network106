// Audio synthesis for redeeming Airtime & Data packages
// Generates a rich, celebratory arcade jackpot chime:
// 1. Cascading coin drops (falling pitch arpeggio + shimmer)
// 2. Victorious redemption fanfare cord (C5 -> E5 -> G5 -> C6 -> E6)
// 3. Crisp cash register ding / resonant metallic unlock

let audioCtx: AudioContext | null = null;
let lastRedeemSoundTime = 0;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a celebratory redemption sound effect:
 * - Falling coins sparkle effect
 * - Multi-harmonic victory fanfare chord
 * - Resonant golden chime
 */
export function playRedeemSound() {
  const nowMs = Date.now();
  if (nowMs - lastRedeemSoundTime < 600) return;
  lastRedeemSoundTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Fast ascending coin pings (slot machine / arcade voucher unlock)
    const coinPitches = [659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98]; // E5 -> G5 -> B5 -> C6 -> E6 -> G6
    coinPitches.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0, now + idx * 0.045);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.3);
    });

    // 2. Sustained warm bell chord on unlock (0.28s in)
    const chordTime = now + 0.28;
    const victoryChord = [523.25, 659.25, 783.99, 1046.50]; // C Major triumph
    victoryChord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0, chordTime);
      gain.gain.linearRampToValueAtTime(0.15, chordTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0005, chordTime + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(chordTime);
      osc.stop(chordTime + 0.8);
    });

    // 3. High sparkling overtone ping (bright shimmer 1800Hz & 2400Hz)
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(2093.00, chordTime + 0.05); // C7 bell ring
    sparkleGain.gain.setValueAtTime(0, chordTime + 0.05);
    sparkleGain.gain.linearRampToValueAtTime(0.12, chordTime + 0.07);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0005, chordTime + 0.6);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);
    sparkleOsc.start(chordTime + 0.05);
    sparkleOsc.stop(chordTime + 0.65);

  } catch (err) {
    console.warn('Redeem sound playback skipped:', err);
  }
}
