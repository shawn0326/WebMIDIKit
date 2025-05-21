import { VisualKeysApp } from './VisualKeysApp.js';

/**
 * Main entry point for the Visual Keys application.
 * This file only handles the initialization of the application.
 * All functionality has been moved to separate modules:
 * - VisualKeysApp.js - Main application coordinator
 * - audio/SynthEngine.js - Handles Tone.js synthesizer
 * - ui/KeyboardUI.js - Manages keyboard UI and interactions
 * - midi/MIDIController.js - Handles MIDI device connections
 * - utils/NoteConverter.js - Utilities for note conversion
 */

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const keyboardContainer = document.getElementById('keyboard-container');
  const statusElement = document.getElementById('status');
  const metronomeContainer = document.getElementById('metronome-container');

  // Create and initialize the Visual Keys application
  const app = new VisualKeysApp({
    keyboardContainer,
    statusElement,
    metronomeContainer,
  });

  app
    .initialize()
    .then(() => {
      console.log('Visual Keys application initialized successfully');
    })
    .catch((error) => {
      console.error('Error initializing Visual Keys application:', error);
      if (statusElement) {
        statusElement.textContent = 'Error initializing application. Please check the console.';
      }
    });
});
