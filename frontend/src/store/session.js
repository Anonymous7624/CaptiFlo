import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ApiClient, LANGUAGE_MAP, generateSessionId, reserveSession, getQueueStatus } from '../lib/api';
import { WebmRecorder, RawPcmRecorder } from '../lib/audio';

// Create the session store with unified state management
export const useSessionStore = create(
  subscribeWithSelector((set, get) => ({
    // Session state
    sessionId: sessionStorage.getItem('sessionId') || null,
    classMode: localStorage.getItem('selectedClass') || 'Biology',
    grade: parseInt(localStorage.getItem('grade')) || 9,
    interval: parseInt(localStorage.getItem('batchInterval')) || 30,
    isRecording: false,

    // Audio/Recording state
    mediaRecorder: null,
    audioStream: null,
    batchTimer: null,
    currentBatch: null,

    // Data
    batches: [], // Array of {timestamp, text, notes}

    // Connection status
    connectionStatus: {
      batch: false
    },

    // Queue status
    queueStatus: null, // null | {status: "active"} | {status: "queued", position: N, size: Q}
    queuePolling: false,

    // API client
    apiClient: new ApiClient(),

    // Actions
    setClassMode: (classMode) => {
      set({ classMode });
      localStorage.setItem('selectedClass', classMode);
    },

    setGrade: (grade) => {
      set({ grade });
      localStorage.setItem('grade', grade.toString());
    },

    setInterval: (interval) => {
      set({ interval });
      localStorage.setItem('batchInterval', interval.toString());
    },

    addBatch: (batch) => {
      set((state) => ({
        batches: [...state.batches, batch]
      }));
    },

    clearBatches: () => set({ batches: [] }),

    setConnectionStatus: (updates) => {
      set((state) => ({
        connectionStatus: { ...state.connectionStatus, ...updates }
      }));
    },

    // Initialize session
    initializeSession: () => {
      const state = get();
      if (!state.sessionId) {
        const newSessionId = generateSessionId();
        set({ sessionId: newSessionId });
        sessionStorage.setItem('sessionId', newSessionId);
        return newSessionId;
      }
      return state.sessionId;
    },

    // Start recording with session reservation flow
    startRecording: async () => {
      const state = get();
      
      try {
        // Initialize session
        const sessionId = state.initializeSession();
        
        // Reserve session first
        const reservationResult = await reserveSession(sessionId);
        
        if (reservationResult.status === "queued") {
          // Show queue UI and start polling
          set({ 
            queueStatus: reservationResult,
            queuePolling: true 
          });
          state.startQueuePolling(sessionId);
          return false; // Don't start recording yet
        }
        
        if (reservationResult.status !== "active") {
          throw new Error("Failed to reserve session");
        }
        
        // Session is active, proceed with recording
        return await state.startRecordingWithActiveSession(sessionId);
        
      } catch (error) {
        console.error('Failed to start recording:', error);
        state.stopRecording();
        throw error;
      }
    },

    // Start recording with active session (internal method)
    startRecordingWithActiveSession: async (sessionId) => {
      const state = get();
      
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        });

        set({ audioStream: stream });

        // Create WebM recorder for batch recording
        const recorder = new WebmRecorder();
        set({ mediaRecorder: recorder });

        // Start batch recording
        state.startBatchRecording(stream, sessionId);

        set({ 
          isRecording: true,
          batches: [],
          queueStatus: { status: "active" },
          connectionStatus: { batch: true }
        });

        return true;
      } catch (error) {
        console.error('Failed to start recording with active session:', error);
        state.stopRecording();
        throw error;
      }
    },

    // Start queue polling
    startQueuePolling: async (sessionId) => {
      const state = get();
      
      const poll = async () => {
        if (!state.queuePolling) return;
        
        try {
          const status = await getQueueStatus(sessionId);
          
          if (status.status === "active") {
            // Session became active, start recording
            set({ queuePolling: false });
            await state.startRecordingWithActiveSession(sessionId);
          } else if (status.status === "queued") {
            // Update queue position
            set({ queueStatus: status });
            // Poll again in 2 seconds
            setTimeout(poll, 2000);
          } else {
            // Session not found, stop polling
            set({ 
              queuePolling: false,
              queueStatus: null 
            });
          }
        } catch (error) {
          console.error('Queue polling error:', error);
          // Continue polling on error
          setTimeout(poll, 2000);
        }
      };
      
      // Start polling
      setTimeout(poll, 2000);
    },

    // Stop queue polling
    stopQueuePolling: () => {
      set({ 
        queuePolling: false,
        queueStatus: null 
      });
    },

    // Start batch recording
    startBatchRecording: (stream, sessionId) => {
      const state = get();
      
      const recordBatch = async () => {
        if (!state.isRecording) return;
        
        try {
          // Start recording a batch
          const recorder = state.mediaRecorder;
          const chunks = [];
          
          // Create a new MediaRecorder for this batch
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            if (chunks.length > 0) {
              const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
              await state.processBatch(audioBlob, sessionId);
            }
          };
          
          // Record for the specified interval
          mediaRecorder.start();
          
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, state.interval * 1000);
          
        } catch (error) {
          console.error('Batch recording error:', error);
          set({ connectionStatus: { batch: false } });
        }
      };
      
      // Start first batch immediately
      recordBatch();
      
      // Set up timer for subsequent batches
      const timer = setInterval(recordBatch, state.interval * 1000);
      set({ batchTimer: timer });
    },

    // Process a completed batch
    processBatch: async (audioBlob, sessionId) => {
      const state = get();
      
      try {
        const response = await state.apiClient.sendBatchTranscribe(
          audioBlob,
          sessionId,
          state.interval,
          state.classMode
        );
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.ok) {
            const batch = {
              timestamp: new Date().toLocaleTimeString(),
              text: result.text || '',
              notes: result.notes || []
            };
            
            state.addBatch(batch);
            set({ connectionStatus: { batch: true } });
          }
        } else {
          console.error('Batch transcription failed:', response.status);
          set({ connectionStatus: { batch: false } });
        }
      } catch (error) {
        console.error('Failed to process batch:', error);
        set({ connectionStatus: { batch: false } });
      }
    },


    // Stop recording (idempotent)
    stopRecording: async () => {
      const state = get();
      
      // Stop queue polling first
      state.stopQueuePolling();
      
      // Stop batch timer
      if (state.batchTimer) {
        clearInterval(state.batchTimer);
      }

      // Stop all audio stream tracks
      if (state.audioStream) {
        try {
          state.audioStream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Error stopping audio track:', e);
            }
          });
        } catch (e) {
          console.warn('Error stopping audio stream:', e);
        }
      }

      // End session on backend (call POST /end to free capacity)
      if (state.sessionId) {
        try {
          await state.apiClient.endSession(state.sessionId);
        } catch (e) {
          console.warn('Error ending session:', e);
        }
      }

      // Clear state
      set({
        isRecording: false,
        mediaRecorder: null,
        audioStream: null,
        batchTimer: null,
        sessionId: null,
        queueStatus: null,
        queuePolling: false,
        connectionStatus: { batch: false }
      });

      sessionStorage.removeItem('sessionId');
    },

    // Restore session from sessionStorage (for page navigation)
    restoreSession: () => {
      const sessionId = sessionStorage.getItem('sessionId');
      if (sessionId) {
        set({ sessionId });
        return sessionId;
      }
      return null;
    }
  }))
);

// Subscribe to session changes to persist sessionId
useSessionStore.subscribe(
  (state) => state.sessionId,
  (sessionId) => {
    if (sessionId) {
      sessionStorage.setItem('sessionId', sessionId);
    } else {
      sessionStorage.removeItem('sessionId');
    }
  }
);