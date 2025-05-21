/**
 * Utility class for converting between MIDI notes and musical notation
 */
export class NoteConverter {
  constructor() {
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  /**
   * Convert MIDI note number to note name with octave
   * @param {number} midiNote - MIDI note number
   * @returns {string} Note name with octave (e.g., "C4")
   */
  midiToNote(midiNote) {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = this.noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  /**
   * Check if a MIDI note represents a black key
   * @param {number} midiNote - MIDI note number
   * @returns {boolean} True if the note is a black key
   */
  isBlackKey(midiNote) {
    return [1, 3, 6, 8, 10].includes(midiNote % 12);
  }
}
