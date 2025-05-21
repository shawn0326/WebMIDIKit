import * as Tone from 'tone';

/**
 * Manages the synthesizer and audio effects for sound generation
 */
export class SynthEngine {
  constructor() {
    this.initializeSynth();
    // Initialize audio context for metronome
    this.audioContext = Tone.context.rawContext;
  }

  /**
   * Initialize Tone.js synthesizer and audio effects
   */
  initializeSynth() {
    // Create polyphonic synthesizer
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
        spread: 10,
        count: 3,
      },
      envelope: {
        attack: 0.005,
        decay: 0.2,
        sustain: 0.4,
        release: 1.5,
      },
    });

    // Create audio effects
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 3000,
      Q: 1,
    });

    this.reverb = new Tone.Reverb({
      decay: 2,
      wet: 0.1,
    });

    // Connect components in the audio chain
    this.synth.chain(this.filter, this.reverb, Tone.getDestination());
  }

  /**
   * Play a note using the synthesizer
   * @param {string} noteName - Note name with octave (e.g., "C4")
   */
  playNote(noteName) {
    this.synth.triggerAttack(noteName);
  }

  /**
   * Stop playing a note
   * @param {string} noteName - Note name with octave (e.g., "C4")
   */
  stopNote(noteName) {
    this.synth.triggerRelease(noteName);
  }

  /**
   * Update synthesizer parameters
   * @param {Object} params - Synthesizer parameters to update
   */
  updateParams(params) {
    // This method can be expanded to allow parameter adjustments
    if (params.filterFreq) {
      this.filter.frequency.value = params.filterFreq;
    }
    if (params.reverbWet) {
      this.reverb.wet.value = params.reverbWet;
    }
    // Additional parameters can be added here
  }

  /**
   * Create and play a metronome tick sound
   * @param {number} beatNumber - Current beat number (1-based)
   * @param {boolean} isDownbeat - Whether this is the first beat in measure
   * @param {number} time - The time to schedule the tick (in seconds)
   */
  playMetronomeTick(beatNumber, isDownbeat, time = null) {
    // Use current time if no specific time is provided
    const playTime = time || this.audioContext.currentTime;

    // Create an oscillator for the tick sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Different sound for downbeat vs regular beat
    if (isDownbeat) {
      oscillator.frequency.value = 1000; // Higher pitch for downbeat
      gainNode.gain.value = 0.3;
    } else {
      oscillator.frequency.value = 800; // Lower pitch for regular beats
      gainNode.gain.value = 0.2;
    }

    // Connect and configure sound
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Short click sound - schedule precisely
    oscillator.start(playTime);

    // Quick decay for a "click" sound
    gainNode.gain.setValueAtTime(gainNode.gain.value, playTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, playTime + 0.05);

    // Stop after the sound completes
    oscillator.stop(playTime + 0.06);
  }
}
