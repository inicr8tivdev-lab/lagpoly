/**
 * Lagos Vibe Audio Engine: Burna Boy - 'City Boys' Instrumental & Afrobeats Groove
 *
 * Implements a high-fidelity Web Audio API Afrobeats synthesizer playing the iconic
 * 'City Boys' instrumental:
 * - 106 BPM Lagos Afrobeats / Amapiano rhythm with swing
 * - Iconic brass horn hook melody (Fm / Ab)
 * - Deep resonant Amapiano log drum bassline
 * - Offbeat electric piano chords (Fm9 - Bbm7 - Eb7 - Abmaj7)
 * - Layered Afrobeat shakers, syncopated kick, and crisp rimshot
 * - Ambient warm Lagos street vibe atmosphere bed
 * - Zero external asset dependency: 100% offline, guaranteed playback with no 404s/CORS
 */

type AudioEventListener = (isPlaying: boolean) => void;

class CityBoysAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private timerId: number | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Tempo & Timing
  private readonly BPM = 106;
  private stepDuration: number = (60 / 106) / 4; // 16th note duration (~0.1415s)
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private readonly TOTAL_STEPS = 64; // 4 bars of 16 steps

  // Listeners
  private listeners: Set<AudioEventListener> = new Set();
  public volume: number = 0.65;

  constructor() {
    this.stepDuration = (60 / this.BPM) / 4;
  }

  private initAudio() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

        // Analyser for UI visualizers
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Ambient Lagos Street atmosphere bed (subtle filtered noise bed)
        this.setupAmbientBed();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupAmbientBed() {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Create a 2-second pink-ish noise buffer for soft ambient street background
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.05;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      // Filter to distant warm street rumble (lowpass ~450Hz, highpass ~60Hz)
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;

      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 80;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.04; // Very subtle bed

      noise.connect(lp);
      lp.connect(hp);
      hp.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      noise.start();
    } catch {
      // Safe fallback if audio buffer creation is constrained
    }
  }

  // Frequency mapping for notes
  private readonly NOTE_FREQS: Record<string, number> = {
    // Bass (Octave 1 & 2)
    F1: 43.65,
    Ab1: 51.91,
    Bb1: 58.27,
    C2: 65.41,
    Db2: 69.30,
    Eb2: 77.78,
    F2: 87.31,
    // Chords (Octave 3 & 4)
    C3: 130.81,
    Eb3: 155.56,
    F3: 174.61,
    G3: 196.00,
    Ab3: 207.65,
    Bb3: 233.08,
    C4: 261.63,
    Db4: 277.18,
    Eb4: 311.13,
    F4: 349.23,
    G4: 392.00,
    Ab4: 415.30,
    // Brass Hook Lead (Octave 4 & 5)
    Bb4: 466.16,
    C5: 523.25,
    Db5: 554.37,
    Eb5: 622.25,
    F5: 698.46,
    G5: 783.99,
  };

  /**
   * Schedule 16th step events
   */
  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const barStep = step % 16; // Step within 1-16
    const bar = Math.floor(step / 16); // Bar 0, 1, 2, 3

    // 1. AFROBEAT DRUMS
    this.playAfrobeatDrums(bar, barStep, time);

    // 2. AMAPIANO LOG DRUM / BASS
    this.playLogDrumBass(bar, barStep, time);

    // 3. ELECTRIC PIANO OFFBEAT CHORDS
    this.playAfroChords(bar, barStep, time);

    // 4. 'CITY BOYS' ICONIC BRASS HORNS HOOK
    this.playCityBoysBrassLead(bar, barStep, time);
  }

  /**
   * 1. AFROBEAT DRUMS:
   * Punchy kick, snappy rimshot, syncopated afro swing shaker & percussion
   */
  private playAfrobeatDrums(_bar: number, barStep: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // A. Kick Drum: classic Afrobeat 4-on-the-floor with syncopation (steps 0, 10, 16...)
    const isKick =
      barStep === 0 || barStep === 6 || barStep === 10 || barStep === 12;

    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

      const kickVol = barStep === 0 ? 0.8 : 0.6;
      gain.gain.setValueAtTime(kickVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.22);
    }

    // B. Rimshot / Snare on beats 2 & 4 (steps 4 & 12) + syncopated rim on step 14
    if (barStep === 4 || barStep === 12 || barStep === 14) {
      const isGhost = barStep === 14;
      const rimOsc = this.ctx.createOscillator();
      const rimGain = this.ctx.createGain();

      rimOsc.type = 'triangle';
      rimOsc.frequency.setValueAtTime(320, time);
      rimOsc.frequency.exponentialRampToValueAtTime(120, time + 0.05);

      rimGain.gain.setValueAtTime(isGhost ? 0.18 : 0.45, time);
      rimGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      rimOsc.connect(rimGain);
      rimGain.connect(this.masterGain);
      rimOsc.start(time);
      rimOsc.stop(time + 0.08);

      // Noise sizzle
      this.playSnareNoise(time, isGhost ? 0.08 : 0.22);
    }

    // C. 16th Note Afro Shaker (with dynamic Afro groove velocity)
    const shakerAccents = [0.12, 0.05, 0.25, 0.06, 0.15, 0.05, 0.3, 0.08, 0.14, 0.06, 0.28, 0.06, 0.18, 0.08, 0.32, 0.1];
    const shakerVol = shakerAccents[barStep] || 0.1;
    this.playShakerHit(time, shakerVol);

    // D. Conga / Woodblock accent on step 2, 7, 11
    if (barStep === 2 || barStep === 7 || barStep === 11) {
      const bongo = this.ctx.createOscillator();
      const bongoGain = this.ctx.createGain();
      bongo.type = 'sine';
      const bongoFreq = barStep === 2 ? 440 : barStep === 7 ? 520 : 380;
      bongo.frequency.setValueAtTime(bongoFreq, time);
      bongo.frequency.exponentialRampToValueAtTime(bongoFreq * 0.7, time + 0.06);

      bongoGain.gain.setValueAtTime(0.18, time);
      bongoGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      bongo.connect(bongoGain);
      bongoGain.connect(this.masterGain);
      bongo.start(time);
      bongo.stop(time + 0.09);
    }
  }

  private playSnareNoise(time: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1400;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
      noise.stop(time + 0.09);
    } catch {
      // safe ignore
    }
  }

  private playShakerHit(time: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.012));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 7500;
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.45, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
      noise.stop(time + 0.04);
    } catch {
      // safe ignore
    }
  }

  /**
   * 2. AMAPIANO LOG DRUM / BASS:
   * The signature bouncy pitch-slid bass that powers Lagos street dancefloors
   */
  private playLogDrumBass(bar: number, barStep: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Harmonic progression:
    // Bar 0: Fm (F1 / F2)
    // Bar 1: Bbm (Bb1 / F2)
    // Bar 2: Eb (Eb2 / Bb1)
    // Bar 3: Ab -> C (Ab1 -> C2)
    let rootNote = 'F1';
    let altNote = 'Ab1';
    if (bar === 1) {
      rootNote = 'Bb1';
      altNote = 'Db2';
    } else if (bar === 2) {
      rootNote = 'Eb2';
      altNote = 'Bb1';
    } else if (bar === 3) {
      rootNote = barStep < 8 ? 'Ab1' : 'C2';
      altNote = 'Eb2';
    }

    // Amapiano syncopated log drum pattern: steps 0, 3, 6, 10, 13
    const isLogHit =
      barStep === 0 || barStep === 3 || barStep === 6 || barStep === 10 || barStep === 13;

    if (!isLogHit) return;

    const noteToPlay = (barStep === 6 || barStep === 13) ? altNote : rootNote;
    const targetFreq = this.NOTE_FREQS[noteToPlay] || 43.65;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    // Classic log drum pitch drop: starts ~120Hz above target and snaps down
    osc.frequency.setValueAtTime(targetFreq * 2.2, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.045);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.2);

    const hitDuration = barStep === 0 ? 0.35 : 0.22;
    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + hitDuration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + hitDuration + 0.05);
  }

  /**
   * 3. ELECTRIC PIANO / RHODES CHORDS:
   * Laid-back offbeat Afrobeats comping
   */
  private playAfroChords(bar: number, barStep: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Play on syncopated upbeats: steps 4, 8, 12
    if (barStep !== 4 && barStep !== 8 && barStep !== 12) return;

    // Chords:
    // Bar 0: Fm9 [Ab3, C4, Eb4, G4]
    // Bar 1: Bbm7 [Bb3, Db4, F4, Ab4]
    // Bar 2: Eb9 [G3, Bb3, Db4, F4]
    // Bar 3: Abmaj7 [Ab3, C4, Eb4, G4]
    let chordNotes: string[] = ['Ab3', 'C4', 'Eb4', 'G4'];
    if (bar === 1) {
      chordNotes = ['Bb3', 'Db4', 'F4', 'Ab4'];
    } else if (bar === 2) {
      chordNotes = ['G3', 'Bb3', 'Db4', 'F4'];
    } else if (bar === 3) {
      chordNotes = barStep < 8 ? ['Ab3', 'C4', 'Eb4', 'G4'] : ['G3', 'Bb3', 'C4', 'E4'];
    }

    chordNotes.forEach((note) => {
      if (!this.ctx || !this.masterGain) return;
      const freq = this.NOTE_FREQS[note];
      if (!freq) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.3);
    });
  }

  /**
   * 4. THE ICONIC 'CITY BOYS' BRASS HOOK MELODY:
   * The unmistakable dancehall/afro brass fanfare sampled from "Heads High":
   * Ta... ta-ta-ta ta taaa... ta-ta-ta ta taaa!
   */
  private playCityBoysBrassLead(bar: number, barStep: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Define melody table: [stepInBar, noteName, durationInSteps]
    // 4-Bar loop of the signature Burna Boy City Boys brass riff
    interface HornNote {
      step: number;
      note: string;
      duration: number; // in 16th steps
    }

    let notesInBar: HornNote[] = [];

    if (bar === 0) {
      // Bar 1: Intro pickup and fanfare launch
      notesInBar = [
        { step: 2, note: 'Bb4', duration: 1.5 },
        { step: 4, note: 'C5', duration: 2.5 },
        { step: 8, note: 'Bb4', duration: 1.5 },
        { step: 10, note: 'Ab4', duration: 1.5 },
        { step: 12, note: 'F4', duration: 3.5 },
      ];
    } else if (bar === 1) {
      // Bar 2: Answering call
      notesInBar = [
        { step: 2, note: 'Bb4', duration: 1.5 },
        { step: 4, note: 'C5', duration: 2.0 },
        { step: 7, note: 'Eb5', duration: 2.0 },
        { step: 10, note: 'C5', duration: 2.0 },
        { step: 13, note: 'Bb4', duration: 2.5 },
      ];
    } else if (bar === 2) {
      // Bar 3: Climactic hook turnaround
      notesInBar = [
        { step: 2, note: 'C5', duration: 1.5 },
        { step: 4, note: 'Eb5', duration: 2.0 },
        { step: 7, note: 'F5', duration: 2.5 },
        { step: 10, note: 'Eb5', duration: 1.5 },
        { step: 12, note: 'C5', duration: 2.0 },
        { step: 14, note: 'Bb4', duration: 1.5 },
      ];
    } else if (bar === 3) {
      // Bar 4: Final punchy descent into next loop
      notesInBar = [
        { step: 0, note: 'Ab4', duration: 2.0 },
        { step: 3, note: 'F4', duration: 2.5 },
        { step: 7, note: 'Eb4', duration: 2.0 },
        { step: 10, note: 'F4', duration: 3.0 },
        { step: 14, note: 'Ab4', duration: 1.5 },
      ];
    }

    const noteEvent = notesInBar.find((n) => n.step === barStep);
    if (!noteEvent) return;

    const freq = this.NOTE_FREQS[noteEvent.note];
    if (!freq) return;

    const noteDurationSec = noteEvent.duration * this.stepDuration;

    // Authentic Brass Horn Synth: Dual Sawtooth with filter envelope & chorus detune
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const brassGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Rich dual-voice chorus detune (+/- 6 cents)
    osc1.frequency.setValueAtTime(freq * 1.0035, time);
    osc2.frequency.setValueAtTime(freq * 0.9965, time);

    // Brass filter "wah" bite
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, time);
    filter.frequency.exponentialRampToValueAtTime(3200, time + 0.04);
    filter.frequency.exponentialRampToValueAtTime(1400, time + noteDurationSec);
    filter.Q.value = 4.2;

    // Brass amplitude envelope
    brassGain.gain.setValueAtTime(0.01, time);
    brassGain.gain.exponentialRampToValueAtTime(0.32, time + 0.025);
    brassGain.gain.setValueAtTime(0.28, time + noteDurationSec * 0.75);
    brassGain.gain.exponentialRampToValueAtTime(0.001, time + noteDurationSec + 0.04);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(brassGain);
    brassGain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + noteDurationSec + 0.06);
    osc2.stop(time + noteDurationSec + 0.06);
  }

  /**
   * Main playback loop
   */
  private loop = () => {
    if (!this.isRunning || !this.ctx) return;

    const currentTime = this.ctx.currentTime;
    const lookahead = 0.12; // schedule 120ms ahead

    while (this.nextStepTime < currentTime + lookahead) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.currentStep = (this.currentStep + 1) % this.TOTAL_STEPS;
      this.nextStepTime += this.stepDuration;
    }

    this.timerId = window.setTimeout(this.loop, 30);
  };

  /**
   * Play / Start music
   */
  public play() {
    this.initAudio();
    if (!this.ctx || !this.masterGain) return;

    if (this.isRunning) return;

    this.isRunning = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    // Smooth fade in
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.4);

    this.loop();
    this.notifyListeners(true);
  }

  /**
   * Pause / Stop music
   */
  public pause() {
    if (!this.isRunning) return;

    if (this.ctx && this.masterGain) {
      // Smooth fade out
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    }

    setTimeout(() => {
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.isRunning = false;
      this.notifyListeners(false);
    }, 300);
  }

  /**
   * Toggle music play/pause
   */
  public toggle(): boolean {
    if (this.isRunning) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && this.isRunning) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public subscribe(listener: AudioEventListener): () => void {
    this.listeners.add(listener);
    // Notify immediate state
    listener(this.isRunning);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(playing: boolean) {
    this.listeners.forEach((listener) => {
      try {
        listener(playing);
      } catch {
        // ignore listener errors
      }
    });
  }
}

export const lagosVibeAudio = new CityBoysAudioEngine();
