/**
 * Zero-dependency procedural Web Audio synthesizer for Bollywood-inspired
 * wheel clicks, lotus chimes, level-up melodies, and finale fanfare.
 */

class MudraAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Soft wooden/brass peg tick as each sector divider passes the top pointer.
   */
  public playTick(speedFactor = 1): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 580 + Math.min(1, Math.max(0, speedFactor)) * 320;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.032);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  /**
   * Warm golden temple bell chime when the wheel settles on a Mudra.
   */
  public playMudraLand(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 warm triad

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.055;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  /**
   * Joyful ascending chime when advancing to the next level.
   */
  public playLevelAdvance(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.065;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /**
   * Festive celebration fanfare on completing the 7-mudra Finale.
   */
  public playFinaleCelebration(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Festive celebratory phrase (inspired by Bhupali pentatonic scale C-D-E-G-A-C)
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
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.04);
    });
  }

  /**
   * Playful two-tone bounce cue when the same Mudra lands twice in a row
   * and triggers an automatic re-spin.
   */
  public playDuplicateRespin(): void {
    const ctx = this.getContext();
    if (!ctx) return;

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
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.03);
    });
  }
}

export const mudraAudio = new MudraAudioEngine();
