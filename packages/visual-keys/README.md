# Visual Keys

A virtual MIDI keyboard with visual interface that responds to MIDI input and mouse control.

## Project Structure

After refactoring, the project has been structured into a modular architecture with the following components:

```
src/
├── main.js                 # Entry point that initializes the app
├── VisualKeysApp.js        # Main application coordinator
├── audio/
│   └── SynthEngine.js      # Tone.js synthesizer management
├── midi/
│   └── MIDIController.js   # WebMIDI device handling
├── ui/
│   └── KeyboardUI.js       # Visual keyboard interface
└── utils/
    └── NoteConverter.js    # Utility for note conversion
```

## Class Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  VisualKeysApp  │     │  MIDIController │     │   SynthEngine   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ activeNotes     │────▶│ initialize()    │     │ initializeSynth()│
│ initialize()    │     │ connectToDevice()│    │ playNote()      │
│ playNote()      │     │ getAvailableDevices()│ stopNote()       │
│ stopNote()      │     │ changeDevice()   │    │ updateParams()   │
│ updateStatus()  │     └─────────────────┘     └─────────────────┘
└────────┬────────┘
         │
         │            ┌─────────────────┐     ┌─────────────────┐
         └───────────▶│   KeyboardUI    │     │  NoteConverter  │
                      ├─────────────────┤     ├─────────────────┤
                      │ createKeyboard()│     │ midiToNote()    │
                      │ handleNoteOn()  │     │ isBlackKey()    │
                      │ handleNoteOff() │     └─────────────────┘
                      │ activateKey()   │
                      │ deactivateKey() │
                      └─────────────────┘
```

## Class Responsibilities

### VisualKeysApp

- Main coordinator that connects all components
- Manages application state and active notes
- Routes MIDI and UI events to appropriate handlers

### MIDIController

- Handles WebMIDI initialization and device connections
- Manages MIDI input events (noteon, noteoff)
- Provides device selection capabilities

### SynthEngine

- Manages Tone.js synthesizer and audio effects
- Handles sound generation and parameter control
- Provides note playback functionality

### KeyboardUI

- Creates and manages the visual keyboard interface
- Handles mouse interactions on the keyboard
- Provides visual feedback for active/pressed keys

### NoteConverter

- Utility class for converting between MIDI note numbers and note names
- Provides helper methods for identifying black/white keys

## Usage

```javascript
// main.js example - initializing the application
import { VisualKeysApp } from './VisualKeysApp.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new VisualKeysApp({
    keyboardContainer: document.getElementById('keyboard-container'),
    statusElement: document.getElementById('status'),
  });

  app.initialize();
});
```

## Development

To run the project in development mode:

```
npm run dev
```

To build for production:

```
npm run build
```
