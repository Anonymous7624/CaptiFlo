import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ApiClient, LANGUAGE_MAP, generateSessionId } from '../lib/api';
import { WebmRecorder, RawPcmRecorder } from '../lib/audio';

// Create the session store with unified state management
export const useSessionStore = create(
  subscribeWithSelector((set, get) => ({
    // Session state
    sessionId: sessionStorage.getItem('sessionId') || null,
    classMode: localStorage.getItem('selectedClass') || 'Biology',
    grade: parseInt(localStorage.getItem('grade')) || 9,
    vad: parseInt(localStorage.getItem('micSensitivity')) || 2,
    isRecording: false,
    showEnglishCaptions: localStorage.getItem('showEnglishCaptions') === 'true',

    // Audio/Recording state
    mediaRecorder: null,
    audioStream: null,
    currentRecorderType: 'webm',
    ffmpegMissingDetected: false,

    // SSE connections
    captionsSource: null,
    notesSource: null,

    // Data
    captions: [],
    notes: [],

    // Connection status
    connectionStatus: {
      captions: false,
      notes: false,
      reconnecting: false
    },

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

    setVad: (vad) => {
      set({ vad });
      localStorage.setItem('micSensitivity', vad.toString());
    },

    setShowEnglishCaptions: (show) => {
      set({ showEnglishCaptions: show });
      localStorage.setItem('showEnglishCaptions', show.toString());
    },

    addCaption: (caption) => {
      set((state) => ({
        captions: [...state.captions, caption]
      }));
    },

    addNote: (note) => {
      set((state) => ({
        notes: [...state.notes, note]
      }));
    },

    clearCaptions: () => set({ captions: [] }),
    clearNotes: () => set({ notes: [] }),

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

    // Start recording with improved speed and parallel processing
    startRecording: async () => {
      const state = get();
      
      try {
        // Initialize session
        const sessionId = state.initializeSession();
        
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

        // Create recorder with 300ms timeslice
        const useRawPcm = state.ffmpegMissingDetected;
        const recorder = useRawPcm ? new RawPcmRecorder() : new WebmRecorder();
        
        set({ 
          mediaRecorder: recorder,
          currentRecorderType: useRawPcm ? 'raw' : 'webm'
        });

        // Start recording with faster timeslice and parallel processing
        await recorder.start(stream, {
          lang: LANGUAGE_MAP[state.classMode],
          vad: state.vad,
          session: sessionId,
          timeslice: 300, // 300ms for faster response
          onDataAvailable: async (audioBlob, params) => {
            await state.handleAudioData(audioBlob, params, stream);
          },
          onError: (error) => {
            console.error('Audio recording error:', error);
            state.stopRecording();
          }
        });

        // Start SSE streams immediately
        state.startCaptionsStream(sessionId);
        state.startNotesStream(sessionId);

        set({ 
          isRecording: true,
          captions: [],
          connectionStatus: { captions: false, notes: false, reconnecting: false }
        });

        return true;
      } catch (error) {
        console.error('Failed to start recording:', error);
        state.stopRecording();
        throw error;
      }
    },

    // Handle audio data with parallel processing and queue management
    handleAudioData: async (audioBlob, params, stream) => {
      const state = get();
      
      // Implement queue to prevent flooding (max 3 inflight requests)
      if (!state.inflightRequests) {
        state.inflightRequests = new Set();
      }

      if (state.inflightRequests.size >= 3) {
        console.log('Dropping audio chunk - too many inflight requests');
        return;
      }

      const requestId = Date.now() + Math.random();
      state.inflightRequests.add(requestId);

      try {
        let response;
        
        if (params.isRawPcm || state.currentRecorderType === 'raw') {
          response = await state.apiClient.sendRawPcm(
            audioBlob,
            params.session,
            params.lang,
            params.vad
          );
        } else {
          response = await state.apiClient.sendAudioBlob(
            audioBlob,
            params.session,
            params.lang,
            params.vad
          );
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle FFmpeg missing - switch to raw PCM automatically
          if (errorData.error === 'ffmpeg_missing' && state.currentRecorderType === 'webm') {
            console.log('FFmpeg missing detected, switching to Raw PCM fallback...');
            set({ ffmpegMissingDetected: true });
            
            // Stop current recorder and restart with raw PCM
            if (state.mediaRecorder) {
              state.mediaRecorder.stop();
            }
            
            const rawRecorder = new RawPcmRecorder();
            set({ 
              mediaRecorder: rawRecorder,
              currentRecorderType: 'raw'
            });
            
            await rawRecorder.start(stream, {
              lang: params.lang,
              vad: params.vad,
              session: params.session,
              timeslice: 300,
              onDataAvailable: async (rawBlob, rawParams) => {
                await state.handleAudioData(rawBlob, rawParams, stream);
              },
              onError: (error) => {
                console.error('Raw PCM recording error:', error);
                state.stopRecording();
              }
            });
            
            return;
          }
          
          if (errorData.error === 'capacity') {
            console.error('At capacity (5 sessions). Try later.');
            state.stopRecording();
          }
        }
      } catch (error) {
        console.error('Failed to send audio:', error);
      } finally {
        state.inflightRequests.delete(requestId);
      }
    },

    // Start captions stream with auto-reconnect
    startCaptionsStream: (sessionId) => {
      const state = get();
      
      if (state.captionsSource) {
        state.captionsSource.close();
      }

      set({ connectionStatus: { ...state.connectionStatus, reconnecting: true } });

      const eventSource = state.apiClient.createEventSource(
        '/captions',
        { session: sessionId },
        (data) => {
          if (data.text) {
            state.addCaption(data.text);
          }
          set({ 
            connectionStatus: { 
              ...get().connectionStatus, 
              captions: true, 
              reconnecting: false 
            }
          });
        },
        (error) => {
          console.error('Captions stream error:', error);
          set({ 
            connectionStatus: { 
              ...get().connectionStatus, 
              captions: false,
              reconnecting: true
            }
          });
        }
      );

      set({ captionsSource: eventSource });
    },

    // Start notes stream with grade support
    startNotesStream: (sessionId) => {
      const state = get();
      
      if (state.notesSource) {
        state.notesSource.close();
      }

      // Clear existing notes when starting new stream
      set({ notes: [] });

      const eventSource = state.apiClient.createEventSource(
        '/notes',
        { 
          session: sessionId, 
          mode: state.classMode,
          grade: state.grade
        },
        (data) => {
          if (data.note) {
            state.addNote(data.note);
          }
          set({ 
            connectionStatus: { 
              ...get().connectionStatus, 
              notes: true 
            }
          });
        },
        (error) => {
          console.error('Notes stream error:', error);
          set({ 
            connectionStatus: { 
              ...get().connectionStatus, 
              notes: false 
            }
          });
        }
      );

      set({ notesSource: eventSource });
    },

    // Stop recording (idempotent)
    stopRecording: async () => {
      const state = get();
      
      // Stop media recorder
      if (state.mediaRecorder) {
        try {
          state.mediaRecorder.stop();
        } catch (e) {
          console.warn('Error stopping media recorder:', e);
        }
      }

      // Stop all audio stream tracks
      if (state.audioStream) {
        state.audioStream.getTracks().forEach(track => track.stop());
      }

      // Close SSE connections
      if (state.captionsSource) {
        state.captionsSource.close();
      }
      if (state.notesSource) {
        state.notesSource.close();
      }

      // End session on backend
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
        captionsSource: null,
        notesSource: null,
        sessionId: null,
        connectionStatus: { captions: false, notes: false, reconnecting: false }
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