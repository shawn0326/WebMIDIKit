/**
 * UI component for metronome controls
 */
export class MetronomeUI {
  /**
   * @param {HTMLElement} container - Container element for the metronome UI
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onToggle - Called when metronome is toggled
   * @param {Function} callbacks.onTempoChange - Called when tempo is changed
   * @param {Function} callbacks.onTimeSignatureChange - Called when time signature is changed
   * @param {Function} callbacks.onBeatRendered - Called when a beat is rendered in the visualization
   */
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.enabled = false;

    // Rhythm visualization properties
    this.canvas = null;
    this.ctx = null;
    this.beatMarkers = [];
    this.hitMarkers = [];
    this.lastBeatTime = 0;
    this.accuracyThreshold = 0.15; // Threshold for "good" hit in seconds
    this.markerSpeed = 2; // How fast markers move (pixels per frame)
    this.animationFrameId = null;
    this.showVisualization = true; // Whether to show the visualization
    this.hitLineX = 80; // X position of the hit line
    this.scheduledBeats = new Map(); // Map to track scheduled beats and their target times
    this.firstBeat = true; // Flag to track first beat after starting
    this.currentTempo = 120; // Default tempo
    this.secondsPerBeat = 60 / this.currentTempo; // Seconds per beat at current tempo

    this.createUI();
    this.attachEventListeners();
    this.setupRhythmVisualization();
    this.startAnimation();
  }

  /**
   * Create the metronome UI elements
   */
  createUI() {
    // Create metronome UI container
    const metronomeCss = `
      .metronome-controls {
        display: flex;
        flex-direction: column;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f5f5f5;
        margin: 10px 0;
        font-family: sans-serif;
      }
      .metronome-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .metronome-header h3 {
        margin: 0;
      }
      .metronome-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
      }
      .metronome-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .metronome-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 24px;
      }
      .metronome-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      input:checked + .metronome-slider {
        background-color: #2196F3;
      }
      input:checked + .metronome-slider:before {
        transform: translateX(26px);
      }
      .tempo-control {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }
      .tempo-control label {
        margin-right: 10px;
        width: 80px;
      }
      .tempo-control input[type="number"] {
        width: 60px;
        margin-right: 10px;
      }
      .tempo-control input[type="range"] {
        flex-grow: 1;
      }
      .time-signature-control {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }
      .time-signature-control label {
        margin-right: 10px;
        width: 80px;
      }
      .visualization-control {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }
      .visualization-control label {
        margin-right: 10px;
      }
      .rhythm-visualization {
        width: 100%;
        height: 120px;
        background-color: #222;
        border-radius: 4px;
        margin-top: 10px;
        position: relative;
        overflow: hidden;
      }
      .rhythm-visualization canvas {
        width: 100%;
        height: 100%;
      }
      .hit-line {
        position: absolute;
        left: 80px;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: #FF5722;
        z-index: 2;
      }
      .accuracy-display {
        position: absolute;
        top: 5px;
        left: 5px;
        color: white;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        background-color: rgba(0,0,0,0.5);
        z-index: 3;
      }
    `;

    // Create style element
    const styleElem = document.createElement('style');
    styleElem.textContent = metronomeCss;
    document.head.appendChild(styleElem);

    // Add HTML content
    this.container.innerHTML = `
      <div class="metronome-controls">
        <div class="metronome-header">
          <h3>节拍器</h3>
          <label class="metronome-switch">
            <input type="checkbox" id="metronome-toggle">
            <span class="metronome-slider"></span>
          </label>
        </div>
        
        <div class="metronome-settings">
          <div class="tempo-control">
            <label for="tempo-input">速度 (BPM):</label>
            <input type="number" id="tempo-input" min="40" max="240" value="120">
            <input type="range" id="tempo-slider" min="40" max="240" value="120">
          </div>
          
          <div class="time-signature-control">
            <label for="time-signature">拍号:</label>
            <select id="time-signature">
              <option value="2">2/4</option>
              <option value="3">3/4</option>
              <option value="4" selected>4/4</option>
              <option value="6">6/8</option>
            </select>
          </div>
          
          <div class="visualization-control">
            <label for="vis-toggle">节奏监视:</label>
            <label class="metronome-switch">
              <input type="checkbox" id="vis-toggle" checked>
              <span class="metronome-slider"></span>
            </label>
          </div>
        </div>
        
        <div id="rhythm-visualization" class="rhythm-visualization">
          <div class="hit-line"></div>
          <div class="accuracy-display"></div>
          <canvas id="rhythm-canvas"></canvas>
        </div>
      </div>
    `;

    // Get references to the UI elements
    this.toggleCheckbox = this.container.querySelector('#metronome-toggle');
    this.tempoInput = this.container.querySelector('#tempo-input');
    this.tempoSlider = this.container.querySelector('#tempo-slider');
    this.timeSignatureSelect = this.container.querySelector('#time-signature');
    this.visToggle = this.container.querySelector('#vis-toggle');
    this.rhythmVisualization = this.container.querySelector('#rhythm-visualization');
    this.accuracyDisplay = this.container.querySelector('.accuracy-display');
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Toggle metronome on/off
    this.toggleCheckbox.addEventListener('change', () => {
      this.enabled = this.toggleCheckbox.checked;
      this.resetVisualization(this.enabled);
      if (this.callbacks.onToggle) {
        this.callbacks.onToggle(this.enabled);
      }
    });

    // Handle tempo changes
    this.tempoInput.addEventListener('change', () => this.handleTempoChange());
    this.tempoSlider.addEventListener('input', () => {
      this.tempoInput.value = this.tempoSlider.value;
      this.handleTempoChange();
    });

    // Handle time signature changes
    this.timeSignatureSelect.addEventListener('change', () => {
      const timeSignature = parseInt(this.timeSignatureSelect.value, 10);
      if (this.callbacks.onTimeSignatureChange) {
        this.callbacks.onTimeSignatureChange(timeSignature);
      }
    });

    // Toggle visualization
    this.visToggle.addEventListener('change', () => {
      this.showVisualization = this.visToggle.checked;
      this.rhythmVisualization.style.display = this.showVisualization ? 'block' : 'none';
    });
  }

  /**
   * Setup the rhythm visualization canvas
   */
  setupRhythmVisualization() {
    // Get the canvas and context
    this.canvas = this.container.querySelector('#rhythm-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Set canvas dimensions to match its display size
    this.resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize canvas to match display size
   */
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  /**
   * Start the animation loop
   */
  startAnimation() {
    const animate = () => {
      this.renderRhythmVisualization();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Render the rhythm visualization
   */
  renderRhythmVisualization() {
    if (!this.ctx || !this.showVisualization) return;

    const { width, height } = this.canvas;
    const hitLineX = 80; // X position of the hit line

    // Clear the canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Highlight the hit line area
    this.ctx.fillStyle = 'rgba(255, 87, 34, 0.2)';
    this.ctx.fillRect(hitLineX - 10, 0, 20, height);

    // Update and draw beat markers
    this.updateBeatMarkers();
    this.drawBeatMarkers();

    // Update and draw hit markers
    this.updateHitMarkers();
    this.drawHitMarkers();
  }

  /**
   * Update beat markers positions
   */
  updateBeatMarkers() {
    const now = performance.now() / 1000;

    // Move all beat markers based on their target time
    this.beatMarkers.forEach((marker) => {
      const timeLeft = marker.targetTime - now;
      const totalTime = marker.targetTime - marker.time;
      const progress = 1 - timeLeft / totalTime;

      if (this.firstBeat) {
        marker.x = this.hitLineX; // Keep the first beat at hit line
      } else {
        const distance = this.canvas.width - this.hitLineX;
        marker.x = this.canvas.width - progress * distance;
      }
    });

    // Remove markers that are off-screen
    this.beatMarkers = this.beatMarkers.filter((marker) => marker.x > -30);
  }

  /**
   * Draw beat markers on the canvas
   */
  drawBeatMarkers() {
    const { height } = this.canvas;

    this.beatMarkers.forEach((marker) => {
      this.ctx.beginPath();
      this.ctx.arc(marker.x, height / 2, 10, 0, Math.PI * 2);

      // Different color for downbeat
      if (marker.isDownbeat) {
        this.ctx.fillStyle = '#FF5722'; // Orange for downbeat
      } else {
        this.ctx.fillStyle = '#2196F3'; // Blue for regular beats
      }

      this.ctx.fill();

      // Draw beat number
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(marker.beatNumber, marker.x, height / 2 + 3);
    });
  }

  /**
   * Update hit markers positions
   */
  updateHitMarkers() {
    // Move all hit markers to the left
    this.hitMarkers.forEach((marker) => {
      marker.x -= this.markerSpeed;

      // Fade out
      marker.opacity -= 0.01;
      if (marker.opacity < 0) marker.opacity = 0;
    });

    // Remove markers that are off-screen or faded out
    this.hitMarkers = this.hitMarkers.filter((marker) => marker.x > -30 && marker.opacity > 0);
  }

  /**
   * Draw hit markers on the canvas
   */
  drawHitMarkers() {
    const { height } = this.canvas;

    this.hitMarkers.forEach((marker) => {
      this.ctx.beginPath();
      this.ctx.arc(marker.x, height / 2, 12, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${marker.opacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Fill with color based on accuracy
      const color = this.getAccuracyColor(marker.accuracy);
      this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${marker.opacity})`;
      this.ctx.fill();
    });
  }

  /**
   * Get color based on accuracy
   * @param {number} accuracy - Accuracy value (0-1, where 1 is perfect)
   * @returns {Object} Color object with r, g, b values
   */
  getAccuracyColor(accuracy) {
    if (accuracy > 0.9) {
      return { r: 76, g: 175, b: 80 }; // Green (perfect)
    } else if (accuracy > 0.7) {
      return { r: 255, g: 193, b: 7 }; // Yellow (good)
    } else {
      return { r: 244, g: 67, b: 54 }; // Red (poor)
    }
  }

  /**
   * Add a new beat marker
   * @param {number} beatNumber - Beat number (1-based)
   * @param {boolean} isDownbeat - Whether this beat is the first beat in a measure
   */
  addBeatMarker(beatNumber, isDownbeat) {
    if (!this.canvas) return;

    const { width } = this.canvas;
    const now = performance.now() / 1000; // Current time in seconds

    // If this is the first beat after starting the metronome,
    // place it directly at the hit line
    let startX;
    if (this.firstBeat) {
      startX = this.hitLineX;
      this.firstBeat = false;
    } else {
      startX = width; // Start new beats from the right edge
    }

    // Create the beat marker
    const marker = {
      x: startX,
      beatNumber,
      isDownbeat,
      time: now,
      targetTime: now + this.secondsPerBeat, // When this beat should reach the hit line
    };

    this.beatMarkers.push(marker);

    // Store the beat timing for hit accuracy calculation
    this.lastBeatTime = marker.targetTime;

    // If callback provided, notify that a beat was rendered
    if (this.callbacks.onBeatRendered) {
      this.callbacks.onBeatRendered(beatNumber, isDownbeat, marker.targetTime);
    }
  }

  /**
   * Register a note hit and check accuracy against the metronome beat
   * @param {number} accuracyValue - Accuracy value (0-1)
   */
  registerNoteHit(accuracyValue) {
    if (!this.enabled || !this.showVisualization) return;

    // Add a hit marker at the hit line
    const hitLineX = 80;
    this.hitMarkers.push({
      x: hitLineX,
      accuracy: accuracyValue,
      opacity: 1.0,
    });

    // Update accuracy display
    this.displayAccuracy(accuracyValue);
  }

  /**
   * Display accuracy feedback
   * @param {number} accuracyValue - Accuracy value (0-1)
   */
  displayAccuracy(accuracyValue) {
    let message, color;

    if (accuracyValue > 0.9) {
      message = '完美!';
      color = 'rgba(76, 175, 80, 0.8)';
    } else if (accuracyValue > 0.7) {
      message = '不错!';
      color = 'rgba(255, 193, 7, 0.8)';
    } else if (accuracyValue > 0.5) {
      message = '可以!';
      color = 'rgba(255, 152, 0, 0.8)';
    } else {
      message = '差了点';
      color = 'rgba(244, 67, 54, 0.8)';
    }

    // Show accuracy message
    this.accuracyDisplay.textContent = message;
    this.accuracyDisplay.style.backgroundColor = color;
    this.accuracyDisplay.style.opacity = 1;

    // Fade out after a moment
    setTimeout(() => {
      this.accuracyDisplay.style.opacity = 0.7;
      setTimeout(() => {
        this.accuracyDisplay.style.opacity = 0;
      }, 500);
    }, 500);
  }

  /**
   * Handle tempo changes from either input or slider
   */
  handleTempoChange() {
    const tempo = Math.min(240, Math.max(40, parseInt(this.tempoInput.value, 10)));
    this.tempoInput.value = tempo;
    this.tempoSlider.value = tempo;

    this.currentTempo = tempo;
    this.secondsPerBeat = 60 / this.currentTempo;

    if (this.callbacks.onTempoChange) {
      this.callbacks.onTempoChange(tempo);
    }

    // Adjust marker speed based on tempo
    this.updateMarkerSpeed();
  }

  /**
   * Update the marker speed based on current tempo and canvas width
   */
  updateMarkerSpeed() {
    const { width } = this.canvas;
    // Calculate how many pixels per second the marker should move
    // to reach the hit line in exactly one beat duration
    const distanceToHitLine = width - this.hitLineX;
    this.markerSpeed = distanceToHitLine / (this.secondsPerBeat * 60); // pixels per frame at 60fps
  }

  /**
   * Reset visualization state, called when metronome is toggled
   * @param {boolean} enabled - Whether the metronome is being enabled or disabled
   */
  resetVisualization(enabled) {
    // Clear all existing markers
    this.beatMarkers = [];
    this.hitMarkers = [];

    // Reset the first beat flag if metronome is being turned on
    if (enabled) {
      this.firstBeat = true;
      this.updateMarkerSpeed();
    }
  }

  /**
   * Update the metronome tempo display
   * @param {number} tempo - Tempo in BPM
   */
  updateTempo(tempo) {
    this.tempoInput.value = tempo;
    this.tempoSlider.value = tempo;

    // Adjust marker speed based on tempo
    this.updateMarkerSpeed();
  }

  /**
   * Update the metronome time signature display
   * @param {number} timeSignature - Time signature (beats per measure)
   */
  updateTimeSignature(timeSignature) {
    this.timeSignatureSelect.value = timeSignature.toString();
  }

  /**
   * Remove event listeners and clean up resources
   */
  dispose() {
    // Stop animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove event listeners
    window.removeEventListener('resize', this.resizeHandler);
    this.toggleCheckbox.removeEventListener('change', this.toggleHandler);
    this.tempoInput.removeEventListener('change', this.tempoInputHandler);
    this.tempoSlider.removeEventListener('input', this.tempoSliderHandler);
    this.timeSignatureSelect.removeEventListener('change', this.timeSignatureHandler);
    this.visToggle.removeEventListener('change', this.visToggleHandler);

    // Clear arrays
    this.beatMarkers = [];
    this.hitMarkers = [];
  }
}
