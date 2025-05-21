import { WebMidi } from 'webmidi';

/**
 * Handles MIDI device connections and MIDI events
 */
export class MIDIController {
  /**
   * @param {Object} options - MIDI controller options
   * @param {Function} options.onNoteOn - Callback when a MIDI note is pressed
   * @param {Function} options.onNoteOff - Callback when a MIDI note is released
   * @param {Function} options.onStatusChange - Callback for status updates
   */
  constructor(options = {}) {
    this.onNoteOn = options.onNoteOn || (() => {});
    this.onNoteOff = options.onNoteOff || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.midiInput = null;
  }

  /**
   * Initialize WebMIDI and connect to available devices
   * @returns {Promise} Promise resolving when MIDI is enabled
   */
  async initialize() {
    try {
      await WebMidi.enable();
      console.log('WebMidi enabled successfully!');

      // List available MIDI devices
      console.log('MIDI Inputs:', WebMidi.inputs);

      // Connect to the first available input device
      if (WebMidi.inputs.length > 0) {
        this.connectToDevice(WebMidi.inputs[0]);
        return true;
      } else {
        const message = 'No MIDI input devices found. Please connect a MIDI device to play.';
        console.log(message);
        this.onStatusChange(message);
        return false;
      }
    } catch (err) {
      console.error('Could not enable WebMidi:', err);
      this.onStatusChange(
        `WebMidi error: ${err.message}. Please check your MIDI device connection.`,
      );
      return false;
    }
  }

  /**
   * Connect to a specific MIDI input device
   * @param {WebMidi.Input} inputDevice - MIDI input device
   */
  connectToDevice(inputDevice) {
    this.midiInput = inputDevice;
    console.log(`Connected to ${inputDevice.name}`);
    this.onStatusChange(`Connected to MIDI device: ${inputDevice.name}`);

    // Set up event listeners for all channels
    inputDevice.channels.forEach((channel) => {
      // Listen for note on events
      channel.addListener('noteon', (e) => {
        const midiNote = e.note.number;
        this.onNoteOn(midiNote);
      });

      // Listen for note off events
      channel.addListener('noteoff', (e) => {
        const midiNote = e.note.number;
        this.onNoteOff(midiNote);
      });
    });
  }

  /**
   * Get a list of all available MIDI devices
   * @returns {Array} Array of available MIDI input devices
   */
  getAvailableDevices() {
    return WebMidi.inputs;
  }

  /**
   * Change the connected MIDI device by index
   * @param {number} deviceIndex - Index of the device in WebMidi.inputs array
   * @returns {boolean} True if successful, false if invalid index
   */
  changeDevice(deviceIndex) {
    if (deviceIndex >= 0 && deviceIndex < WebMidi.inputs.length) {
      // Remove listeners from current device if exists
      if (this.midiInput) {
        this.midiInput.channels.forEach((channel) => {
          channel.removeListener('noteon');
          channel.removeListener('noteoff');
        });
      }

      // Connect to new device
      this.connectToDevice(WebMidi.inputs[deviceIndex]);
      return true;
    }
    return false;
  }
}
