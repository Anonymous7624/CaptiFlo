// Audio recording helper with MediaRecorder
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