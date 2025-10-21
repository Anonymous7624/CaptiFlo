// API helper for building URLs and handling SSE lifecycles
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.eventSources = new Map();
  }

  // Build URL with query parameters
  buildUrl(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin + this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  // Send audio blob to ingest endpoint
  async sendAudioBlob(blob, sessionId, language, vadLevel) {
    const url = this.buildUrl('/ingest', {
      session: sessionId,
      lang: language,
      vad: vadLevel
    });

    const response = await fetch(url, {
      method: 'POST',
      body: blob,
      headers: {
        'Content-Type': 'audio/webm;codecs=opus'
      }
    });

    // Return response without throwing - let caller handle errors
    return response;
  }

  // Send raw PCM audio to ingest-raw endpoint
  async sendRawPcm(blob, sessionId, language, vadLevel) {
    const url = this.buildUrl('/ingest-raw', {
      session: sessionId,
      lang: language,
      vad: vadLevel
    });

    const response = await fetch(url, {
      method: 'POST',
      body: blob,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    // Return response without throwing - let caller handle errors
    return response;
  }

  // Send audio batch for transcription
  async sendBatchTranscribe(blob, sessionId, interval, mode) {
    const url = this.buildUrl('/batch_transcribe', {
      session: sessionId,
      interval: interval,
      mode: mode
    });

    const response = await fetch(url, {
      method: 'POST',
      body: blob,
      headers: {
        'Content-Type': 'audio/webm;codecs=opus'
      }
    });

    // Return response without throwing - let caller handle errors
    return response;
  }

  // Create SSE connection with robust auto-reconnect
  createEventSource(endpoint, params = {}, onMessage, onError) {
    const url = this.buildUrl(endpoint, params);
    const eventSource = new EventSource(url);
    
    // Initialize retry count for this specific endpoint
    if (!this.retryCounts) this.retryCounts = new Map();
    if (!this.retryCounts.has(endpoint)) this.retryCounts.set(endpoint, 0);
    
    eventSource.onmessage = (event) => {
      try {
        // Parse JSON from event.data
        const data = JSON.parse(event.data);
        
        // Only display payload.text, ignore other fields
        if (data.text) {
          const trimmedText = data.text.trim();
          if (trimmedText) {
            onMessage({ text: trimmedText });
          }
        } else if (data.note) {
          const trimmedNote = data.note.trim();
          if (trimmedNote) {
            onMessage({ note: trimmedNote });
          }
        }
      } catch (e) {
        // Ignore lines that fail to parse (like keepalive comments)
        console.debug('Ignoring non-JSON SSE message:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      if (onError) onError(error);
      
      // Auto-reconnect with exponential backoff (2s -> 5s -> 10s)
      if (eventSource.readyState === EventSource.CLOSED) {
        const retryCount = this.retryCounts.get(endpoint) || 0;
        let retryDelay = 2000; // Start with 2s
        
        if (retryCount >= 1) retryDelay = 5000; // 5s after first retry
        if (retryCount >= 3) retryDelay = 10000; // 10s after third retry
        
        this.retryCounts.set(endpoint, retryCount + 1);
        
        setTimeout(() => {
          if (this.eventSources.has(endpoint)) {
            console.log(`Attempting to reconnect SSE ${endpoint} (attempt ${retryCount + 1})...`);
            this.createEventSource(endpoint, params, onMessage, onError);
          }
        }, retryDelay);
      }
    };

    eventSource.onopen = () => {
      console.log(`SSE connection opened for ${endpoint}`);
      this.retryCounts.set(endpoint, 0); // Reset retry count on successful connection
    };

    // Store reference for cleanup
    this.eventSources.set(endpoint, eventSource);
    return eventSource;
  }

  // Start captions stream
  startCaptionsStream(sessionId, onMessage, onError) {
    return this.createEventSource('/captions', { session: sessionId }, onMessage, onError);
  }

  // Start notes stream
  startNotesStream(sessionId, mode, onMessage, onError) {
    return this.createEventSource('/notes', { session: sessionId, mode }, onMessage, onError);
  }

  // Close all event sources
  closeAllStreams() {
    this.eventSources.forEach((eventSource, endpoint) => {
      eventSource.close();
    });
    this.eventSources.clear();
  }

  // Close specific stream
  closeStream(endpoint) {
    const eventSource = this.eventSources.get(endpoint);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(endpoint);
    }
  }

  // End session explicitly
  async endSession(sessionId) {
    try {
      const url = this.buildUrl('/end', { session: sessionId });
      const response = await fetch(url, { method: 'POST' });
      // Don't throw on error - session might already be expired
      return response.ok;
    } catch (error) {
      console.warn('Failed to end session:', error);
      return false;
    }
  }
}

// Language mapping for class names
export const LANGUAGE_MAP = {
  'Biology': 'en',
  'Mandarin': 'zh',
  'Spanish': 'es',
  'English': 'en',
  'Global History': 'en'
};

// Generate UUID for session
export function generateSessionId() {
  return crypto.randomUUID();
}

// Reserve session or get queue status
export async function reserveSession(sessionId) {
  const url = new URL('/session', window.location.origin);
  url.searchParams.append('session', sessionId);
  
  const response = await fetch(url.toString(), {
    method: 'POST'
  });
  
  return response.json();
}

// Get queue status
export async function getQueueStatus(sessionId) {
  const url = new URL('/queue', window.location.origin);
  url.searchParams.append('session', sessionId);
  
  const response = await fetch(url.toString());
  return response.json();
}