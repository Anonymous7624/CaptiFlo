// Audio recording with WebM and Raw PCM fallback support

// WebM recorder using MediaRecorder (existing functionality)
export class WebmRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.isRecording = false;
    this.onDataAvailable = null;
    this.onError = null;
  }

  async start(stream, { lang, vad, session, onDataAvailable, onError }) {
    try {
      this.stream = stream;
      this.onDataAvailable = onDataAvailable;
      this.onError = onError;

      // Create MediaRecorder with opus codec
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Handle audio data every second
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.onDataAvailable) {
          this.onDataAvailable(event.data, { lang, vad, session });
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        if (this.onError) this.onError(event.error);
      };

      // Start recording with 1-second intervals
      this.mediaRecorder.start(1000);
      this.isRecording = true;

    } catch (error) {
      console.error('Failed to start WebM recording:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.mediaRecorder = null;
  }

  getState() {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }
}

// Raw PCM recorder using Web Audio API
export class RawPcmRecorder {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.workletNode = null;
    this.stream = null;
    this.isRecording = false;
    this.onDataAvailable = null;
    this.onError = null;
    this.useWorklet = false;
    this.buffer = [];
    this.sampleRate = 48000;
    this.targetSampleRate = 16000;
    this.chunkSize = 16000; // 1 second at 16kHz
  }

  async start(stream, { lang, vad, session, onDataAvailable, onError }) {
    try {
      this.stream = stream;
      this.onDataAvailable = onDataAvailable;
      this.onError = onError;

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;
      
      // Create source node from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

      // Try to use AudioWorklet first, fallback to ScriptProcessor
      try {
        await this.setupAudioWorklet({ lang, vad, session });
        this.useWorklet = true;
      } catch (workletError) {
        console.warn('AudioWorklet not available, falling back to ScriptProcessor:', workletError);
        this.setupScriptProcessor({ lang, vad, session });
        this.useWorklet = false;
      }

      this.isRecording = true;

    } catch (error) {
      console.error('Failed to start Raw PCM recording:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  async setupAudioWorklet({ lang, vad, session }) {
    // Load the worklet module
    await this.audioContext.audioWorklet.addModule('/worklets/pcm-worklet.js');
    
    // Create worklet node
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
    
    // Send sample rate to worklet
    this.workletNode.port.postMessage({
      type: 'setSampleRate',
      sampleRate: this.sampleRate
    });
    
    // Handle messages from worklet
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioChunk') {
        this.sendPcmChunk(event.data.data, { lang, vad, session });
      }
    };
    
    // Connect nodes
    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  setupScriptProcessor({ lang, vad, session }) {
    // Create script processor (deprecated but widely supported)
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    this.processorNode.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0); // Get mono channel
      
      // Resample and convert
      const resampled = this.resample(Array.from(inputData));
      this.buffer.push(...resampled);
      
      // Send chunks when we have enough data
      while (this.buffer.length >= this.chunkSize) {
        const chunk = this.buffer.splice(0, this.chunkSize);
        const pcmBytes = this.float32ToInt16LE(chunk);
        this.sendPcmChunk(pcmBytes, { lang, vad, session });
      }
    };
    
    // Connect nodes
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  // Simple linear interpolation resampling
  resample(inputSamples) {
    const resampleRatio = this.sampleRate / this.targetSampleRate;
    
    if (resampleRatio === 1) {
      return inputSamples;
    }
    
    const outputLength = Math.floor(inputSamples.length / resampleRatio);
    const output = new Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * resampleRatio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputSamples.length - 1);
      const fraction = srcIndex - srcIndexFloor;
      
      // Linear interpolation
      const sample1 = inputSamples[srcIndexFloor] || 0;
      const sample2 = inputSamples[srcIndexCeil] || 0;
      output[i] = sample1 + (sample2 - sample1) * fraction;
    }
    
    return output;
  }

  // Convert Float32 samples to Int16 little-endian bytes
  float32ToInt16LE(samples) {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < samples.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit signed integer
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      const int16Value = Math.round(clamped * 32767);
      view.setInt16(i * 2, int16Value, true); // true = little-endian
    }
    
    return new Uint8Array(buffer);
  }

  async sendPcmChunk(pcmBytes, { lang, vad, session }) {
    if (this.onDataAvailable) {
      // Create a blob-like object for consistency with WebM recorder
      const pcmBlob = new Blob([pcmBytes], { type: 'application/octet-stream' });
      this.onDataAvailable(pcmBlob, { lang, vad, session, isRawPcm: true });
    }
  }

  stop() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isRecording = false;
    this.buffer = [];
  }

  getState() {
    return this.isRecording ? 'recording' : 'inactive';
  }
}

// Legacy AudioRecorder class for backward compatibility
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.isRecording = false;
  }

  async start({ onDataAvailable, onError }) {
    try {
      // Get user media with enhanced audio settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Create MediaRecorder with opus codec
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Handle audio data every second
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onDataAvailable) {
          onDataAvailable(event.data);
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        if (onError) onError(event.error);
      };

      // Start recording with 1-second intervals
      this.mediaRecorder.start(1000);
      this.isRecording = true;

    } catch (error) {
      console.error('Failed to start audio recording:', error);
      if (onError) onError(error);
      throw error;
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.isRecording = false;
    this.mediaRecorder = null;
  }

  getState() {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }
}