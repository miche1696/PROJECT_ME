import React, { useState, useRef, useEffect } from 'react';
import { transcriptionApi } from '../../api/transcription';
import './VoiceRecorder.css';

// Recording states
const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing'
};

const VoiceRecorder = ({
  onTranscriptionComplete,
  onTranscriptionStart,
  onTranscriptionEnd,
  onRecordingStart,
  onError,
  disabled
}) => {
  // State
  const [recordingState, setRecordingState] = useState(RecordingState.IDLE);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0]);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const placeholderRef = useRef(null);

  // Check browser compatibility on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = !!window.MediaRecorder;
      setIsSupported(hasGetUserMedia && hasMediaRecorder);
    };
    checkSupport();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start timer
  const startTimer = () => {
    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingTime(elapsed);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Audio visualization
  const startAudioVisualization = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate levels for 5 bars
        const barCount = 5;
        const barWidth = Math.floor(dataArray.length / barCount);
        const levels = [];

        for (let i = 0; i < barCount; i++) {
          const start = i * barWidth;
          const end = start + barWidth;
          const slice = dataArray.slice(start, end);
          const average = slice.reduce((a, b) => a + b, 0) / slice.length;
          const normalized = Math.min(average / 128, 1); // 0 to 1
          levels.push(normalized);
        }

        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio visualization:', err);
    }
  };

  // Stop audio visualization
  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels([0, 0, 0, 0, 0]);
  };

  // Cleanup resources
  const cleanup = () => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop timer
    stopTimer();

    // Stop audio visualization
    stopAudioVisualization();

    // Clear audio chunks
    audioChunksRef.current = [];

    // Reset media recorder
    mediaRecorderRef.current = null;
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;

      // Determine supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleTranscription(blob, mimeType);
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        const errorMessage = 'Recording failed. Please try again.';
        setError(errorMessage);
        if (onError) onError(errorMessage);

        // Replace placeholder with error message
        if (placeholderRef.current && onTranscriptionComplete) {
          onTranscriptionComplete('[Recording failed]', placeholderRef.current);
        }

        placeholderRef.current = null;
        cleanup();
        setRecordingState(RecordingState.IDLE);
      };

      // Start recording
      mediaRecorder.start();
      setRecordingState(RecordingState.RECORDING);

      // Insert placeholder at cursor position
      const placeholder = '[Listening..]';
      placeholderRef.current = placeholder;
      if (onRecordingStart) {
        onRecordingStart(placeholder);
      }

      // Start timer
      startTimer();

      // Start audio visualization
      startAudioVisualization(stream);

    } catch (err) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Failed to start recording.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access denied. Please enable in browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      }

      setError(errorMessage);
      if (onError) onError(errorMessage);

      // If placeholder was inserted, remove it
      if (placeholderRef.current && onTranscriptionComplete) {
        onTranscriptionComplete('', placeholderRef.current);
      }

      placeholderRef.current = null;
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      stopTimer();
      stopAudioVisualization();

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Handle transcription
  const handleTranscription = async (blob, mimeType) => {
    setRecordingState(RecordingState.TRANSCRIBING);

    if (onTranscriptionStart) {
      onTranscriptionStart();
    }

    try {
      // Convert blob to file with appropriate extension
      const extension = mimeType.includes('webm') ? 'webm' : 'ogg';
      const audioFile = new File([blob], `recording.${extension}`, { type: mimeType });

      // Transcribe audio
      const result = await transcriptionApi.transcribeAudio(audioFile);

      // Replace placeholder with transcribed text
      if (onTranscriptionComplete && result.text) {
        onTranscriptionComplete(result.text, placeholderRef.current);
      }

      // Reset state
      setRecordingState(RecordingState.IDLE);
      setRecordingTime(0);
      setError(null);
      placeholderRef.current = null;

    } catch (err) {
      console.error('Transcription error:', err);
      const errorMessage = `Transcription failed: ${err.message}`;
      setError(errorMessage);

      // Replace placeholder with error message
      if (onTranscriptionComplete && placeholderRef.current) {
        onTranscriptionComplete('[Error transcribing audio]', placeholderRef.current);
      }

      if (onError) onError(errorMessage);
      setRecordingState(RecordingState.IDLE);
      setRecordingTime(0);
      placeholderRef.current = null;
    } finally {
      if (onTranscriptionEnd) {
        onTranscriptionEnd();
      }
      cleanup();
    }
  };

  // Handle button click
  const handleClick = () => {
    if (disabled) return;

    if (recordingState === RecordingState.IDLE) {
      startRecording();
    } else if (recordingState === RecordingState.RECORDING) {
      stopRecording();
    }
  };

  // Dismiss error
  const handleDismissError = () => {
    setError(null);
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  // Render idle state - floating button
  if (recordingState === RecordingState.IDLE) {
    return (
      <button
        className={`voice-recorder-button ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label="Start voice recording"
        title="Record voice note"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    );
  }

  // Render recording or transcribing state - expanded panel
  return (
    <div className="voice-recorder-panel">
      {error && (
        <div className="recording-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button onClick={handleDismissError} className="error-dismiss">×</button>
        </div>
      )}

      <div className="recording-timer">{formatTime(recordingTime)}</div>

      {recordingState === RecordingState.RECORDING && (
        <>
          <div className="audio-bars">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="audio-bar"
                style={{
                  height: `${Math.max(8, level * 32)}px`
                }}
              />
            ))}
          </div>

          <button
            className="stop-button"
            onClick={stopRecording}
            aria-label="Stop recording"
            title="Stop recording"
          />
        </>
      )}

      {recordingState === RecordingState.TRANSCRIBING && (
        <div className="transcribing-indicator">
          <div className="spinner" />
          <span className="transcribing-text">Transcribing...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
