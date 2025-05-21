import { NoteConverter } from '../utils/NoteConverter.js';

/**
 * Handles the visual keyboard interface and user interactions
 */
export class KeyboardUI {
  /**
   * @param {HTMLElement} container - DOM element to contain the keyboard
   * @param {Object} options - Keyboard options
   * @param {number} options.startNote - Starting MIDI note number (default: 36 for C2)
   * @param {number} options.numKeys - Number of keys to display (default: 49)
   * @param {Function} options.onNoteOn - Callback when a note is pressed
   * @param {Function} options.onNoteOff - Callback when a note is released
   */
  constructor(container, options = {}) {
    this.container = container;
    this.startNote = options.startNote || 36; // C2
    this.numKeys = options.numKeys || 49;
    this.endNote = this.startNote + this.numKeys - 1;
    this.onNoteOn = options.onNoteOn || (() => {});
    this.onNoteOff = options.onNoteOff || (() => {});

    this.noteConverter = new NoteConverter();
    this.activeKeys = new Set();

    this.createKeyboard();
  }

  /**
   * Create the visual keyboard
   */
  createKeyboard() {
    this.container.innerHTML = '';
    this.container.classList.add('keyboard');

    // Create containers for white and black keys
    this.whiteKeysContainer = document.createElement('div');
    this.whiteKeysContainer.classList.add('white-keys-container');

    this.blackKeysContainer = document.createElement('div');
    this.blackKeysContainer.classList.add('black-keys-container');

    // Track white key positions for black key positioning
    let whiteKeyIndex = 0;
    this.whiteKeyPositions = [];

    // Create white keys
    for (let midiNote = this.startNote; midiNote <= this.endNote; midiNote++) {
      if (!this.noteConverter.isBlackKey(midiNote)) {
        const key = this.createKey(midiNote, 'white-key');
        this.whiteKeysContainer.appendChild(key);
        this.whiteKeyPositions.push({ note: midiNote, index: whiteKeyIndex });
        whiteKeyIndex++;
      }
    }

    // Add white keys to the container
    this.container.appendChild(this.whiteKeysContainer);

    // Create black keys with correct positioning
    for (let midiNote = this.startNote; midiNote <= this.endNote; midiNote++) {
      if (this.noteConverter.isBlackKey(midiNote)) {
        const key = this.createKey(midiNote, 'black-key');
        this.positionBlackKey(key, midiNote);
        this.blackKeysContainer.appendChild(key);
      }
    }

    // Add black keys container on top
    this.container.appendChild(this.blackKeysContainer);
  }

  /**
   * Create a key element
   * @param {number} midiNote - MIDI note number
   * @param {string} keyType - CSS class for key type ('white-key' or 'black-key')
   * @returns {HTMLElement} The created key element
   */
  createKey(midiNote, keyType) {
    const key = document.createElement('div');
    key.classList.add('key', keyType);
    key.dataset.note = midiNote;
    key.dataset.noteName = this.noteConverter.midiToNote(midiNote);

    // Add mouse event listeners
    key.addEventListener('mousedown', () => this.handleNoteOn(midiNote));
    key.addEventListener('mouseup', () => this.handleNoteOff(midiNote));
    key.addEventListener('mouseleave', () => {
      if (this.activeKeys.has(midiNote)) {
        this.handleNoteOff(midiNote);
      }
    });

    return key;
  }

  /**
   * Position a black key correctly relative to white keys
   * @param {HTMLElement} keyElement - The black key element
   * @param {number} midiNote - MIDI note number
   */
  positionBlackKey(keyElement, midiNote) {
    const notePosition = midiNote % 12;
    const octave = Math.floor(midiNote / 12);
    let offset;

    // Find the white key in the same octave for positioning reference
    if (notePosition === 1) {
      // C#
      offset = this.findWhiteKeyIndex(0, octave);
    } else if (notePosition === 3) {
      // D#
      offset = this.findWhiteKeyIndex(2, octave);
    } else if (notePosition === 6) {
      // F#
      offset = this.findWhiteKeyIndex(5, octave);
    } else if (notePosition === 8) {
      // G#
      offset = this.findWhiteKeyIndex(7, octave);
    } else if (notePosition === 10) {
      // A#
      offset = this.findWhiteKeyIndex(9, octave);
    }

    // Position the black key between white keys
    const whiteKeyWidth = 36;
    const blackKeyWidth = 20;
    const adjustedOffset = (offset + 1) * whiteKeyWidth - blackKeyWidth / 2;
    keyElement.style.left = `${adjustedOffset}px`;
  }

  /**
   * Find the index of a white key by note and octave
   * @param {number} noteValue - Note value within octave (0-11)
   * @param {number} octave - Octave number
   * @returns {number} Index of the white key
   */
  findWhiteKeyIndex(noteValue, octave) {
    const foundKey = this.whiteKeyPositions.find(
      (pos) => pos.note % 12 === noteValue && Math.floor(pos.note / 12) === octave,
    );
    return foundKey ? foundKey.index : 0;
  }

  /**
   * Handle note on event (key pressed)
   * @param {number} midiNote - MIDI note number
   */
  handleNoteOn(midiNote) {
    this.activeKeys.add(midiNote);
    this.onNoteOn(midiNote);
    this.updateKeyDisplay();
  }

  /**
   * Handle note off event (key released)
   * @param {number} midiNote - MIDI note number
   */
  handleNoteOff(midiNote) {
    this.activeKeys.delete(midiNote);
    this.onNoteOff(midiNote);
    this.updateKeyDisplay();
  }

  /**
   * Update the visual display of keys (active/inactive state)
   */
  updateKeyDisplay() {
    document.querySelectorAll('.key').forEach((key) => {
      const keyNote = parseInt(key.dataset.note);
      if (this.activeKeys.has(keyNote)) {
        key.classList.add('active');
      } else {
        key.classList.remove('active');
      }
    });
  }

  /**
   * Set a key as active (for MIDI input)
   * @param {number} midiNote - MIDI note number
   */
  activateKey(midiNote) {
    if (midiNote >= this.startNote && midiNote <= this.endNote) {
      this.activeKeys.add(midiNote);
      this.updateKeyDisplay();
    }
  }

  /**
   * Set a key as inactive (for MIDI input)
   * @param {number} midiNote - MIDI note number
   */
  deactivateKey(midiNote) {
    if (this.activeKeys.has(midiNote)) {
      this.activeKeys.delete(midiNote);
      this.updateKeyDisplay();
    }
  }
}
