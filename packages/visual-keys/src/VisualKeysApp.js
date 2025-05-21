/**
 * Main class to coordinate the Visual Keys application
 */
export class VisualKeysApp {
  /**
   * @param {Object} options - Application options
   * @param {HTMLElement} options.keyboardContainer - Container for the keyboard UI
   * @param {HTMLElement} options.statusElement - Element for status messages
   * @param {HTMLElement} options.metronomeContainer - Container for metronome controls
   */
  constructor(options = {}) {
    this.keyboardContainer = options.keyboardContainer;
    this.statusElement = options.statusElement;
    this.metronomeContainer = options.metronomeContainer;
    this.activeNotes = new Map(); // Map of active notes by MIDI note number

    // These will be initialized later
    this.midiController = null;
    this.synthEngine = null;
    this.keyboardUI = null;
    this.metronome = null;
    this.metronomeUI = null;

    // Rhythm tracking
    this.rhythmAccuracyTracker = {
      isMetronomeActive: false,
      lastNoteHitTime: 0,
      perfectHits: 0,
      goodHits: 0,
      missedHits: 0,
      totalNotes: 0,
    };

    // Bound methods for event handlers
    this.handleMIDINoteOn = this.handleMIDINoteOn.bind(this);
    this.handleMIDINoteOff = this.handleMIDINoteOff.bind(this);
    this.handleBeatScheduled = this.handleBeatScheduled.bind(this);
  }

  /**
   * Initialize the application components
   */
  async initialize() {
    // Import components dynamically to avoid circular dependencies
    const { MIDIController } = await import('./midi/MIDIController.js');
    const { SynthEngine } = await import('./audio/SynthEngine.js');
    const { KeyboardUI } = await import('./ui/KeyboardUI.js');
    const { NoteConverter } = await import('./utils/NoteConverter.js');
    const { Metronome } = await import('./audio/Metronome.js');
    const { MetronomeUI } = await import('./ui/MetronomeUI.js');

    this.noteConverter = new NoteConverter();

    // Create the synthesizer
    this.synthEngine = new SynthEngine();

    // Create the keyboard UI with callbacks for mouse interaction
    if (this.keyboardContainer) {
      this.keyboardUI = new KeyboardUI(this.keyboardContainer, {
        onNoteOn: (midiNote) => this.playNote(midiNote),
        onNoteOff: (midiNote) => this.stopNote(midiNote),
      });
    }

    // Initialize MIDI controller with callbacks for MIDI events
    this.midiController = new MIDIController({
      onNoteOn: this.handleMIDINoteOn,
      onNoteOff: this.handleMIDINoteOff,
      onStatusChange: (message) => this.updateStatus(message),
    });

    // Initialize metronome if container is provided
    if (this.metronomeContainer) {
      // Create metronome instance
      this.metronome = new Metronome({
        tempo: 120,
        timeSignature: 4,
        audioContext: this.synthEngine.audioContext,
        onTick: (beatNumber, isDownbeat, time) => {
          this.synthEngine.playMetronomeTick(beatNumber, isDownbeat, time);
        },
        onBeatScheduled: this.handleBeatScheduled,
      });

      // Create metronome UI
      this.metronomeUI = new MetronomeUI(this.metronomeContainer, {
        onToggle: (enabled) => {
          this.rhythmAccuracyTracker.isMetronomeActive = enabled;
          if (enabled) {
            // Start with a delay to allow visualization sync
            this.metronome.start(true);
            this.updateStatus('节拍器已启动');
          } else {
            this.metronome.stop();
            this.updateStatus('节拍器已停止');
          }
        },
        onTempoChange: (tempo) => {
          this.metronome.setTempo(tempo);
          this.updateStatus(`节拍器速度: ${tempo} BPM`);
        },
        onTimeSignatureChange: (timeSignature) => {
          this.metronome.setTimeSignature(timeSignature);
          this.updateStatus(`节拍器拍号: ${timeSignature}/4`);
        },
      });
    }

    // Enable WebMIDI
    await this.midiController.initialize();
  }

  /**
   * Handle beat scheduled event from metronome
   * @param {number} beatNumber - Current beat number (1-based)
   * @param {boolean} isDownbeat - Whether it's the first beat in measure
   * @param {number} time - The audioContext time when the beat will play
   */
  handleBeatScheduled(beatNumber, isDownbeat, time) {
    // Add the beat marker to the visualization
    if (this.metronomeUI) {
      this.metronomeUI.addBeatMarker(beatNumber, isDownbeat);
    }
  }

  /**
   * Handle MIDI note on event
   * @param {number} midiNote - MIDI note number
   */
  handleMIDINoteOn(midiNote) {
    // Only process notes within our keyboard range
    if (
      this.keyboardUI &&
      midiNote >= this.keyboardUI.startNote &&
      midiNote <= this.keyboardUI.endNote
    ) {
      // Check rhythm accuracy if metronome is active
      if (this.rhythmAccuracyTracker.isMetronomeActive && this.metronome && this.metronomeUI) {
        const currentTime = performance.now() / 1000;

        // Get accuracy from metronome
        const accuracy = this.metronome.getHitAccuracy(currentTime);

        // Register the note hit in UI visualization
        this.metronomeUI.registerNoteHit(accuracy);

        // Track hit statistics
        this.rhythmAccuracyTracker.lastNoteHitTime = currentTime;
        this.rhythmAccuracyTracker.totalNotes++;

        if (accuracy > 0.9) {
          this.rhythmAccuracyTracker.perfectHits++;
        } else if (accuracy > 0.7) {
          this.rhythmAccuracyTracker.goodHits++;
        } else {
          this.rhythmAccuracyTracker.missedHits++;
        }
      }

      this.playNote(midiNote);
    }
  }

  /**
   * Handle MIDI note off event
   * @param {number} midiNote - MIDI note number
   */
  handleMIDINoteOff(midiNote) {
    // Only process notes within our keyboard range
    if (
      this.keyboardUI &&
      midiNote >= this.keyboardUI.startNote &&
      midiNote <= this.keyboardUI.endNote
    ) {
      this.stopNote(midiNote);
    }
  }

  /**
   * Play a note and update UI
   * @param {number} midiNote - MIDI note number
   */
  playNote(midiNote) {
    const noteName = this.noteConverter.midiToNote(midiNote);

    // Play sound using synthesizer
    this.synthEngine.playNote(noteName);

    // Track active note
    this.activeNotes.set(midiNote, noteName);

    // Update keyboard UI
    if (this.keyboardUI) {
      this.keyboardUI.activateKey(midiNote);
    }
  }

  /**
   * Stop a note and update UI
   * @param {number} midiNote - MIDI note number
   */
  stopNote(midiNote) {
    if (this.activeNotes.has(midiNote)) {
      const noteName = this.activeNotes.get(midiNote);

      // Stop sound
      this.synthEngine.stopNote(noteName);

      // Remove from tracking
      this.activeNotes.delete(midiNote);

      // Update keyboard UI
      if (this.keyboardUI) {
        this.keyboardUI.deactivateKey(midiNote);
      }
    }
  }

  /**
   * Get rhythm accuracy statistics
   * @returns {Object} Statistics about rhythm accuracy
   */
  getRhythmStats() {
    const stats = this.rhythmAccuracyTracker;

    // Calculate percentages
    const perfectPercent =
      stats.totalNotes > 0 ? Math.round((stats.perfectHits / stats.totalNotes) * 100) : 0;

    const goodPercent =
      stats.totalNotes > 0 ? Math.round((stats.goodHits / stats.totalNotes) * 100) : 0;

    const missedPercent =
      stats.totalNotes > 0 ? Math.round((stats.missedHits / stats.totalNotes) * 100) : 0;

    return {
      perfect: stats.perfectHits,
      perfectPercent,
      good: stats.goodHits,
      goodPercent,
      missed: stats.missedHits,
      missedPercent,
      total: stats.totalNotes,
    };
  }

  /**
   * Update status message in the UI
   * @param {string} message - Status message to display
   */
  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  /**
   * Clean up resources before destroying the application
   */
  dispose() {
    // Clean up metronome
    if (this.metronome) {
      this.metronome.stop();
      this.metronome.dispose();
      this.metronome = null;
    }

    if (this.metronomeUI) {
      this.metronomeUI.dispose();
      this.metronomeUI = null;
    }

    // Clean up other resources
    if (this.midiController) {
      this.midiController.disconnect();
      this.midiController = null;
    }

    if (this.synthEngine) {
      // Tone.js cleanup if needed
      this.synthEngine = null;
    }

    // Clear the active notes map
    this.activeNotes.clear();
  }
}
