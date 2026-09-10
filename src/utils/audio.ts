/**
 * Web Audio API Notification Synthesizer
 * Generates a clean, modern, pleasant chime without external audio file dependencies.
 */
let audioCtx: AudioContext | null = null;
let lastNotificationTime = 0;
let lastTransferTime = 0;
let lastGuideSoundTime = 0;

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
 * Cancel any ongoing speech synthesis or audio
 */
export function cancelOngoingSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Plays a bright, warm two-tone notification chime (D5 -> A5)
 * Guarded by a 2000ms cooldown to prevent repeated or duplicate chimes.
 */
export function playNotificationChime() {
  const nowMs = Date.now();
  if (nowMs - lastNotificationTime < 2000) {
    return; // Block duplicate chime
  }
  lastNotificationTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primary bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);

    // Harmonic sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22); // E6

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn('Notification audio chime failed:', err);
  }
}

/**
 * Plays a triumphant cash/coin sound for verified money transfers
 * Guarded by a 2500ms cooldown to cancel and prevent repeated audio.
 */
export function playMoneyTransferSound() {
  const nowMs = Date.now();
  if (nowMs - lastTransferTime < 2500) {
    return; // Cancel repeated transfer audio
  }
  lastTransferTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Fast arpeggio mimicking gold coins/cash register (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (err) {
    console.warn('Money sound failed:', err);
  }
}

/**
 * Plays a bright completion chime for guide progress
 * Guarded by a 1500ms cooldown.
 */
export function playGuideSuccessSound() {
  const nowMs = Date.now();
  if (nowMs - lastGuideSoundTime < 1500) {
    return;
  }
  lastGuideSoundTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4 -> C#5 -> E5 -> A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  } catch (err) {
    console.warn('Guide sound failed:', err);
  }
}

let lastMsgReceivedTime = 0;
/**
 * Modern chat message received pop/ping (WhatsApp / Telegram style)
 */
export function playMessageReceivedSound() {
  const nowMs = Date.now();
  if (nowMs - lastMsgReceivedTime < 500) return;
  lastMsgReceivedTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // First bubble tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(740, now); // F#5
    osc1.frequency.exponentialRampToValueAtTime(1108, now + 0.07); // C#6

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second sweet overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1480, now + 0.04);
    gain2.gain.setValueAtTime(0, now + 0.04);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.22);
  } catch (err) {
    console.warn('Message sound failed:', err);
  }
}

let lastMsgSentTime = 0;
/**
 * Subtle sent message pop / click
 */
export function playMessageSentSound() {
  const nowMs = Date.now();
  if (nowMs - lastMsgSentTime < 300) return;
  lastMsgSentTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {}
}

let lastSwipeTime = 0;
/**
 * Tactile swipe-to-reply trigger tick
 */
export function playSwipeReplySound() {
  const nowMs = Date.now();
  if (nowMs - lastSwipeTime < 300) return;
  lastSwipeTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {}
}

let lastAttentionTime = 0;
/**
 * Attention Alert Chime (Prompt chip / Urgent attention request)
 */
export function playAttentionSound() {
  const nowMs = Date.now();
  if (nowMs - lastAttentionTime < 1500) return;
  lastAttentionTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [659.25, 783.99, 1046.50, 1318.51]; // E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.28);
    });
  } catch (err) {
    console.warn('Attention sound failed:', err);
  }
}

let lastCelebrationTime = 0;
/**
 * Triumphant Celebration fanfare (for blog publishing and milestones)
 */
export function playCelebrationSound() {
  const nowMs = Date.now();
  if (nowMs - lastCelebrationTime < 2000) return;
  lastCelebrationTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chords = [
      [523.25, 659.25, 783.99], // C major
      [587.33, 739.99, 880.00], // D major
      [659.25, 830.61, 987.77], // E major
      [1046.50, 1318.51, 1567.98], // High C major
    ];

    chords.forEach((chord, step) => {
      const stepStart = now + step * 0.12;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, stepStart);

        gain.gain.setValueAtTime(0, stepStart);
        gain.gain.linearRampToValueAtTime(0.12, stepStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, stepStart + (step === 3 ? 0.6 : 0.2));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(stepStart);
        osc.stop(stepStart + (step === 3 ? 0.6 : 0.2));
      });
    });
  } catch (err) {
    console.warn('Celebration sound failed:', err);
  }
}

