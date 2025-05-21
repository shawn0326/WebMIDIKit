import * as Tone from 'tone';

/**
 * Manages the synthesizer and audio effects for sound generation
 */
export class SynthEngine {
  constructor() {
    this.initializeSynth();
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
}
