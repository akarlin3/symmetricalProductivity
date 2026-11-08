import { AudioEngineSettings, SoundscapeMode } from '../types/symmetry';

export const SOUNDSCAPE_MODE_META: {
  id: SoundscapeMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'WARM_BROWN_NOISE',
    label: 'Warm Brown Noise',
    shortLabel: 'Brown Noise',
    description: 'Deep 1/f² integrated low-pass acoustic blanket (340Hz warm rolloff).',
  },
  {
    id: 'SOFT_RAIN',
    label: 'Soft Rain (Filtered Pink Noise)',
    shortLabel: 'Soft Rain',
    description: 'Paul Kellet 7-pole pink noise with modulated bandpass window acoustics.',
  },
  {
    id: 'BINAURAL_40HZ',
    label: 'Binaural Focus Drone (40Hz Gamma / 100Hz carrier)',
    shortLabel: '40Hz Binaural',
    description: '100Hz L / 140Hz R stereo carrier generating a 40Hz Gamma focus beat.',
  },
];

export const SOUNDSCAPE_METADATA: Record<
  SoundscapeMode,
  {
    id: SoundscapeMode;
    label: string;
    shortLabel: string;
    subtitle: string;
    description: string;
  }
> = {
  WARM_BROWN_NOISE: {
    id: 'WARM_BROWN_NOISE',
    label: 'Warm Brown Noise',
    shortLabel: 'Brown Noise',
    subtitle: 'Deep 1/f² low-pass acoustic blanket (340Hz rolloff)',
    description: 'Deep 1/f² integrated low-pass acoustic blanket (340Hz warm rolloff).',
  },
  SOFT_RAIN: {
    id: 'SOFT_RAIN',
    label: 'Soft Rain (Filtered Pink Noise)',
    shortLabel: 'Soft Rain',
    subtitle: 'Paul Kellet 7-pole pink noise + bandpass window rain',
    description: 'Paul Kellet 7-pole pink noise with modulated bandpass window acoustics.',
  },
  BINAURAL_40HZ: {
    id: 'BINAURAL_40HZ',
    label: 'Binaural Focus Drone (40Hz Gamma / 100Hz carrier)',
    shortLabel: '40Hz Binaural',
    subtitle: '100Hz L / 140Hz R stereo carrier (40Hz Gamma focus beat)',
    description: '100Hz L / 140Hz R stereo carrier generating a 40Hz Gamma focus beat.',
  },
};

export const DEFAULT_AUDIO_SETTINGS: AudioEngineSettings = {
  muted: false,
  volume: 0.45,
  soundscapeEnabled: true,
  soundscapeMode: 'WARM_BROWN_NOISE',
  tactileClicksEnabled: true,
};

interface ActiveSoundscapeGraph {
  mode: SoundscapeMode;
  masterGain: GainNode;
  cleanup: () => void;
}

class SymmetrySoundEngine {
  private ctx: AudioContext | null = null;
  private activeGraph: ActiveSoundscapeGraph | null = null;
  private fadeOutTimer: number | null = null;
  private settings: AudioEngineSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private isCurrentlyPlayingSoundscape = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public updateSettings(next: Partial<AudioEngineSettings>): AudioEngineSettings {
    this.settings = {
      ...this.settings,
      ...next,
      volume:
        typeof next.volume === 'number'
          ? Math.max(0, Math.min(1, next.volume))
          : this.settings.volume,
    };

    // Update live gain if a soundscape is currently playing
    if (this.activeGraph && this.ctx && this.isCurrentlyPlayingSoundscape) {
      const now = this.ctx.currentTime;
      const targetGain =
        this.settings.muted || !this.settings.soundscapeEnabled
          ? 0.0001
          : this.computeTargetSoundscapeGain(
              this.settings.soundscapeMode,
              this.settings.volume
            );
      try {
        this.activeGraph.masterGain.gain.cancelScheduledValues(now);
        this.activeGraph.masterGain.gain.setValueAtTime(
          this.activeGraph.masterGain.gain.value,
          now
        );
        this.activeGraph.masterGain.gain.linearRampToValueAtTime(
          targetGain,
          now + 0.25
        );
      } catch {
        // Ignore audio scheduling errors
      }
    }

    return this.settings;
  }

  public getSettings(): AudioEngineSettings {
    return this.settings;
  }

  private computeTargetSoundscapeGain(
    mode: SoundscapeMode,
    volume: number
  ): number {
    const clamped = Math.max(0, Math.min(1, volume));
    if (mode === 'WARM_BROWN_NOISE') return Math.max(0.001, clamped * 0.32);
    if (mode === 'SOFT_RAIN') return Math.max(0.001, clamped * 0.26);
    return Math.max(0.001, clamped * 0.2); // BINAURAL_40HZ
  }

  /**
   * Builds one of the 3 procedural Web Audio soundscapes:
   * - WARM_BROWN_NOISE
   * - SOFT_RAIN (Filtered Pink Noise)
   * - BINAURAL_40HZ (40Hz Gamma / 100Hz carrier)
   */
  private buildSoundscapeGraph(
    ctx: AudioContext,
    mode: SoundscapeMode
  ): ActiveSoundscapeGraph {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const stopCallbacks: (() => void)[] = [];

    if (mode === 'WARM_BROWN_NOISE') {
      const bufferDurationSec = 4;
      const bufferSize = ctx.sampleRate * bufferDurationSec;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.2;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(340, ctx.currentTime);
      lowpass.Q.setValueAtTime(0.6, ctx.currentTime);

      const warmthShelf = ctx.createBiquadFilter();
      warmthShelf.type = 'lowshelf';
      warmthShelf.frequency.setValueAtTime(115, ctx.currentTime);
      warmthShelf.gain.setValueAtTime(2.5, ctx.currentTime);

      source.connect(lowpass);
      lowpass.connect(warmthShelf);
      warmthShelf.connect(masterGain);
      source.start();

      stopCallbacks.push(() => {
        try {
          source.stop();
          source.disconnect();
          lowpass.disconnect();
          warmthShelf.disconnect();
        } catch {
          // Ignore already stopped
        }
      });
    } else if (mode === 'SOFT_RAIN') {
      // Paul Kellet's 7-pole Pink Noise generator + subtle rain LFO filter
      const bufferDurationSec = 5;
      const bufferSize = ctx.sampleRate * bufferDurationSec;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          data[i] = pink * 0.11;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(920, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.65, ctx.currentTime);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1650, ctx.currentTime);

      // Gentle 0.14Hz modulation on bandpass frequency for natural rainfall swell
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.14, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(140, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);

      source.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(masterGain);

      source.start();
      lfo.start();

      stopCallbacks.push(() => {
        try {
          source.stop();
          lfo.stop();
          source.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          bandpass.disconnect();
          lowpass.disconnect();
        } catch {
          // Ignore
        }
      });
    } else {
      // BINAURAL_40HZ: 100Hz Left Carrier + 140Hz Right Carrier (40Hz Gamma Beat) + 50Hz Sub Drone
      const oscLeft = ctx.createOscillator();
      const oscRight = ctx.createOscillator();
      const oscSub = ctx.createOscillator();

      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(100, ctx.currentTime); // 100Hz carrier

      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(140, ctx.currentTime); // 100Hz + 40Hz Gamma

      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(50, ctx.currentTime); // Warm sub-octave foundation

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.35, ctx.currentTime);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(240, ctx.currentTime);

      if (typeof ctx.createStereoPanner === 'function') {
        const panLeft = ctx.createStereoPanner();
        const panRight = ctx.createStereoPanner();
        panLeft.pan.setValueAtTime(-0.85, ctx.currentTime);
        panRight.pan.setValueAtTime(0.85, ctx.currentTime);

        oscLeft.connect(panLeft);
        oscRight.connect(panRight);
        panLeft.connect(lowpass);
        panRight.connect(lowpass);
      } else {
        oscLeft.connect(lowpass);
        oscRight.connect(lowpass);
      }

      oscSub.connect(subGain);
      subGain.connect(lowpass);
      lowpass.connect(masterGain);

      oscLeft.start();
      oscRight.start();
      oscSub.start();

      stopCallbacks.push(() => {
        try {
          oscLeft.stop();
          oscRight.stop();
          oscSub.stop();
          oscLeft.disconnect();
          oscRight.disconnect();
          oscSub.disconnect();
          subGain.disconnect();
          lowpass.disconnect();
        } catch {
          // Ignore
        }
      });
    }

    return {
      mode,
      masterGain,
      cleanup: () => {
        stopCallbacks.forEach((fn) => fn());
        try {
          masterGain.disconnect();
        } catch {
          // Ignore
        }
      },
    };
  }

  /**
   * Synchronizes the Focus Soundscape Generator with the live timer state:
   * - Automatically fades in over 2.0 seconds when an active `5m Startup` (IGNITION_5M) or
   *   `15m Momentum` (MOMENTUM_15M) timer starts.
   * - Automatically fades out smoothly when a Break or Pause triggers.
   */
  public syncWithTimerState(params: {
    isWorkTimerRunning: boolean;
    settings?: Partial<AudioEngineSettings>;
  }) {
    if (params.settings) {
      this.settings = { ...this.settings, ...params.settings };
    }

    const shouldPlay =
      params.isWorkTimerRunning &&
      !this.settings.muted &&
      this.settings.soundscapeEnabled &&
      this.settings.volume > 0;

    if (!shouldPlay) {
      this.fadeOutAndStop(0.85);
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    if (this.fadeOutTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }

    const desiredMode = this.settings.soundscapeMode;
    const targetGain = this.computeTargetSoundscapeGain(
      desiredMode,
      this.settings.volume
    );
    const now = ctx.currentTime;

    // If mode changed while playing, tear down old graph and fade in the new mode
    if (this.activeGraph && this.activeGraph.mode !== desiredMode) {
      const oldGraph = this.activeGraph;
      try {
        oldGraph.masterGain.gain.cancelScheduledValues(now);
        oldGraph.masterGain.gain.setValueAtTime(
          oldGraph.masterGain.gain.value,
          now
        );
        oldGraph.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      } catch {
        // Ignore
      }
      if (typeof window !== 'undefined') {
        window.setTimeout(() => oldGraph.cleanup(), 400);
      } else {
        oldGraph.cleanup();
      }
      this.activeGraph = null;
      this.isCurrentlyPlayingSoundscape = false;
    }

    if (!this.activeGraph) {
      this.activeGraph = this.buildSoundscapeGraph(ctx, desiredMode);
      this.isCurrentlyPlayingSoundscape = true;
      try {
        this.activeGraph.masterGain.gain.setValueAtTime(0.0001, now);
        // Automatic 2.0-second smooth fade-in when timer starts
        this.activeGraph.masterGain.gain.linearRampToValueAtTime(
          targetGain,
          now + 2.0
        );
      } catch {
        // Ignore
      }
    } else if (!this.isCurrentlyPlayingSoundscape) {
      this.isCurrentlyPlayingSoundscape = true;
      try {
        this.activeGraph.masterGain.gain.cancelScheduledValues(now);
        this.activeGraph.masterGain.gain.setValueAtTime(
          Math.max(0.0001, this.activeGraph.masterGain.gain.value),
          now
        );
        this.activeGraph.masterGain.gain.linearRampToValueAtTime(
          targetGain,
          now + 2.0
        );
      } catch {
        // Ignore
      }
    }
  }

  public fadeOutAndStop(fadeSeconds: number = 0.85) {
    if (!this.activeGraph || !this.ctx) {
      this.isCurrentlyPlayingSoundscape = false;
      return;
    }
    this.isCurrentlyPlayingSoundscape = false;
    const graphToStop = this.activeGraph;
    const now = this.ctx.currentTime;

    try {
      graphToStop.masterGain.gain.cancelScheduledValues(now);
      graphToStop.masterGain.gain.setValueAtTime(
        Math.max(0.0001, graphToStop.masterGain.gain.value),
        now
      );
      graphToStop.masterGain.gain.linearRampToValueAtTime(
        0.0001,
        now + fadeSeconds
      );
    } catch {
      // Ignore
    }

    if (this.fadeOutTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.fadeOutTimer);
    }

    if (typeof window !== 'undefined') {
      this.fadeOutTimer = window.setTimeout(() => {
        if (!this.isCurrentlyPlayingSoundscape && this.activeGraph === graphToStop) {
          graphToStop.cleanup();
          this.activeGraph = null;
        }
        this.fadeOutTimer = null;
      }, Math.ceil(fadeSeconds * 1000) + 60);
    } else {
      graphToStop.cleanup();
      this.activeGraph = null;
    }
  }

  /**
   * Micro-Acoustic UI Feedback:
   * Synthesizes subtle, low-pass physical clicks (15ms sine/triangle envelopes)
   * on block completion, mode toggles, and [X / 3] Sticky pip increments.
   */
  public playTactileClick(
    kind: 'BLOCK_COMPLETE' | 'MODE_TOGGLE' | 'STICKY_PIP' | 'UI_TAP' = 'UI_TAP'
  ) {
    if (this.settings.muted || this.settings.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const vol = Math.max(0.05, Math.min(1, this.settings.volume));

      const trigger15msEnvelope = (
        startTime: number,
        wave: OscillatorType,
        startFreq: number,
        endFreq: number,
        filterCutoff: number,
        peakGain: number
      ) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const env = ctx.createGain();

        osc.type = wave;
        osc.frequency.setValueAtTime(startFreq, startTime);
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, endFreq),
          startTime + 0.015
        );

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterCutoff, startTime);

        env.gain.setValueAtTime(0.0001, startTime);
        env.gain.linearRampToValueAtTime(peakGain * vol, startTime + 0.002);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.015);

        osc.connect(filter);
        filter.connect(env);
        env.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.017);
      };

      if (kind === 'BLOCK_COMPLETE') {
        // Double tactile physical latch click (15ms triangle + 15ms harmonic sine)
        trigger15msEnvelope(now, 'triangle', 520, 210, 1450, 0.24);
        trigger15msEnvelope(now + 0.042, 'sine', 780, 390, 1650, 0.28);
      } else if (kind === 'MODE_TOGGLE') {
        // Low-pass rotary switch click (15ms sine/triangle envelope)
        trigger15msEnvelope(now, 'triangle', 430, 155, 1200, 0.2);
      } else if (kind === 'STICKY_PIP') {
        // Crisp tactile pip increment click (15ms triangle envelope)
        trigger15msEnvelope(now, 'triangle', 660, 310, 1550, 0.22);
      } else {
        // Subtle physical tap (15ms sine envelope)
        trigger15msEnvelope(now, 'sine', 350, 130, 1050, 0.15);
      }
    } catch {
      // Ignore Web Audio errors in headless/restricted contexts
    }
  }

  /**
   * Synthesizes a warm harmonic chord when `[0m work left — End of Shift]` is reached.
   */
  public playEndOfShiftChord() {
    if (this.settings.muted || this.settings.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const vol = Math.max(0.08, Math.min(1, this.settings.volume));

      // Warm Fmaj9 / Cmaj9 sanctuary voicing (Hz)
      const frequencies = [261.63, 329.63, 392.0, 493.88, 587.33];
      const masterFilter = ctx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.setValueAtTime(1350, now);
      masterFilter.frequency.exponentialRampToValueAtTime(480, now + 2.4);

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.0001, now);
      chordGain.gain.linearRampToValueAtTime(0.22 * vol, now + 0.14);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      masterFilter.connect(chordGain);
      chordGain.connect(ctx.destination);

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        voiceGain.gain.setValueAtTime(1 / frequencies.length, now);

        const stagger = idx * 0.035;
        osc.connect(voiceGain);
        voiceGain.connect(masterFilter);
        osc.start(now + stagger);
        osc.stop(now + 2.55);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playHarmonicChord() {
    this.playEndOfShiftChord();
  }
}

export const soundEngine = new SymmetrySoundEngine();
export const playHarmonicChord = () => soundEngine.playHarmonicChord();

