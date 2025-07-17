// src/hooks/useAudioRecorder.ts
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

export type RecordingStatus = 'inactive' | 'recording' | 'paused' | 'stopped';

export interface AudioRecorderState {
  recordingStatus: RecordingStatus;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number; // in seconds
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

export const useAudioRecorder = (): AudioRecorderState => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('inactive');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };
  
  const resetTimer = () => {
    stopTimer();
    setRecordingTime(0);
  };

  const setupMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setRecordingStatus('recording');
        startTimer();
      };
      
      mediaRecorder.onpause = () => {
        setRecordingStatus('paused');
        stopTimer();
      };

      mediaRecorder.onresume = () => {
         setRecordingStatus('recording');
         startTimer();
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingStatus('stopped');
        resetTimer();
        audioChunksRef.current = [];
        // Stop all tracks on the stream
        stream.getTracks().forEach(track => track.stop());
      };
      return mediaRecorder;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      // Handle permission denied or other errors
      alert('Acesso ao microfone negado. Por favor, permita o acesso nas configurações do seu navegador.');
      return null;
    }
  };

  const resetRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingStatus('inactive');
    audioChunksRef.current = [];
    resetTimer();
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    resetRecording();
    const mediaRecorder = await setupMediaRecorder();
    if(mediaRecorder) {
        mediaRecorder.start();
    }
  }, [resetRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (recordingStatus === 'recording' || recordingStatus === 'paused')) {
      mediaRecorderRef.current.stop();
    }
  }, [recordingStatus]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
      mediaRecorderRef.current.pause();
    }
  }, [recordingStatus]);
  
  const resumeRecording = useCallback(() => {
      if(mediaRecorderRef.current && recordingStatus === 'paused') {
          mediaRecorderRef.current.resume();
      }
  }, [recordingStatus]);

  return {
    recordingStatus,
    audioBlob,
    audioUrl,
    isRecording: recordingStatus === 'recording',
    isPaused: recordingStatus === 'paused',
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
};
