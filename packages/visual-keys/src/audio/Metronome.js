/**
 * Metronome class for timing and beat generation
 */
export class Metronome {
  /**
   * @param {Object} options - Metronome options
   * @param {number} options.tempo - Tempo in BPM (beats per minute)
   * @param {AudioContext} options.audioContext - Web Audio API context
   * @param {number} options.timeSignature - Time signature (beats per measure)
   * @param {Function} options.onTick - Callback fired on each tick with beat position
   * @param {Function} options.onBeatScheduled - Optional callback fired when a beat is scheduled
   */
  constructor(options = {}) {
    this.tempo = options.tempo || 120;
    this.timeSignature = options.timeSignature || 4;
    this.audioContext = options.audioContext;
    this.onTick = options.onTick || (() => {});
    this.onBeatScheduled = options.onBeatScheduled || (() => {});

    this.isPlaying = false;
    this.nextTickTime = 0;
    this.currentBeat = 0;
    this.scheduledTicks = [];
    this.lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
    this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (in seconds)
    this.timerID = null;
    this.beatStartTime = 0; // Time when the current beat pattern started

    this._scheduler = this._scheduler.bind(this);
  }

  /**
   * Start the metronome
   * @param {boolean} delayFirstBeat - Whether to delay the first beat to allow visualization to sync
   */
  start(delayFirstBeat = true) {
    if (this.isPlaying) return;

    // Reset context if it was closed
    if (this.audioContext && this.audioContext.state === 'closed') {
      throw new Error('AudioContext is closed. Cannot start metronome.');
    }

    this.isPlaying = true;
    this.currentBeat = 0;

    // If we're delaying the first beat to allow visualization to sync
    if (delayFirstBeat) {
      // Calculate a reasonable delay to allow the first beat marker to be visible
      // before the sound plays - one beat duration is a good starting point
      const firstBeatDelay = 60 / this.tempo; // seconds per beat
      this.nextTickTime = this.audioContext.currentTime + firstBeatDelay;

      // Immediately notify about the first beat for visualization purposes
      // This beat will be silent, just for visualization
      this.onBeatScheduled(1, true, this.nextTickTime);
    } else {
      // Start immediately
      this.nextTickTime = this.audioContext.currentTime;
    }

    this.beatStartTime = performance.now() / 1000; // Current time in seconds
    this.timerID = setInterval(this._scheduler, this.lookahead);
  }

  /**
   * Stop the metronome and clear any scheduled events
   */
  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.currentBeat = 0;

    // Clear the timer
    clearInterval(this.timerID);
    this.timerID = null;

    // Cancel any scheduled ticks
    this.scheduledTicks.forEach((tickId) => {
      if (tickId) clearTimeout(tickId);
    });
    this.scheduledTicks = [];
  }

  /**
   * Set the metronome tempo
   * @param {number} bpm - Beats per minute
   */
  setTempo(bpm) {
    this.tempo = Math.max(30, Math.min(300, bpm)); // Clamp between 30-300 BPM

    // If currently playing, we don't need to restart
    // The next tick will use the new tempo value
  }

  /**
   * Set the time signature
   * @param {number} beats - Number of beats per measure
   */
  setTimeSignature(beats) {
    this.timeSignature = beats;
    // Reset beat counter for consistency
    this.currentBeat = 0;
  }

  /**
   * Main scheduler function that schedules ticks ahead of time
   * @private
   */
  _scheduler() {
    // Schedule ticks until we're ahead by the lookahead amount
    while (this.nextTickTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      // Schedule this tick
      this._scheduleTick(this.nextTickTime, this.currentBeat);

      // Advance time for next tick
      const secondsPerBeat = 60.0 / this.tempo;
      this.nextTickTime += secondsPerBeat;

      // Move to the next beat, wrapping to 0 at the measure boundary
      this.currentBeat = (this.currentBeat + 1) % this.timeSignature;
    }
  }

  /**
   * Schedule a single tick at the specified time
   * @param {number} time - The time to schedule the tick, in seconds
   * @param {number} beatNumber - The beat number within the measure (0-based)
   * @private
   */
  _scheduleTick(time, beatNumber) {
    // Calculate the offset relative to current time
    const relativeTime = time - this.audioContext.currentTime;

    // Only schedule if it's in the future
    if (relativeTime > 0) {
      // Schedule the onTick callback using setTimeout
      const tickId = setTimeout(() => {
        // The first beat (0) is the downbeat
        const isDownbeat = beatNumber === 0;
        this.onTick(beatNumber + 1, isDownbeat, time);
      }, relativeTime * 1000); // Convert to milliseconds

      this.scheduledTicks.push(tickId);

      // Notify about scheduled beat
      // beatNumber is 0-based, add 1 to make it 1-based for UI
      this.onBeatScheduled(beatNumber + 1, beatNumber === 0, time);

      // Clean up old scheduled ticks to prevent memory leak
      if (this.scheduledTicks.length > 20) {
        this.scheduledTicks.shift();
      }
    }
  }

  /**
   * Get the timing accuracy for a hit
   * @param {number} hitTime - The time of the note hit
   * @returns {number} - Accuracy value between 0-1 where 1 is perfect
   */
  getHitAccuracy(hitTime) {
    if (!this.isPlaying) return 0;

    // Calculate beat duration in seconds
    const beatDuration = 60 / this.tempo;

    // Calculate what beat number we should be on based on elapsed time
    const elapsedTime = hitTime - this.beatStartTime;
    const expectedBeatPosition = elapsedTime / beatDuration;

    // Get the fractional part to see how far we are between beats
    const nearestBeat = Math.round(expectedBeatPosition);
    const distanceFromBeat = Math.abs(expectedBeatPosition - nearestBeat);

    // Convert to accuracy value (0-1)
    // A distance of 0 is perfect timing, a distance of 0.5 is halfway between beats
    const accuracy = Math.max(0, 1 - distanceFromBeat * 2);

    return accuracy;
  }

  /**
   * Clean up any resources used by the metronome
   */
  dispose() {
    this.stop();
    this.audioContext = null;
    this.onTick = null;
    this.onBeatScheduled = null;
    this.scheduledTicks = [];
  }
}
