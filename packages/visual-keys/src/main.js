import { WebMidi } from 'webmidi';
import * as Tone from 'tone';

// Create keyboard container
document.addEventListener('DOMContentLoaded', () => {
  // Set up the keyboard container
  const keyboardContainer = document.getElementById('keyboard-container');
  if (keyboardContainer) {
    createVisualKeyboard(keyboardContainer);
  }
});

// Initialize synthesizer
const synth = new Tone.PolySynth(Tone.Synth).toDestination();

// MIDI note to frequency conversion
const midiToNote = (midiNote) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
};

// Map of currently active notes
const activeNotes = new Map();

// Track active keys for visual feedback
const activeKeys = new Set();

// Create visual keyboard with 25 keys (2 octaves + 1 key)
function createVisualKeyboard(container) {
  container.innerHTML = '';
  container.classList.add('keyboard');

  // Starting from C3 (MIDI note 48) to C5 (MIDI note 72)
  const startNote = 48;
  const endNote = startNote + 24; // 25 keys

  // Create a container for white keys
  const whiteKeysContainer = document.createElement('div');
  whiteKeysContainer.classList.add('white-keys-container');

  // Create a container for black keys that will overlay the white keys
  const blackKeysContainer = document.createElement('div');
  blackKeysContainer.classList.add('black-keys-container');

  // Track white key index for positioning black keys
  let whiteKeyIndex = 0;
  const whiteKeyPositions = [];

  // Create white keys first
  for (let midiNote = startNote; midiNote <= endNote; midiNote++) {
    const isBlackKey = [1, 3, 6, 8, 10].includes(midiNote % 12);

    if (!isBlackKey) {
      const key = document.createElement('div');
      key.classList.add('key', 'white-key');
      key.dataset.note = midiNote;
      key.dataset.noteName = midiToNote(midiNote);

      // Add click event for mouse interaction
      key.addEventListener('mousedown', () => playNote(midiNote));
      key.addEventListener('mouseup', () => stopNote(midiNote));
      key.addEventListener('mouseleave', () => {
        if (activeKeys.has(midiNote)) {
          stopNote(midiNote);
        }
      });

      whiteKeysContainer.appendChild(key);
      whiteKeyPositions.push({ note: midiNote, index: whiteKeyIndex });
      whiteKeyIndex++;
    }
  }

  // Add white keys container to the main container
  container.appendChild(whiteKeysContainer);

  // Create black keys with correct positioning
  for (let midiNote = startNote; midiNote <= endNote; midiNote++) {
    const isBlackKey = [1, 3, 6, 8, 10].includes(midiNote % 12);

    if (isBlackKey) {
      const key = document.createElement('div');
      key.classList.add('key', 'black-key');
      key.dataset.note = midiNote;
      key.dataset.noteName = midiToNote(midiNote); // Calculate the position based on the previous white key
      // For black keys, we need to find the white key just before this note in the SAME octave
      const notePosition = midiNote % 12;

      // Find the white key in the same octave (floor division by 12 gives octave)
      const octave = Math.floor(midiNote / 12);
      let offset;

      // Find the white key in the same octave
      // We need to ensure we're getting the white key from the same octave
      if (notePosition === 1) {
        // C#
        const cKey = whiteKeyPositions.find(
          (pos) => pos.note % 12 === 0 && Math.floor(pos.note / 12) === octave,
        );
        offset = cKey ? cKey.index : 0;
      } else if (notePosition === 3) {
        // D#
        const dKey = whiteKeyPositions.find(
          (pos) => pos.note % 12 === 2 && Math.floor(pos.note / 12) === octave,
        );
        offset = dKey ? dKey.index : 0;
      } else if (notePosition === 6) {
        // F#
        const fKey = whiteKeyPositions.find(
          (pos) => pos.note % 12 === 5 && Math.floor(pos.note / 12) === octave,
        );
        offset = fKey ? fKey.index : 0;
      } else if (notePosition === 8) {
        // G#
        const gKey = whiteKeyPositions.find(
          (pos) => pos.note % 12 === 7 && Math.floor(pos.note / 12) === octave,
        );
        offset = gKey ? gKey.index : 0;
      } else if (notePosition === 10) {
        // A#
        const aKey = whiteKeyPositions.find(
          (pos) => pos.note % 12 === 9 && Math.floor(pos.note / 12) === octave,
        );
        offset = aKey ? aKey.index : 0;
      }

      // Position the black key between white keys
      key.style.left = `${offset * 36 + 24}px`; // 36px is white key width

      // Add click event for mouse interaction
      key.addEventListener('mousedown', () => playNote(midiNote));
      key.addEventListener('mouseup', () => stopNote(midiNote));
      key.addEventListener('mouseleave', () => {
        if (activeKeys.has(midiNote)) {
          stopNote(midiNote);
        }
      });

      blackKeysContainer.appendChild(key);
    }
  }

  // Add black keys container on top
  container.appendChild(blackKeysContainer);
}

// Function to play a note
function playNote(midiNote) {
  const noteName = midiToNote(midiNote);

  // Play sound using Tone.js
  synth.triggerAttack(noteName);

  // Track active note
  activeNotes.set(midiNote, noteName);
  activeKeys.add(midiNote);

  // Update visual feedback
  updateKeyDisplay();
}

// Function to stop a note
function stopNote(midiNote) {
  if (activeNotes.has(midiNote)) {
    const noteName = activeNotes.get(midiNote);

    // Stop sound
    synth.triggerRelease(noteName);

    // Remove from tracking
    activeNotes.delete(midiNote);
    activeKeys.delete(midiNote);

    // Update visual feedback
    updateKeyDisplay();
  }
}

// Update the visual display of keys
function updateKeyDisplay() {
  document.querySelectorAll('.key').forEach((key) => {
    const keyNote = parseInt(key.dataset.note);
    if (activeKeys.has(keyNote)) {
      key.classList.add('active');
    } else {
      key.classList.remove('active');
    }
  });
}

// Update status message
function updateStatus(message) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

// Initialize Web MIDI
WebMidi.enable()
  .then(() => {
    console.log('WebMidi enabled successfully!');

    // List available MIDI devices
    console.log('MIDI Inputs:', WebMidi.inputs);

    // Connect to the first available input device
    if (WebMidi.inputs.length > 0) {
      const input = WebMidi.inputs[0];
      console.log(`Connected to ${input.name}`);
      updateStatus(`Connected to MIDI device: ${input.name}`);

      // Listen for note on events
      input.channels.forEach((channel) => {
        channel.addListener('noteon', (e) => {
          const midiNote = e.note.number;
          // Only process notes within our 25-key range
          if (midiNote >= 48 && midiNote <= 72) {
            playNote(midiNote);
          }
        });

        // Listen for note off events
        channel.addListener('noteoff', (e) => {
          const midiNote = e.note.number;
          if (midiNote >= 48 && midiNote <= 72) {
            stopNote(midiNote);
          }
        });
      });
    } else {
      const message = 'No MIDI input devices found. Using computer keyboard or mouse instead.';
      console.log(message);
      updateStatus(message);
    }
  })
  .catch((err) => {
    console.error('Could not enable WebMidi:', err);
    updateStatus(`WebMidi error: ${err.message}. Using computer keyboard or mouse instead.`);
  });

// Add computer keyboard support for testing without MIDI device
const keyboardToMidiMap = {
  a: 48, // C3
  w: 49, // C#3
  s: 50, // D3
  e: 51, // D#3
  d: 52, // E3
  f: 53, // F3
  t: 54, // F#3
  g: 55, // G3
  y: 56, // G#3
  h: 57, // A3
  u: 58, // A#3
  j: 59, // B3
  k: 60, // C4 (middle C)
  o: 61, // C#4
  l: 62, // D4
  p: 63, // D#4
  ';': 64, // E4
  "'": 65, // F4
  ']': 66, // F#4
  '\\': 67, // G4
};

// Computer keyboard event handlers
document.addEventListener('keydown', (e) => {
  if (e.repeat) return; // Ignore key repeat

  const midiNote = keyboardToMidiMap[e.key.toLowerCase()];
  if (midiNote && !activeKeys.has(midiNote)) {
    playNote(midiNote);
  }
});

document.addEventListener('keyup', (e) => {
  const midiNote = keyboardToMidiMap[e.key.toLowerCase()];
  if (midiNote) {
    stopNote(midiNote);
  }
});
