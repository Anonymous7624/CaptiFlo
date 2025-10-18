// AudioWorklet processor for PCM audio processing
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.sampleRate = 48000; // Default input sample rate
    this.targetSampleRate = 16000;
    this.resampleRatio = this.sampleRate / this.targetSampleRate;
    this.lastSample = 0;
    this.chunkSize = this.targetSampleRate; // 1 second at 16kHz
    
    // Listen for sample rate updates from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'setSampleRate') {
        this.sampleRate = event.data.sampleRate;
        this.resampleRatio = this.sampleRate / this.targetSampleRate;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const inputChannel = input[0]; // Use first channel (mono)
      
      // Resample and convert to mono
      const resampled = this.resample(inputChannel);
      
      // Add to buffer
      this.buffer.push(...resampled);
      
      // Send chunks when we have enough data (1 second worth)
      while (this.buffer.length >= this.chunkSize) {
        const chunk = this.buffer.splice(0, this.chunkSize);
        const pcmBytes = this.float32ToInt16LE(chunk);
        
        this.port.postMessage({
          type: 'audioChunk',
          data: pcmBytes
        });
      }
    }
    
    return true; // Keep processor alive
  }

  // Simple linear interpolation resampling
  resample(inputSamples) {
    if (this.resampleRatio === 1) {
      return Array.from(inputSamples);
    }
    
    const outputLength = Math.floor(inputSamples.length / this.resampleRatio);
    const output = new Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * this.resampleRatio;
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
}

registerProcessor('pcm-processor', PcmProcessor);