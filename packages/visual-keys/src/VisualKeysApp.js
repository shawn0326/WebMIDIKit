/**
 * Main class to coordinate the Visual Keys application
 */
export class VisualKeysApp {
  /**
   * @param {Object} options - Application options
   * @param {HTMLElement} options.keyboardContainer - Container for the keyboard UI
   * @param {HTMLElement} options.statusElement - Element for status messages
   */
  constructor(options = {}) {
    this.keyboardContainer = options.keyboardContainer;
    this.statusElement = options.statusElement;
    this.activeNotes = new Map(); // Map of active notes by MIDI note number

    // These will be initialized later
    this.midiController = null;
    this.synthEngine = null;
    this.keyboardUI = null;

    // Bound methods for event handlers
    this.handleMIDINoteOn = this.handleMIDINoteOn.bind(this);
    this.handleMIDINoteOff = this.handleMIDINoteOff.bind(this);
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

    // Enable WebMIDI
    await this.midiController.initialize();
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
   * Update status message in the UI
   * @param {string} message - Status message to display
   */
  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }
}
