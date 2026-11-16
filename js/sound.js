// Synthétiseur audio 100% natif (Web Audio API) sans fichiers MP3 externes
export function createSoundSystem() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = AudioCtx ? new AudioCtx() : null;

  function ensureRunning() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone(freqStart, freqEnd, duration, type = 'sine', volume = 0.15) {
    if (!ctx) return;
    ensureRunning();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  function playNoise(duration, volume = 0.2) {
    if (!ctx) return;
    ensureRunning();

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  return {
    shoot() {
      playNoise(0.14, 0.28);
      playTone(180, 45, 0.11, 'sawtooth', 0.18);
    },
    reload() {
      playTone(320, 480, 0.08, 'triangle', 0.12);
      setTimeout(() => playTone(480, 640, 0.09, 'triangle', 0.12), 110);
    },
    hitEnemy(isHeadshot = false) {
      if (isHeadshot) {
        // Double tintement aigu pour un Headshot
        playTone(980, 1450, 0.08, 'sine', 0.2);
        setTimeout(() => playTone(1320, 1760, 0.12, 'sine', 0.18), 60);
      } else {
        playTone(420, 210, 0.07, 'triangle', 0.16);
      }
    },
    enemyAlert() {
      playTone(260, 520, 0.16, 'sawtooth', 0.08);
    },
    enemyLaserShot() {
      playTone(880, 220, 0.18, 'sawtooth', 0.12);
    },
    playerHurt() {
      playTone(140, 55, 0.22, 'sawtooth', 0.25);
    },
    dispose() {
      if (ctx && ctx.state !== 'closed') {
        ctx.close();
      }
    },
  };
}