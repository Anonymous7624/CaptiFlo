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

  // Create SSE connection with auto-reconnect
  createEventSource(endpoint, params = {}, onMessage, onError) {
    const url = this.buildUrl(endpoint, params);
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
        onMessage({ error: 'Invalid message format' });
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      if (onError) onError(error);
      
      // Auto-reconnect with backoff (2s -> 5s)
      if (eventSource.readyState === EventSource.CLOSED) {
        const retryDelay = this.retryCount < 3 ? 2000 : 5000;
        this.retryCount = (this.retryCount || 0) + 1;
        
        setTimeout(() => {
          if (this.eventSources.has(endpoint)) {
            console.log(`Attempting to reconnect SSE (attempt ${this.retryCount})...`);
            this.createEventSource(endpoint, params, onMessage, onError);
          }
        }, retryDelay);
      }
    };

    eventSource.onopen = () => {
      this.retryCount = 0; // Reset retry count on successful connection
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