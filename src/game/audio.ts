/**
 * Zero-dependency procedural Web Audio synthesizer for:
 * 1. Tactile wooden/brass wheel peg clicks, lotus chimes, duplicate bounce cue,
 *    level-up melodies, and finale fanfare (with iPadOS/iOS Safari unlock).
 * 2. Traditional Indian instrumental background music (Raga Bhupali: Tanpura drone,
 *    Tabla Keherwa groove, Ghungroo dance bells, Sitar & Bansuri bamboo flute).
 */

// Raga Bhupali frequencies (Sa = C)
const NOTE = {
  C2: 65.41,
  G2: 98.0,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
} as const;

interface MelodyStep {
  step: number; // 0..63 (4 bars of 16 sixteenth-notes)
  freq: number;
  glideFrom?: number;
  dur: number; // in seconds
  instrument: 'sitar' | 'bansuri';
  vel: number;
}

// 4-bar expressive Raga Bhupali melody (64 sixteenth-note steps, 102 BPM)
const BHUPALI_PHRASE_A: MelodyStep[] = [
  // Bar 1: Sitar ascending auspicious motif (Sa Re Ga Pa Dha Pa Ga)
  { step: 0, freq: NOTE.C4, dur: 0.45, instrument: 'sitar', vel: 0.72 },
  { step: 3, freq: NOTE.D4, glideFrom: NOTE.C4, dur: 0.32, instrument: 'sitar', vel: 0.65 },
  { step: 6, freq: NOTE.E4, glideFrom: NOTE.D4, dur: 0.48, instrument: 'sitar', vel: 0.78 },
  { step: 10, freq: NOTE.G4, glideFrom: NOTE.E4, dur: 0.55, instrument: 'sitar', vel: 0.82 },
  { step: 14, freq: NOTE.A4, dur: 0.35, instrument: 'sitar', vel: 0.7 },

  // Bar 2: Sitar playful ornamentation & return
  { step: 16, freq: NOTE.C5, glideFrom: NOTE.A4, dur: 0.58, instrument: 'sitar', vel: 0.85 },
  { step: 20, freq: NOTE.A4, dur: 0.32, instrument: 'sitar', vel: 0.68 },
  { step: 22, freq: NOTE.G4, dur: 0.42, instrument: 'sitar', vel: 0.75 },
  { step: 26, freq: NOTE.E4, glideFrom: NOTE.G4, dur: 0.45, instrument: 'sitar', vel: 0.72 },
  { step: 30, freq: NOTE.D4, dur: 0.32, instrument: 'sitar', vel: 0.62 },

  // Bar 3: Bansuri bamboo flute warm response
  { step: 32, freq: NOTE.E5, glideFrom: NOTE.D5, dur: 0.85, instrument: 'bansuri', vel: 0.68 },
  { step: 38, freq: NOTE.D5, dur: 0.52, instrument: 'bansuri', vel: 0.6 },
  { step: 42, freq: NOTE.C5, glideFrom: NOTE.D5, dur: 0.75, instrument: 'bansuri', vel: 0.66 },

  // Bar 4: Sitar & Bansuri gentle resolution to Sa
  { step: 48, freq: NOTE.A4, glideFrom: NOTE.C5, dur: 0.55, instrument: 'bansuri', vel: 0.6 },
  { step: 52, freq: NOTE.G4, dur: 0.45, instrument: 'sitar', vel: 0.74 },
  { step: 56, freq: NOTE.E4, dur: 0.38, instrument: 'sitar', vel: 0.7 },
  { step: 58, freq: NOTE.D4, dur: 0.32, instrument: 'sitar', vel: 0.64 },
  { step: 60, freq: NOTE.C4, glideFrom: NOTE.D4, dur: 0.62, instrument: 'sitar', vel: 0.78 },
];

const BHUPALI_PHRASE_B: MelodyStep[] = [
  // Bar 1: Higher joyful Bollywood dance variation
  { step: 0, freq: NOTE.G4, dur: 0.42, instrument: 'sitar', vel: 0.78 },
  { step: 2, freq: NOTE.A4, dur: 0.32, instrument: 'sitar', vel: 0.72 },
  { step: 4, freq: NOTE.C5, glideFrom: NOTE.A4, dur: 0.52, instrument: 'sitar', vel: 0.82 },
  { step: 8, freq: NOTE.D5, dur: 0.4, instrument: 'sitar', vel: 0.76 },
  { step: 12, freq: NOTE.C5, dur: 0.45, instrument: 'sitar', vel: 0.72 },

  // Bar 2: Descending cascades
  { step: 16, freq: NOTE.A4, glideFrom: NOTE.C5, dur: 0.42, instrument: 'sitar', vel: 0.75 },
  { step: 20, freq: NOTE.G4, dur: 0.38, instrument: 'sitar', vel: 0.7 },
  { step: 22, freq: NOTE.E4, dur: 0.35, instrument: 'sitar', vel: 0.68 },
  { step: 24, freq: NOTE.G4, dur: 0.42, instrument: 'sitar', vel: 0.76 },
  { step: 28, freq: NOTE.E4, dur: 0.36, instrument: 'sitar', vel: 0.66 },

  // Bar 3: Bansuri soaring motif
  { step: 32, freq: NOTE.G4, glideFrom: NOTE.E4, dur: 0.68, instrument: 'bansuri', vel: 0.64 },
  { step: 36, freq: NOTE.A4, dur: 0.55, instrument: 'bansuri', vel: 0.66 },
  { step: 40, freq: NOTE.C5, glideFrom: NOTE.A4, dur: 0.95, instrument: 'bansuri', vel: 0.72 },

  // Bar 4: Rhythmic sitar cadence back to C4
  { step: 48, freq: NOTE.D5, dur: 0.34, instrument: 'sitar', vel: 0.76 },
  { step: 50, freq: NOTE.C5, dur: 0.32, instrument: 'sitar', vel: 0.74 },
  { step: 52, freq: NOTE.A4, dur: 0.32, instrument: 'sitar', vel: 0.72 },
  { step: 54, freq: NOTE.G4, dur: 0.32, instrument: 'sitar', vel: 0.7 },
  { step: 56, freq: NOTE.E4, dur: 0.35, instrument: 'sitar', vel: 0.7 },
  { step: 58, freq: NOTE.D4, dur: 0.32, instrument: 'sitar', vel: 0.65 },
  { step: 60, freq: NOTE.C4, dur: 0.65, instrument: 'sitar', vel: 0.8 },
];

class MudraAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sfxGain: GainNode | null = null;
  private musicMasterGain: GainNode | null = null;
  private musicDelayNode: DelayNode | null = null;
  private musicDelayFeedback: GainNode | null = null;
  private musicWetGain: GainNode | null = null;

  private muted = false;
  private musicPlaying = false;
  private lastTickMs = 0;

  // Lookahead scheduler state for traditional Indian music
  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private phraseIndex = 0;
  private readonly stepDurationSec = 60 / 102 / 4; // 102 BPM, 16th-note grid

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Synchronously unlocks Web Audio on iPadOS / iOS Safari during any direct touch/click gesture.
   */
  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    // Play a 1-sample silent buffer once to guarantee iOS Safari unlocks hardware audio output
    try {
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore if context isn't ready yet
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Dedicated SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : 1;
      this.sfxGain.connect(this.ctx.destination);

      // Dedicated Music bus with subtle palace room echo
      this.musicMasterGain = this.ctx.createGain();
      this.musicMasterGain.gain.value = 0.0001;

      const warmFilter = this.ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.value = 6800;

      this.musicDelayNode = this.ctx.createDelay(0.6);
      this.musicDelayNode.delayTime.value = 0.27;
      this.musicDelayFeedback = this.ctx.createGain();
      this.musicDelayFeedback.gain.value = 0.24;
      this.musicWetGain = this.ctx.createGain();
      this.musicWetGain.gain.value = 0.2;

      this.musicMasterGain.connect(warmFilter);
      warmFilter.connect(this.ctx.destination);

      warmFilter.connect(this.musicDelayNode);
      this.musicDelayNode.connect(this.musicDelayFeedback);
      this.musicDelayFeedback.connect(this.musicDelayNode);
      this.musicDelayNode.connect(this.musicWetGain);
      this.musicWetGain.connect(this.ctx.destination);

      // Reusable 1-second white noise buffer for tabla skin, ghungroo bells & flute breath
      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getSfxContext(): { ctx: AudioContext; out: AudioNode } | null {
    if (this.muted) return null;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return null;
    return { ctx, out: this.sfxGain };
  }

  /**
   * Softly ducks background Indian music during chimes/fanfare so SFX always stay crisp.
   */
  private duckMusicTemporarily(durationSec = 0.7): void {
    if (!this.musicPlaying || !this.ctx || !this.musicMasterGain) return;
    const now = this.ctx.currentTime;
    this.musicMasterGain.gain.cancelScheduledValues(now);
    this.musicMasterGain.gain.setTargetAtTime(0.18, now, 0.04);
    this.musicMasterGain.gain.setTargetAtTime(0.32, now + durationSec, 0.25);
  }

  // =========================================================================
  // TRADITIONAL INDIAN INSTRUMENTAL BACKGROUND MUSIC
  // =========================================================================

  public setMusicPlaying(play: boolean): void {
    if (play === this.musicPlaying) return;
    if (play) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  private startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicMasterGain) return;

    this.musicPlaying = true;
    const now = ctx.currentTime;
    this.musicMasterGain.gain.cancelScheduledValues(now);
    this.musicMasterGain.gain.setValueAtTime(Math.max(0.0001, this.musicMasterGain.gain.value), now);
    this.musicMasterGain.gain.linearRampToValueAtTime(0.32, now + 0.45);

    this.currentStep = 0;
    this.phraseIndex = 0;
    this.nextStepTime = now + 0.06;

    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
    }
    this.schedulerId = window.setInterval(() => this.scheduleMusicSteps(), 70);
    this.scheduleMusicSteps();
  }

  private stopMusic(): void {
    this.musicPlaying = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.ctx && this.musicMasterGain) {
      const now = this.ctx.currentTime;
      this.musicMasterGain.gain.cancelScheduledValues(now);
      this.musicMasterGain.gain.setTargetAtTime(0.0001, now, 0.12);
    }
  }

  private scheduleMusicSteps(): void {
    if (!this.musicPlaying || !this.ctx || !this.musicMasterGain) return;

    const lookaheadSec = 0.22;
    while (this.nextStepTime < this.ctx.currentTime + lookaheadSec) {
      const stepInBar = this.currentStep % 16;
      const stepInPhrase = this.currentStep % 64;
      const t = this.nextStepTime;

      // 1. Tanpura drone cycle (4 slow resonant string plucks per bar: Pa - Sa' - Sa' - Sa)
      if (stepInBar === 0) this.playTanpuraString(NOTE.G2, t, 1.35, 0.14);
      if (stepInBar === 4) this.playTanpuraString(NOTE.C3, t, 1.35, 0.16);
      if (stepInBar === 8) this.playTanpuraString(NOTE.C3, t, 1.35, 0.14);
      if (stepInBar === 12) this.playTanpuraString(NOTE.C2, t, 1.55, 0.18);

      // 2. Tabla Keherwa 8-beat groove (16 sixteenth-note grid)
      // Dha(0) - Ge(2) - Na(4) - Ti(6) | Na(8) - Ka(10) - Dhi(12) - Na(14)
      if (stepInBar === 0) {
        this.playTablaBayan(t, 0.34, true);
        this.playTablaDayan(t, 0.24, false);
      } else if (stepInBar === 2) {
        this.playTablaBayan(t, 0.2, false);
      } else if (stepInBar === 4) {
        this.playTablaDayan(t, 0.22, false);
      } else if (stepInBar === 6) {
        this.playTablaDayan(t, 0.16, true);
      } else if (stepInBar === 8) {
        this.playTablaDayan(t, 0.23, false);
      } else if (stepInBar === 10) {
        this.playTablaDayan(t, 0.15, true);
      } else if (stepInBar === 12) {
        this.playTablaBayan(t, 0.28, true);
        this.playTablaDayan(t, 0.2, false);
      } else if (stepInBar === 14) {
        this.playTablaDayan(t, 0.19, false);
      }

      // 3. Subtle Ghungroo ankle-bell shimmer on off-beats
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        this.playGhungroo(t, stepInBar === 6 || stepInBar === 14 ? 0.065 : 0.04);
      }

      // 4. Sitar & Bansuri evolving Raga Bhupali phrases
      const phrase = this.phraseIndex % 2 === 0 ? BHUPALI_PHRASE_A : BHUPALI_PHRASE_B;
      for (const note of phrase) {
        if (note.step === stepInPhrase) {
          if (note.instrument === 'sitar') {
            this.playSitarNote(note.freq, t, note.dur, note.vel * 0.26, note.glideFrom);
          } else {
            this.playBansuriNote(note.freq, t, note.dur, note.vel * 0.22, note.glideFrom);
          }
        }
      }

      this.currentStep += 1;
      if (this.currentStep % 64 === 0) {
        this.phraseIndex += 1;
      }
      this.nextStepTime += this.stepDurationSec;
    }
  }

  private playTanpuraString(freq: number, time: number, dur: number, vol: number): void {
    const ctx = this.ctx;
    const dest = this.musicMasterGain;
    if (!ctx || !dest) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2.002, time); // subtle jawari sympathetic shimmer

    filter.type = 'lowpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(340, time);
    filter.frequency.exponentialRampToValueAtTime(920, time + 0.22);
    filter.frequency.exponentialRampToValueAtTime(360, time + dur);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.04);
    osc2.stop(time + dur + 0.04);
  }

  private playTablaBayan(time: number, vol: number, openResonance: boolean): void {
    const ctx = this.ctx;
    const dest = this.musicMasterGain;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dur = openResonance ? 0.29 : 0.14;

    osc.type = 'sine';
    // Classic Bayan upward wrist-slide ("meend") resonance
    osc.frequency.setValueAtTime(openResonance ? 112 : 124, time);
    osc.frequency.exponentialRampToValueAtTime(openResonance ? 142 : 95, time + 0.065);
    osc.frequency.exponentialRampToValueAtTime(84, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playTablaDayan(time: number, vol: number, damped: boolean): void {
    const ctx = this.ctx;
    const dest = this.musicMasterGain;
    if (!ctx || !dest) return;

    const dur = damped ? 0.065 : 0.16;

    // Tuned wooden/membrane fundamental (Sa = C4) + resonant harmonic
    const osc = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    harm.type = 'sine';
    osc.frequency.setValueAtTime(damped ? 310 : NOTE.C4, time);
    osc.frequency.exponentialRampToValueAtTime(damped ? 240 : NOTE.C4 * 0.99, time + dur);
    harm.frequency.setValueAtTime(NOTE.C5, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    const harmGain = ctx.createGain();
    harmGain.gain.value = damped ? 0.18 : 0.35;

    osc.connect(gain);
    harm.connect(harmGain);
    harmGain.connect(gain);
    gain.connect(dest);

    osc.start(time);
    harm.start(time);
    osc.stop(time + dur + 0.02);
    harm.stop(time + dur + 0.02);

    // Crisp fingertip skin slap transient
    if (this.noiseBuffer) {
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = damped ? 2100 : 1650;
      bp.Q.value = 2.4;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.45, time);
      nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.028);

      nSrc.connect(bp);
      bp.connect(nGain);
      nGain.connect(dest);
      nSrc.start(time);
      nSrc.stop(time + 0.032);
    }
  }

  private playGhungroo(time: number, vol: number): void {
    const ctx = this.ctx;
    const dest = this.musicMasterGain;
    if (!ctx || !dest || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 7600;
    hp.Q.value = 4.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.075);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.start(time);
    src.stop(time + 0.08);
  }

  private playSitarNote(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    glideFrom?: number,
  ): void {
    const ctx = this.ctx;
    const dest = this.musicMasterGain;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const buzz = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    buzz.type = 'triangle';

    if (glideFrom) {
      osc.frequency.setValueAtTime(glideFrom, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.075);
      buzz.frequency.setValueAtTime(glideFrom * 2.004, time);
      buzz.frequency.exponentialRampToValueAtTime(freq * 2.004, time + 0.075);
    } else {
      osc.frequency.setValueAtTime(freq, time);
      buzz.frequency.setValueAtTime(freq * 2.004, time);
    }

    // Resonant sitar bridge ("jawari") filter sweep
    filter.type = 'bandpass';
    filter.Q.value = 2.6;
    filter.frequency.setValueAtTime(Math.min(3400, freq * 4.5), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(580, freq * 1.8), time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.45;

    osc.connect(filter);
    buzz.connect(buzzGain);
    buzzGain.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    buzz.start(time);
    osc.stop(time + dur + 0.03);
    buzz.stop(time + dur + 0.03);
  }

  private playBansuriNote(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    glideFrom?: number,
  ): void {
    const ctx = this.ctx;
    const dest = this.musicMasterGain;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (glideFrom) {
      osc.frequency.setValueAtTime(glideFrom, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.11);
    } else {
      osc.frequency.setValueAtTime(freq, time);
    }

    // Gentle expressive bamboo flute vibrato
    lfo.type = 'sine';
    lfo.frequency.value = 5.1;
    lfoGain.gain.value = freq * 0.009;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    lp.type = 'lowpass';
    lp.frequency.value = 2200;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.11);
    gain.gain.setValueAtTime(vol * 0.9, time + Math.max(0.14, dur - 0.18));
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(dest);

    osc.start(time);
    lfo.start(time);
    osc.stop(time + dur + 0.04);
    lfo.stop(time + dur + 0.04);
  }

  // =========================================================================
  // WHEEL & GAME SOUND EFFECTS
  // =========================================================================

  /**
   * Soft wooden/brass peg tick as each sector divider passes the top pointer.
   * Works smoothly during both automatic spins and direct hand-dragging on iPad Pro.
   */
  public playTick(speedFactor = 1): void {
    const nowMs = performance.now();
    if (nowMs - this.lastTickMs < 18) return; // Prevent clipping during ultra-fast swipes
    this.lastTickMs = nowMs;

    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;

    const now = ctx.currentTime;
    const clampedSpeed = Math.min(1, Math.max(0.05, speedFactor));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 520 + clampedSpeed * 380;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(185, now + 0.032);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09 + clampedSpeed * 0.05, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  /**
   * Warm golden temple bell chime when the wheel settles on a Mudra.
   */
  public playMudraLand(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;
    this.duckMusicTemporarily(0.65);

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 warm triad

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.055;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  /**
   * Joyful ascending chime when advancing to the next level.
   */
  public playLevelAdvance(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;
    this.duckMusicTemporarily(0.75);

    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.065;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /**
   * Festive celebration fanfare on completing the 7-mudra Finale.
   */
  public playFinaleCelebration(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;
    this.duckMusicTemporarily(1.4);

    const now = ctx.currentTime;
    const melody = [
      { freq: 523.25, t: 0.0, dur: 0.25 },
      { freq: 587.33, t: 0.11, dur: 0.25 },
      { freq: 659.25, t: 0.22, dur: 0.25 },
      { freq: 783.99, t: 0.33, dur: 0.35 },
      { freq: 880.0, t: 0.48, dur: 0.35 },
      { freq: 1046.5, t: 0.64, dur: 0.9 },
      { freq: 659.25, t: 0.64, dur: 0.9 },
      { freq: 783.99, t: 0.64, dur: 0.9 },
    ];

    melody.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });
  }

  /**
   * Playful two-tone bounce cue when the same Mudra lands twice in a row
   * and triggers an automatic re-spin.
   */
  public playDuplicateRespin(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;
    this.duckMusicTemporarily(0.6);

    const now = ctx.currentTime;
    const notes = [
      { freq: 440, t: 0, dur: 0.16 },
      { freq: 392, t: 0.14, dur: 0.16 },
      { freq: 523.25, t: 0.3, dur: 0.24 },
    ];

    notes.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.03);
    });
  }

  /**
   * Subtle crisp countdown tick during the final 5 seconds of Time-Trial mode.
   */
  public playTimerTick(urgent = false): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(urgent ? 980 : 760, now);
    osc.frequency.exponentialRampToValueAtTime(urgent ? 640 : 520, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(urgent ? 0.12 : 0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * Resonant temple gong & descending cadence when the Time-Trial countdown reaches 0.
   */
  public playTimerExpired(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;
    this.duckMusicTemporarily(1.1);

    const now = ctx.currentTime;
    const tones = [
      { freq: 392.0, t: 0, dur: 0.32, type: 'triangle' as OscillatorType, vol: 0.13 },
      { freq: 329.63, t: 0.18, dur: 0.36, type: 'triangle' as OscillatorType, vol: 0.13 },
      { freq: 261.63, t: 0.36, dur: 0.85, type: 'sine' as OscillatorType, vol: 0.16 },
      { freq: 130.81, t: 0.36, dur: 0.95, type: 'triangle' as OscillatorType, vol: 0.12 },
    ];

    tones.forEach(({ freq, t, dur, type, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + t;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });
  }

  /**
   * Celebratory golden chime when awarding a full or half Tortue d'Or clue image to a family.
   */
  public playTortueReward(isFull: boolean): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;
    this.duckMusicTemporarily(isFull ? 1.15 : 0.7);

    const now = ctx.currentTime;
    const notes = isFull
      ? [
          { freq: NOTE.C4, t: 0, dur: 0.28, vol: 0.13 },
          { freq: NOTE.E4, t: 0.08, dur: 0.3, vol: 0.14 },
          { freq: NOTE.G4, t: 0.16, dur: 0.35, vol: 0.15 },
          { freq: NOTE.C5, t: 0.25, dur: 0.65, vol: 0.17 },
          { freq: NOTE.E5, t: 0.33, dur: 0.72, vol: 0.14 },
        ]
      : [
          { freq: NOTE.G4, t: 0, dur: 0.28, vol: 0.12 },
          { freq: NOTE.A4, t: 0.11, dur: 0.42, vol: 0.13 },
        ];

    notes.forEach(({ freq, t, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + t;

      osc.type = isFull ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });
  }

  /**
   * Short, unmistakable chime when marking a family's challenge for a level as passed or failed.
   */
  public playTeamLevelVerdict(passed: boolean): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;

    const now = ctx.currentTime;
    const notes = passed
      ? [
          { freq: NOTE.G4, t: 0, dur: 0.16, vol: 0.11, type: 'triangle' as OscillatorType },
          { freq: NOTE.C5, t: 0.075, dur: 0.26, vol: 0.13, type: 'triangle' as OscillatorType },
        ]
      : [
          { freq: NOTE.E4, t: 0, dur: 0.14, vol: 0.1, type: 'sine' as OscillatorType },
          { freq: NOTE.C4, t: 0.085, dur: 0.24, vol: 0.11, type: 'sine' as OscillatorType },
        ];

    notes.forEach(({ freq, t, dur, vol, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + t;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.03);
    });
  }
}

export const mudraAudio = new MudraAudioEngine();
