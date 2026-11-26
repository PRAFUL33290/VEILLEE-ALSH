/**
 * Zero-dependency procedural Web Audio synthesizer for:
 * 1. Tactile wooden/brass wheel peg clicks, lotus chimes, duplicate bounce cue,
 *    level-up melodies, and finale fanfare (with iPadOS/iOS Safari unlock).
 * 2. Traditional Indian instrumental background music (Raga Bhupali: Tanpura drone,
 *    Tabla Keherwa groove, Ghungroo dance bells, Sitar & Bansuri bamboo flute).
 */

// Raga Bhupali & Raga Yaman (fairy F#5/F#6) frequencies (Sa = C)
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
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  Fs6: 1479.98,
  G6: 1567.98,
  A6: 1760.0,
  B6: 1975.53,
  C7: 2093.0,
} as const;

// Raga Yaman / Lydian fairy bell scale for magical spinning sparkles
const FAIRY_CHIME_SCALE = [
  NOTE.C6,
  NOTE.D6,
  NOTE.E6,
  NOTE.Fs6,
  NOTE.G6,
  NOTE.A6,
  NOTE.B6,
  NOTE.C7,
] as const;

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

interface FairySpinAuraNodes {
  masterGain: GainNode;
  tremoloGain: GainNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  oscillators: OscillatorNode[];
  noiseSrc: AudioBufferSourceNode | null;
}

class MudraAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sfxGain: GainNode | null = null;
  private sfxShimmerBus: GainNode | null = null;
  private musicMasterGain: GainNode | null = null;
  private musicDelayNode: DelayNode | null = null;
  private musicDelayFeedback: GainNode | null = null;
  private musicWetGain: GainNode | null = null;

  private muted = false;
  private sfxVolume = 1;
  private musicPlaying = false;
  private lastTickMs = 0;
  private fairyStepIndex = 0;
  private fairyAura: FairySpinAuraNodes | null = null;
  private globalUnlockBound = false;

  // Lookahead scheduler state for traditional Indian music
  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private phraseIndex = 0;
  private readonly stepDurationSec = 60 / 102 / 4; // 102 BPM, 16th-note grid

  constructor() {
    this.bindGlobalUnlockListeners();
  }

  /**
   * Keeps Web Audio alive & automatically recovers on iPadOS/iOS Safari whenever
   * the context is suspended or put into the 'interrupted' state (e.g., after YouTube playback or app switch).
   */
  private bindGlobalUnlockListeners(): void {
    if (typeof window === 'undefined' || this.globalUnlockBound) return;
    this.globalUnlockBound = true;

    const resumeIfNeeded = () => {
      if (!this.ctx) {
        this.unlock();
        return;
      }
      if (this.ctx.state !== 'running') {
        this.unlock();
      }
    };

    window.addEventListener('touchstart', resumeIfNeeded, { capture: true, passive: true });
    window.addEventListener('touchend', resumeIfNeeded, { capture: true, passive: true });
    window.addEventListener('pointerdown', resumeIfNeeded, { capture: true, passive: true });
    window.addEventListener('click', resumeIfNeeded, { capture: true, passive: true });
    window.addEventListener('keydown', resumeIfNeeded, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx && this.ctx.state !== 'running') {
        void this.ctx.resume().catch(() => {});
      }
    });
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  public setSfxVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 1));
    this.sfxVolume = clamped;
    if (clamped <= 0.001) {
      this.muted = true;
      this.stopSpinFairy();
    } else {
      this.muted = false;
    }
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : clamped * 1.45, now, 0.015);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopSpinFairy();
    } else if (this.sfxVolume <= 0.001) {
      this.sfxVolume = 0.85;
    }
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : this.sfxVolume * 1.45, now, 0.02);
    }
  }

  /**
   * Synchronously unlocks & resumes Web Audio on iPadOS / iOS Safari during any direct touch/click gesture.
   * Handles both 'suspended' and iOS-specific 'interrupted' AudioContext states.
   */
  public unlock(): void {
    // Request playback audio session on iPadOS/iOS Safari 17+ so SFX bypass the silent switch
    // and co-exist cleanly with embedded YouTube Music playback
    try {
      const nav = navigator as Navigator & { audioSession?: { type?: string } };
      if (nav.audioSession && nav.audioSession.type !== 'playback') {
        nav.audioSession.type = 'playback';
      }
    } catch {
      // Unsupported browser or restricted iframe
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
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

    // Rebuild cleanly if the browser ever closed the AudioContext
    if (this.ctx && this.ctx.state === 'closed') {
      this.ctx = null;
      this.sfxGain = null;
      this.sfxShimmerBus = null;
      this.musicMasterGain = null;
      this.noiseBuffer = null;
      this.fairyAura = null;
    }

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master SFX limiter so boosted wheel & victory FX stay loud, punchy, and distortion-free
      const sfxCompressor = this.ctx.createDynamicsCompressor();
      sfxCompressor.threshold.value = -10;
      sfxCompressor.knee.value = 14;
      sfxCompressor.ratio.value = 4;
      sfxCompressor.attack.value = 0.004;
      sfxCompressor.release.value = 0.14;
      sfxCompressor.connect(this.ctx.destination);

      // Dedicated SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume * 1.45;
      this.sfxGain.connect(sfxCompressor);

      // Enchanted palace shimmer bus for fairy chimes & Indian victory instruments
      this.sfxShimmerBus = this.ctx.createGain();
      this.sfxShimmerBus.gain.value = 1;
      this.sfxShimmerBus.connect(this.sfxGain);

      const sfxDelay = this.ctx.createDelay(0.5);
      sfxDelay.delayTime.value = 0.18;
      const sfxFeedback = this.ctx.createGain();
      sfxFeedback.gain.value = 0.24;
      const sfxDelayLp = this.ctx.createBiquadFilter();
      sfxDelayLp.type = 'lowpass';
      sfxDelayLp.frequency.value = 5600;
      const sfxWet = this.ctx.createGain();
      sfxWet.gain.value = 0.26;

      this.sfxShimmerBus.connect(sfxDelay);
      sfxDelay.connect(sfxDelayLp);
      sfxDelayLp.connect(sfxFeedback);
      sfxFeedback.connect(sfxDelay);
      sfxDelayLp.connect(sfxWet);
      sfxWet.connect(this.sfxGain);

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

      // Reusable 1-second white noise buffer for tabla skin, ghungroo bells & fairy shimmer
      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    // Resume BOTH 'suspended' and iOS/iPadOS 'interrupted' states
    if (this.ctx.state !== 'running') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSfxContext(): { ctx: AudioContext; out: AudioNode; shimmer: AudioNode } | null {
    if (this.muted || this.sfxVolume <= 0.001) return null;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.sfxShimmerBus) return null;
    return { ctx, out: this.sfxGain, shimmer: this.sfxShimmerBus };
  }

  /**
   * Softly ducks background Indian music during chimes/fanfare so SFX always stay crisp.
   */
  private duckMusicTemporarily(durationSec = 0.7): void {
    if (!this.musicPlaying || !this.ctx || !this.musicMasterGain) return;
    const now = this.ctx.currentTime;
    this.musicMasterGain.gain.cancelScheduledValues(now);
    this.musicMasterGain.gain.setTargetAtTime(0.16, now, 0.04);
    this.musicMasterGain.gain.setTargetAtTime(0.32, now + durationSec, 0.28);
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
    this.musicMasterGain.gain.linearRampToValueAtTime(0.32, now + 0.1);

    this.currentStep = 0;
    this.phraseIndex = 0;
    this.nextStepTime = now + 0.015;

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

  // =========================================================================
  // TRADITIONAL INDIAN SYNTHESIS INSTRUMENTS (shared by music & victory SFX)
  // =========================================================================

  private playTanpuraString(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.musicMasterGain;
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

  private playTablaBayan(
    time: number,
    vol: number,
    openResonance: boolean,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.musicMasterGain;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dur = openResonance ? 0.31 : 0.14;

    osc.type = 'sine';
    // Classic Bayan upward wrist-slide ("meend") resonance
    osc.frequency.setValueAtTime(openResonance ? 112 : 124, time);
    osc.frequency.exponentialRampToValueAtTime(openResonance ? 148 : 95, time + 0.065);
    osc.frequency.exponentialRampToValueAtTime(84, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playTablaDayan(
    time: number,
    vol: number,
    damped: boolean,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.musicMasterGain;
    if (!ctx || !dest) return;

    const dur = damped ? 0.065 : 0.17;

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

  private playGhungroo(time: number, vol: number, targetNode?: AudioNode): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.musicMasterGain;
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
    gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.085);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.start(time);
    src.stop(time + 0.095);
  }

  /**
   * Bright golden Manjira (Indian temple finger-cymbals) ring for celebration accents.
   */
  private playManjira(time: number, vol: number, targetNode?: AudioNode): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.sfxShimmerBus;
    if (!ctx || !dest) return;

    const partials = [2793, 4186, 5588];
    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      const pVol = vol * (idx === 0 ? 0.55 : idx === 1 ? 0.35 : 0.22);
      const dur = idx === 0 ? 0.48 : 0.34;
      gain.gain.setValueAtTime(0.0005, time);
      gain.gain.linearRampToValueAtTime(pVol, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + dur + 0.03);
    });
  }

  private playSitarNote(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    glideFrom?: number,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.musicMasterGain;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const buzz = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    buzz.type = 'triangle';

    if (glideFrom) {
      osc.frequency.setValueAtTime(glideFrom, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.068);
      buzz.frequency.setValueAtTime(glideFrom * 2.004, time);
      buzz.frequency.exponentialRampToValueAtTime(freq * 2.004, time + 0.068);
    } else {
      osc.frequency.setValueAtTime(freq, time);
      buzz.frequency.setValueAtTime(freq * 2.004, time);
    }

    // Resonant sitar bridge ("jawari") bright lowpass sweep (preserves full fundamental body)
    filter.type = 'lowpass';
    filter.Q.value = 3.4;
    filter.frequency.setValueAtTime(Math.min(4600, Math.max(900, freq * 5.2)), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(720, freq * 2.1), time + Math.max(0.05, dur));

    const safeDur = Math.max(0.06, dur);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + safeDur);

    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.5;

    osc.connect(filter);
    buzz.connect(buzzGain);
    buzzGain.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    buzz.start(time);
    osc.stop(time + safeDur + 0.03);
    buzz.stop(time + safeDur + 0.03);
  }

  /**
   * Festive celebratory Indian Shehnai reed lead (bright royal wedding/victory brassy woodwind
   * with expressive ornament pitch slide & warm vibrato).
   */
  private playShehnaiNote(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    glideFrom?: number,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.sfxShimmerBus;
    if (!ctx || !dest) return;

    const safeDur = Math.max(0.12, dur);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const formant = ctx.createBiquadFilter();
    const warmth = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    if (glideFrom) {
      osc1.frequency.setValueAtTime(glideFrom, time);
      osc1.frequency.exponentialRampToValueAtTime(freq, time + 0.05);
      osc2.frequency.setValueAtTime(glideFrom * 1.003, time);
      osc2.frequency.exponentialRampToValueAtTime(freq * 1.003, time + 0.05);
    } else {
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 1.003, time);
    }

    // Expressive vibrato characteristic of ceremonial Indian Shehnai
    lfo.type = 'sine';
    lfo.frequency.value = 5.8;
    lfoGain.gain.value = freq * 0.011;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Nasal double-reed formant boost (peaking keeps full volume & richness!)
    formant.type = 'peaking';
    formant.frequency.value = Math.min(2600, Math.max(1250, freq * 2.4));
    formant.Q.value = 2.0;
    formant.gain.value = 8;

    warmth.type = 'lowpass';
    warmth.frequency.value = 3600;

    const attackEnd = time + 0.03;
    const sustainEnd = time + Math.max(0.05, safeDur - 0.08);
    gain.gain.setValueAtTime(0.0005, time);
    gain.gain.linearRampToValueAtTime(vol, attackEnd);
    gain.gain.setValueAtTime(vol * 0.88, sustainEnd);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + safeDur);

    const sqMix = ctx.createGain();
    sqMix.gain.value = 0.28;

    osc1.connect(formant);
    osc2.connect(sqMix);
    sqMix.connect(formant);
    formant.connect(warmth);
    warmth.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    lfo.start(time);
    osc1.stop(time + safeDur + 0.04);
    osc2.stop(time + safeDur + 0.04);
    lfo.stop(time + safeDur + 0.04);
  }

  private playBansuriNote(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    glideFrom?: number,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.musicMasterGain;
    if (!ctx || !dest) return;

    const safeDur = Math.max(0.14, dur);
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (glideFrom) {
      osc.frequency.setValueAtTime(glideFrom, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.08);
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
    lp.frequency.value = 2600;

    const attackEnd = time + Math.min(0.065, safeDur * 0.35);
    const sustainEnd = time + Math.max(safeDur * 0.55, safeDur - 0.09);
    gain.gain.setValueAtTime(0.0005, time);
    gain.gain.linearRampToValueAtTime(vol, attackEnd);
    gain.gain.setValueAtTime(vol * 0.9, sustainEnd);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + safeDur);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(dest);

    osc.start(time);
    lfo.start(time);
    osc.stop(time + safeDur + 0.04);
    lfo.stop(time + safeDur + 0.04);
  }

  /**
   * Crystalline fairy celesta / glass-harp sparkle tone.
   */
  private playFairySparkleNote(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    targetNode?: AudioNode,
  ): void {
    const ctx = this.ctx;
    const dest = targetNode ?? this.sfxShimmerBus;
    if (!ctx || !dest) return;

    const safeDur = Math.max(0.08, dur);
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const overGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    overtone.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    overtone.frequency.setValueAtTime(freq * 2, time);

    overGain.gain.setValueAtTime(0.32, time);
    overGain.gain.exponentialRampToValueAtTime(0.01, time + Math.min(0.16, safeDur * 0.55));

    gain.gain.setValueAtTime(0.0005, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + safeDur);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(dest);

    osc.start(time);
    overtone.start(time);
    osc.stop(time + safeDur + 0.03);
    overtone.stop(time + safeDur + 0.03);
  }

  // =========================================================================
  // MAGICAL FAIRY WHEEL-SPIN SOUNDSCAPE ("MODE FÉÉRIQUE")
  // =========================================================================

  /**
   * Launches an enchanting fairy glissando + continuous sparkling magic aura while the wheel spins.
   */
  public startSpinFairy(initialSpeed = 1): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;

    // Cleanly stop any previous aura before starting a fresh spin
    this.stopSpinFairy();
    this.fairyStepIndex = 0;

    try {
      const now = ctx.currentTime;
      const clampedSpeed = Math.min(1, Math.max(0.25, initialSpeed));

      // 1. Enchanted fairy harp / santoor ascending Raga Yaman sweep on launch
      const launchRun = [
        NOTE.C5,
        NOTE.E5,
        NOTE.Fs5,
        NOTE.G5,
        NOTE.B5,
        NOTE.C6,
        NOTE.E6,
        NOTE.G6,
      ];
      launchRun.forEach((freq, idx) => {
        this.playFairySparkleNote(
          freq,
          now + idx * 0.036,
          0.46,
          (0.14 + idx * 0.012) * clampedSpeed,
          shimmer,
        );
      });

      // 2. Continuous dreamy shimmering fairy aura bed that follows wheel rotation speed
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0005, now);
      masterGain.gain.linearRampToValueAtTime(0.16 * clampedSpeed, now + 0.14);

      // Dedicated positive-centered tremolo stage (never drives envelope negative!)
      const tremoloGain = ctx.createGain();
      tremoloGain.gain.setValueAtTime(1.0, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1900 + clampedSpeed * 2600, now);
      filter.Q.value = 1.4;

      // Shimmering fairy tremolo LFO modulating tremoloGain around 1.0 (±0.22)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5.5 + clampedSpeed * 4.5, now);
      lfoGain.gain.value = 0.22;
      lfo.connect(lfoGain);
      lfoGain.connect(tremoloGain.gain);

      // Ethereal Lydian/Yaman crystal chord (C5 + G5 + B5 + F#6 sparkle)
      const auraFreqs = [NOTE.C5, NOTE.G5, NOTE.B5, NOTE.Fs6];
      const oscillators: OscillatorNode[] = [];
      auraFreqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f * (1 + (idx - 1.5) * 0.0018), now);
        oscGain.gain.value = idx === 3 ? 0.22 : 0.34;
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        oscillators.push(osc);
      });

      // Silky stardust air-shimmer noise layer
      let noiseSrc: AudioBufferSourceNode | null = null;
      if (this.noiseBuffer) {
        noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = this.noiseBuffer;
        noiseSrc.loop = true;
        const airBp = ctx.createBiquadFilter();
        airBp.type = 'bandpass';
        airBp.frequency.value = 5400;
        airBp.Q.value = 2.6;
        const airGain = ctx.createGain();
        airGain.gain.value = 0.12;
        noiseSrc.connect(airBp);
        airBp.connect(airGain);
        airGain.connect(tremoloGain);
        noiseSrc.start(now);
      }

      filter.connect(tremoloGain);
      tremoloGain.connect(masterGain);
      masterGain.connect(shimmer);
      lfo.start(now);

      this.fairyAura = {
        masterGain,
        tremoloGain,
        filter,
        lfo,
        oscillators,
        noiseSrc,
      };
    } catch {
      this.fairyAura = null;
    }
  }

  /**
   * Smoothly modulates the fairy spin aura brightness, shimmer speed & volume as the wheel decelerates.
   */
  public updateSpinFairy(speedFactor: number): void {
    if (!this.fairyAura || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const clamped = Math.min(1, Math.max(0.02, speedFactor));
      const { masterGain, filter, lfo } = this.fairyAura;

      masterGain.gain.setTargetAtTime(0.025 + clamped * 0.145, now, 0.08);
      filter.frequency.setTargetAtTime(1400 + clamped * 3000, now, 0.08);
      lfo.frequency.setTargetAtTime(3.2 + clamped * 6.5, now, 0.09);
    } catch {
      // Ignore audio update edge cases
    }
  }

  /**
   * Gently dissolves the fairy spin aura when the wheel stops or is caught by hand.
   */
  public stopSpinFairy(): void {
    const aura = this.fairyAura;
    if (!aura) return;
    this.fairyAura = null;

    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    try {
      aura.masterGain.gain.cancelScheduledValues(now);
      aura.masterGain.gain.setTargetAtTime(0.0001, now, 0.07);
      const stopAt = now + 0.3;
      aura.oscillators.forEach((osc) => {
        try {
          osc.stop(stopAt);
        } catch {
          // Already stopped
        }
      });
      try {
        aura.lfo.stop(stopAt);
      } catch {
        // Already stopped
      }
      if (aura.noiseSrc) {
        try {
          aura.noiseSrc.stop(stopAt);
        } catch {
          // Already stopped
        }
      }
    } catch {
      // Ignore audio teardown edge cases
    }
  }

  // =========================================================================
  // WHEEL & GAME SOUND EFFECTS
  // =========================================================================

  /**
   * Short crisp fairy sparkle cue when unmuting SFX so the host gets instant audio feedback.
   */
  public playUnmuteChime(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;
    const now = ctx.currentTime;
    this.playFairySparkleNote(NOTE.C6, now, 0.28, 0.22, shimmer);
    this.playFairySparkleNote(NOTE.G6, now + 0.07, 0.36, 0.24, shimmer);
  }

  /**
   * Enchanted fairy bell-chime + crisp golden brass peg tick on every sector crossing.
   * Cycles smoothly along the dreamy Raga Yaman fairy scale, shimmering as the wheel spins.
   */
  public playTick(speedFactor = 1): void {
    const nowMs = performance.now();
    if (nowMs - this.lastTickMs < 22) return; // Prevent clipping during ultra-fast swipes
    this.lastTickMs = nowMs;

    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out, shimmer } = audio;

    try {
      const now = ctx.currentTime;
      const clampedSpeed = Math.min(1, Math.max(0.05, speedFactor));

      // 1. Crisp tactile golden-peg clapper click (clear physical wheel feedback)
      const pegOsc = ctx.createOscillator();
      const pegGain = ctx.createGain();
      pegOsc.type = 'triangle';
      pegOsc.frequency.setValueAtTime(560 + clampedSpeed * 320, now);
      pegOsc.frequency.exponentialRampToValueAtTime(220, now + 0.028);

      pegGain.gain.setValueAtTime(0.001, now);
      pegGain.gain.linearRampToValueAtTime(0.19 + clampedSpeed * 0.11, now + 0.002);
      pegGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      pegOsc.connect(pegGain);
      pegGain.connect(out);
      pegOsc.start(now);
      pegOsc.stop(now + 0.038);

      // 2. Sparkling fairy celesta / ghungroo chime stepping up and down Raga Yaman scale
      const cycleLen = FAIRY_CHIME_SCALE.length * 2 - 2;
      const pos = this.fairyStepIndex % cycleLen;
      const scaleIdx = pos < FAIRY_CHIME_SCALE.length ? pos : cycleLen - pos;
      this.fairyStepIndex += 1;

      const chimeFreq = FAIRY_CHIME_SCALE[scaleIdx];
      const chimeDur = 0.2 + (1 - clampedSpeed) * 0.24; // Lingers longer like stardust as wheel slows
      const chimeVol = 0.18 + clampedSpeed * 0.1;
      this.playFairySparkleNote(chimeFreq, now, chimeDur, chimeVol, shimmer);

      // Delicate ghungroo fairy dust sparkle on brisk spins
      if (clampedSpeed > 0.25) {
        this.playGhungroo(now, 0.065 * clampedSpeed, shimmer);
      }
    } catch {
      // Ignore transient Web Audio scheduling edge cases
    }
  }

  /**
   * Magical golden Bollywood temple bell + sitar sparkle when the wheel settles on a Mudra.
   */
  public playMudraLand(): void {
    this.stopSpinFairy();
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;
    this.duckMusicTemporarily(0.75);

    const now = ctx.currentTime;
    // Warm Sitar Sa-Ga-Pa flourish
    this.playSitarNote(NOTE.C5, now, 0.48, 0.28, NOTE.G4, shimmer);
    this.playSitarNote(NOTE.E5, now + 0.06, 0.52, 0.26, undefined, shimmer);
    this.playSitarNote(NOTE.G5, now + 0.12, 0.66, 0.3, NOTE.E5, shimmer);

    // Fairy stardust top sparkle & Manjira ring
    this.playFairySparkleNote(NOTE.C6, now + 0.14, 0.6, 0.24, shimmer);
    this.playFairySparkleNote(NOTE.E6, now + 0.2, 0.55, 0.19, shimmer);
    this.playManjira(now + 0.12, 0.14, shimmer);
    this.playGhungroo(now + 0.08, 0.12, shimmer);
  }

  /**
   * Joyful ascending Indian sitar & fairy bell motif when advancing to the next level.
   */
  public playLevelAdvance(): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;
    this.duckMusicTemporarily(0.85);

    const now = ctx.currentTime;
    const run = [
      { freq: NOTE.C4, t: 0.0 },
      { freq: NOTE.D4, t: 0.06 },
      { freq: NOTE.E4, t: 0.12 },
      { freq: NOTE.G4, t: 0.18 },
      { freq: NOTE.A4, t: 0.24 },
      { freq: NOTE.C5, t: 0.31 },
    ];
    run.forEach(({ freq, t }, idx) => {
      this.playSitarNote(
        freq,
        now + t,
        idx === run.length - 1 ? 0.65 : 0.3,
        0.26,
        idx > 0 ? run[idx - 1].freq : undefined,
        shimmer,
      );
    });
    this.playTablaBayan(now + 0.31, 0.42, true, shimmer);
    this.playTablaDayan(now + 0.31, 0.32, false, shimmer);
    this.playFairySparkleNote(NOTE.C6, now + 0.33, 0.6, 0.22, shimmer);
    this.playGhungroo(now + 0.31, 0.14, shimmer);
  }

  /**
   * Grand celebratory Indian Bollywood victory fanfare:
   * Tanpura royal drone + Tabla/Dholak celebratory rhythm + dazzling Sitar taan +
   * triumphant Shehnai & Bansuri melody + Manjira/Ghungroo festive bells!
   */
  public playIndianVictoryFanfare(): void {
    this.stopSpinFairy();
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;
    this.duckMusicTemporarily(2.4);

    const now = ctx.currentTime;

    // 1. Royal Tanpura resonant Sa-Pa drone foundation
    this.playTanpuraString(NOTE.C3, now, 2.35, 0.24, shimmer);
    this.playTanpuraString(NOTE.G3, now + 0.08, 2.25, 0.2, shimmer);

    // 2. Celebratory Indian Tabla / Dholak victory cadence (Dha-Dha-Ti-Dha | Dha-Dhin-DHAAA!)
    const tablaHits: Array<{ t: number; bayan?: boolean; open?: boolean; dayan?: boolean; damped?: boolean; vol: number }> = [
      { t: 0.0, bayan: true, open: true, dayan: true, damped: false, vol: 0.54 },
      { t: 0.18, bayan: true, open: false, dayan: true, damped: false, vol: 0.4 },
      { t: 0.34, dayan: true, damped: true, vol: 0.34 },
      { t: 0.48, bayan: true, open: true, dayan: true, damped: false, vol: 0.5 },
      { t: 0.66, dayan: true, damped: false, vol: 0.38 },
      { t: 0.82, bayan: true, open: true, dayan: true, damped: false, vol: 0.56 },
      { t: 0.96, dayan: true, damped: true, vol: 0.36 },
      { t: 1.08, bayan: true, open: true, dayan: true, damped: false, vol: 0.62 },
    ];
    for (const hit of tablaHits) {
      if (hit.bayan) this.playTablaBayan(now + hit.t, hit.vol, Boolean(hit.open), shimmer);
      if (hit.dayan) this.playTablaDayan(now + hit.t, hit.vol * 0.78, Boolean(hit.damped), shimmer);
    }

    // 3. Festive Ghungroo & Manjira temple cymbal sparkles
    this.playGhungroo(now + 0.02, 0.18, shimmer);
    this.playGhungroo(now + 0.48, 0.2, shimmer);
    this.playGhungroo(now + 0.82, 0.22, shimmer);
    this.playManjira(now + 0.48, 0.19, shimmer);
    this.playManjira(now + 1.08, 0.25, shimmer);

    // 4. Dazzling ascending Sitar Raga Bhupali "taan" (Sa Re Ga Pa Dha Sa' Re' Ga' Pa')
    const sitarTaan = [
      { freq: NOTE.C4, t: 0.0, dur: 0.24 },
      { freq: NOTE.D4, t: 0.07, dur: 0.24 },
      { freq: NOTE.E4, t: 0.14, dur: 0.24 },
      { freq: NOTE.G4, t: 0.21, dur: 0.26 },
      { freq: NOTE.A4, t: 0.28, dur: 0.26 },
      { freq: NOTE.C5, t: 0.36, dur: 0.38 },
      { freq: NOTE.D5, t: 0.48, dur: 0.32 },
      { freq: NOTE.E5, t: 0.62, dur: 0.36 },
      { freq: NOTE.G5, t: 0.82, dur: 0.42 },
      { freq: NOTE.C6, t: 1.08, dur: 1.15 },
    ];
    sitarTaan.forEach((n, idx) => {
      this.playSitarNote(
        n.freq,
        now + n.t,
        n.dur,
        idx === sitarTaan.length - 1 ? 0.36 : 0.27,
        idx > 0 ? sitarTaan[idx - 1].freq : undefined,
        shimmer,
      );
    });

    // 5. Triumphant ceremonial Shehnai & Bansuri victory melody
    this.playShehnaiNote(NOTE.G4, now + 0.18, 0.28, 0.22, NOTE.E4, shimmer);
    this.playShehnaiNote(NOTE.A4, now + 0.36, 0.24, 0.22, NOTE.G4, shimmer);
    this.playShehnaiNote(NOTE.C5, now + 0.52, 0.32, 0.25, NOTE.A4, shimmer);
    this.playShehnaiNote(NOTE.D5, now + 0.78, 0.26, 0.25, NOTE.C5, shimmer);
    this.playShehnaiNote(NOTE.E5, now + 0.94, 0.2, 0.25, NOTE.D5, shimmer);
    this.playShehnaiNote(NOTE.C5, now + 1.08, 1.1, 0.23, NOTE.A4, shimmer);

    // Soaring Bansuri harmony on the grand resolution chord
    this.playBansuriNote(NOTE.G5, now + 0.82, 0.35, 0.24, NOTE.E5, shimmer);
    this.playBansuriNote(NOTE.C6, now + 1.08, 1.15, 0.28, NOTE.A5, shimmer);

    // Final fairy golden shimmer cascade over the victory chord
    [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7].forEach((freq, idx) => {
      this.playFairySparkleNote(freq, now + 1.1 + idx * 0.06, 0.95, 0.18, shimmer);
    });
  }

  /**
   * Festive Indian celebration fanfare on completing the Finale.
   */
  public playFinaleCelebration(): void {
    this.playIndianVictoryFanfare();
  }

  /**
   * Playful two-tone sitar bounce cue (kept for optional audio feedback).
   */
  public playDuplicateRespin(): void {
    this.stopSpinFairy();
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;
    this.duckMusicTemporarily(0.6);

    const now = ctx.currentTime;
    this.playSitarNote(NOTE.A4, now, 0.22, 0.24, undefined, shimmer);
    this.playSitarNote(NOTE.G4, now + 0.13, 0.22, 0.22, NOTE.A4, shimmer);
    this.playSitarNote(NOTE.C5, now + 0.28, 0.34, 0.26, NOTE.G4, shimmer);
    this.playTablaDayan(now + 0.28, 0.26, false, shimmer);
  }

  /**
   * Crisp countdown tick during the final 5 seconds of Time-Trial mode.
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
    gain.gain.linearRampToValueAtTime(urgent ? 0.28 : 0.2, now + 0.005);
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
      { freq: 392.0, t: 0, dur: 0.32, type: 'triangle' as OscillatorType, vol: 0.28 },
      { freq: 329.63, t: 0.18, dur: 0.36, type: 'triangle' as OscillatorType, vol: 0.28 },
      { freq: 261.63, t: 0.36, dur: 0.85, type: 'sine' as OscillatorType, vol: 0.34 },
      { freq: 130.81, t: 0.36, dur: 0.95, type: 'triangle' as OscillatorType, vol: 0.26 },
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
   * Celebratory Indian victory fanfare when awarding the full Tortue d'Or image ("Gagné"),
   * or a warm encouraging sitar/bansuri cadence when awarding the half image (½).
   */
  public playTortueReward(isFull: boolean): void {
    if (isFull) {
      this.playIndianVictoryFanfare();
      return;
    }

    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, shimmer } = audio;
    this.duckMusicTemporarily(0.9);

    const now = ctx.currentTime;
    this.playSitarNote(NOTE.G4, now, 0.36, 0.28, NOTE.E4, shimmer);
    this.playSitarNote(NOTE.A4, now + 0.13, 0.48, 0.28, NOTE.G4, shimmer);
    this.playBansuriNote(NOTE.C5, now + 0.24, 0.58, 0.24, NOTE.A4, shimmer);
    this.playTablaDayan(now, 0.3, false, shimmer);
    this.playGhungroo(now + 0.24, 0.14, shimmer);
  }

  /**
   * Dry, snappy, direct sound cues when marking a family's level attempt as "Réussi" or "Raté".
   * Routed straight to the dry SFX bus (no echo tail) for instant live-show feedback.
   */
  public playTeamLevelVerdict(passed: boolean): void {
    const audio = this.getSfxContext();
    if (!audio) return;
    const { ctx, out } = audio;

    try {
      const now = ctx.currentTime;
      if (passed) {
        // Dry, punchy two-note rising chime ("DING-DING!") with tight percussive transient
        const hits = [
          { freq: NOTE.G5, start: now, dur: 0.12, vol: 0.34 },
          { freq: NOTE.C6, start: now + 0.072, dur: 0.22, vol: 0.4 },
        ];
        hits.forEach(({ freq, start, dur, vol }) => {
          const osc = ctx.createOscillator();
          const over = ctx.createOscillator();
          const overGain = ctx.createGain();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          over.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          over.frequency.setValueAtTime(freq * 2, start);

          overGain.gain.setValueAtTime(0.35, start);
          overGain.gain.exponentialRampToValueAtTime(0.01, start + Math.min(0.06, dur * 0.5));

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(vol, start + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.connect(gain);
          over.connect(overGain);
          overGain.connect(gain);
          gain.connect(out);

          osc.start(start);
          over.start(start);
          osc.stop(start + dur + 0.015);
          over.stop(start + dur + 0.015);
        });

        // Crisp dry attack snap on the first hit
        this.playTablaDayan(now, 0.24, true, out);
      } else {
        // Clean, dry, direct descending double wood-marimba thud ("TOCK-TONK", zero harsh buzz)
        const drops = [
          { startFreq: 329.63, endFreq: 296.0, start: now, dur: 0.09, vol: 0.36 },
          { startFreq: 233.08, endFreq: 196.0, start: now + 0.095, dur: 0.17, vol: 0.42 },
        ];
        drops.forEach(({ startFreq, endFreq, start, dur, vol }) => {
          const body = ctx.createOscillator();
          const woody = ctx.createOscillator();
          const woodyGain = ctx.createGain();
          const gain = ctx.createGain();

          body.type = 'sine';
          woody.type = 'triangle';
          body.frequency.setValueAtTime(startFreq, start);
          body.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
          woody.frequency.setValueAtTime(startFreq * 1.5, start);
          woody.frequency.exponentialRampToValueAtTime(endFreq * 1.4, start + Math.min(0.045, dur));

          woodyGain.gain.setValueAtTime(0.28, start);
          woodyGain.gain.exponentialRampToValueAtTime(0.005, start + 0.038);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(vol, start + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          body.connect(gain);
          woody.connect(woodyGain);
          woodyGain.connect(gain);
          gain.connect(out);

          body.start(start);
          woody.start(start);
          body.stop(start + dur + 0.015);
          woody.stop(start + dur + 0.015);
        });

        // Subtle dry damped percussive knock on the second drop for clear finality
        this.playTablaDayan(now + 0.095, 0.2, true, out);
      }
    } catch {
      // Ignore transient Web Audio edge cases
    }
  }
}

export const mudraAudio = new MudraAudioEngine();
