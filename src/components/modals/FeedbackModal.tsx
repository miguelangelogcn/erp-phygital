// src/components/modals/FeedbackModal.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, StopCircle, Trash2 } from "lucide-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import type { ApprovalTask } from "@/types/task";


interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: { notes: string; audioUrl?: string; attachments: any[] }) => void;
  isSubmitting: boolean;
  task: ApprovalTask;
}

export function FeedbackModal({ isOpen, onClose, onSubmit, isSubmitting, task }: FeedbackModalProps) {
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Limpa o estado quando o modal é fechado ou a tarefa muda
  useEffect(() => {
    if (!isOpen) {
      setNotes("");
      setAttachments([]);
      setAudioBlob(null);
      setAudioUrl(null);
      setIsRecording(false);
    }
  }, [isOpen]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao aceder ao microfone:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleDeleteAudio = () => {
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleSubmit = async () => {
    let finalAudioUrl: string | undefined = undefined;

    try {
      if (audioBlob) {
        const storage = getStorage();
        const audioFileName = `feedback_audio_${uuidv4()}.webm`;
        const storageRef = ref(storage, `task_feedback/${task.id}/${audioFileName}`);
        const snapshot = await uploadBytes(storageRef, audioBlob);
        finalAudioUrl = await getDownloadURL(snapshot.ref);
      }
      
      onSubmit({
        notes: notes,
        audioUrl: finalAudioUrl,
        attachments: [], // Anexos de ficheiro a serem implementados
      });

    } catch (error) {
      console.error("Erro ao submeter o feedback:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fornecer Feedback de Rejeição</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
            />
          </div>
          
          <div>
             <Label>Anexos</Label>
             <p className="text-sm text-muted-foreground">Funcionalidade de anexo de ficheiros a ser implementada.</p>
          </div>

          <div>
            <Label>Gravar Áudio</Label>
            <div className="flex items-center gap-2 mt-2">
              {!isRecording ? (
                <Button onClick={handleStartRecording} disabled={!!audioBlob || isSubmitting}>
                  <Mic className="mr-2 h-4 w-4" /> Gravar
                </Button>
              ) : (
                <Button onClick={handleStopRecording} variant="destructive">
                  <StopCircle className="mr-2 h-4 w-4 animate-pulse" /> Parar
                </Button>
              )}
            </div>
            {audioUrl && (
              <div className="mt-4 flex items-center gap-2">
                <audio controls src={audioUrl} className="w-full h-10" />
                <Button variant="ghost" size="icon" onClick={handleDeleteAudio} disabled={isSubmitting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A enviar...
              </>
            ) : "Enviar Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
