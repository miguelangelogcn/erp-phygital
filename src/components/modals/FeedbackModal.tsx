// src/components/modals/FeedbackModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, Pause, Play, Trash2 } from "lucide-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { FileUpload } from '@/components/forms/FileUpload';
import type { ApprovalTask } from "@/types/task";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/config";
import { useToast } from '@/hooks/use-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  task: ApprovalTask | null;
}

export function FeedbackModal({ isOpen, onClose, onSubmitSuccess, isSubmitting, setIsSubmitting, task }: FeedbackModalProps) {
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const {
    recordingStatus,
    audioUrl,
    audioBlob,
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();
  
  const functions = getFunctions(auth.app, "southamerica-east1");
  const reviewTaskCallable = httpsCallable(functions, "reviewTask");
  const { toast } = useToast();

  // Limpa o estado quando o modal é fechado ou a tarefa muda
  useEffect(() => {
    if (!isOpen) {
      setNotes("");
      setAttachments([]);
      resetRecording();
    }
  }, [isOpen, resetRecording]);

  const handleSubmit = async () => {
    if (!task) return;
    setIsSubmitting(true);

    try {
        let uploadedAudioUrl: string | undefined = undefined;
        if (audioBlob) {
            const storage = getStorage();
            const audioFileName = `feedback_audio_${uuidv4()}.webm`;
            const storageRef = ref(storage, `task_feedback/${task.id}/${audioFileName}`);
            const snapshot = await uploadBytes(storageRef, audioBlob);
            uploadedAudioUrl = await getDownloadURL(snapshot.ref);
        }

        const uploadedAttachments = await Promise.all(
            attachments.map(async (file) => {
                const storage = getStorage();
                const attachmentFileName = `feedback_attachments/${task.id}/${uuidv4()}-${file.name}`;
                const storageRef = ref(storage, attachmentFileName);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                return { name: file.name, url };
            })
        );
      
        const feedbackPayload = {
            notes,
            audioUrl: uploadedAudioUrl,
            files: uploadedAttachments,
        };

        await reviewTaskCallable({
            taskId: task.id,
            taskType: task.type,
            decision: 'rejected',
            feedback: feedbackPayload,
        });

        toast({ title: "Feedback Enviado", description: "A tarefa foi marcada como rejeitada." });
        onSubmitSuccess(); // This will close the modal and refetch data from the parent
        
    } catch (error: any) {
      console.error("Erro ao submeter o feedback:", error);
      toast({ variant: "destructive", title: "Erro ao Enviar", description: error.message || "Não foi possível enviar o feedback." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fornecer Feedback de Rejeição</DialogTitle>
           <DialogDescription>
            A tarefa "{task?.title}" será marcada como rejeitada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
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
             <FileUpload onFilesChange={setAttachments} />
          </div>

          <div>
            <Label>Gravar Áudio</Label>
            <div className="flex items-center gap-2 mt-2">
              {recordingStatus === 'inactive' || recordingStatus === 'stopped' ? (
                <Button onClick={startRecording} disabled={isSubmitting}>
                  <Mic className="mr-2 h-4 w-4" /> Gravar
                </Button>
              ) : null}

              {isRecording && (
                 <Button onClick={pauseRecording} variant="outline">
                  <Pause className="mr-2 h-4 w-4" /> Pausar
                </Button>
              )}

              {isPaused && (
                 <Button onClick={resumeRecording} variant="outline">
                  <Play className="mr-2 h-4 w-4" /> Retomar
                </Button>
              )}

              {isRecording || isPaused ? (
                <Button onClick={stopRecording} variant="destructive">
                  <StopCircle className="mr-2 h-4 w-4" /> Parar
                </Button>
              ) : null}

              {(isRecording || isPaused) && (
                <div className="text-sm font-mono text-muted-foreground">{formatTime(recordingTime)}</div>
              )}

            </div>
            {audioUrl && recordingStatus === 'stopped' && (
              <div className="mt-4 flex items-center gap-2">
                <audio controls src={audioUrl} className="w-full h-10" />
                <Button variant="ghost" size="icon" onClick={resetRecording} disabled={isSubmitting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (!notes && !audioBlob && attachments.length === 0)}>
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
