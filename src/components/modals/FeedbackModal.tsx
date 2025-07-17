// src/components/modals/FeedbackModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, File as FileIcon, X, Mic, Square, Pause, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { auth } from "@/lib/firebase/config";
import type { ApprovalTask, TaskProof } from "@/types/task";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ApprovalTask;
  onSubmitted: () => void;
}

type ProofFile = {
  file: File;
  name: string;
};

export function FeedbackModal({ isOpen, onClose, task, onSubmitted }: FeedbackModalProps) {
  const [files, setFiles] = useState<ProofFile[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    recordingStatus,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    recordingTime
  } = useAudioRecorder();
  
  const functions = getFunctions(auth.app, "southamerica-east1");
  const reviewTaskCallable = httpsCallable(functions, "reviewTask");

  useEffect(() => {
    // Reset state when modal opens for a new task
    if (isOpen) {
        setFiles([]);
        setNotes("");
        resetRecording();
    }
  }, [isOpen, resetRecording]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({ file, name: file.name }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
      const storage = getStorage();
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
  }

  const handleSendFeedback = async () => {
    if (!notes) {
      toast({ variant: "destructive", title: "Observações necessárias", description: "Por favor, escreva o motivo da rejeição." });
      return;
    }
    setIsSubmitting(true);

    try {
        let uploadedFiles: TaskProof[] | undefined = undefined;
        let uploadedAudioUrl: string | undefined = undefined;

        if(files.length > 0) {
            uploadedFiles = await Promise.all(
                files.map(async ({ file, name }) => {
                    const url = await uploadFile(file, `task_feedback/${task.id}/${name}`);
                    return { url, name };
                })
            );
        }

        if(audioBlob) {
            const audioName = `feedback_${Date.now()}.webm`;
            uploadedAudioUrl = await uploadFile(audioBlob, `task_feedback/${task.id}/${audioName}`);
        }
        
        const feedbackPayload = {
            notes,
            files: uploadedFiles,
            audioUrl: uploadedAudioUrl
        };

        await reviewTaskCallable({
            taskId: task.id,
            taskType: task.type,
            decision: 'rejected',
            feedback: feedbackPayload,
        });

      toast({ title: "Feedback Enviado", description: "A tarefa foi marcada como rejeitada." });
      onSubmitted(); 
    } catch (error: any) {
      console.error("Error sending feedback:", error);
      toast({ variant: "destructive", title: "Erro ao Enviar", description: error.message || "Não foi possível enviar o feedback." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fornecer Feedback de Rejeição</DialogTitle>
          <DialogDescription>
            Explique por que a tarefa "{task.title}" está a ser rejeitada.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (Obrigatório)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Faltou o relatório X. Por favor, anexe e submeta novamente."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Anexar Ficheiros (Opcional)</Label>
            <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Clique para carregar</p>
              <Input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            </div>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <ul className="divide-y divide-border rounded-md border">
                  {files.map((f, index) => (
                    <li key={index} className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2 truncate">
                            <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{f.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}><X className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Gravar Áudio (Opcional)</Label>
            <div className="p-4 border rounded-lg flex flex-col items-center gap-4">
              {audioUrl ? (
                <div className="w-full flex flex-col items-center gap-2">
                    <audio src={audioUrl} controls className="w-full" />
                    <Button variant="destructive" size="sm" onClick={resetRecording}><Trash2 className="mr-2 h-4 w-4"/>Apagar gravação</Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {recordingStatus === 'inactive' && (
                    <Button onClick={startRecording} size="icon" className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700">
                      <Mic className="h-6 w-6" />
                    </Button>
                  )}
                  {recordingStatus === 'recording' && (
                    <>
                    <Button onClick={pauseRecording} size="icon" variant="secondary" className="rounded-full w-14 h-14">
                      <Pause className="h-6 w-6" />
                    </Button>
                     <Button onClick={stopRecording} size="icon" className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700">
                      <Square className="h-6 w-6" />
                    </Button>
                    </>
                  )}
                   {recordingStatus === 'paused' && (
                     <>
                        <Button onClick={resumeRecording} size="icon" className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700">
                            <Play className="h-6 w-6" />
                        </Button>
                        <Button onClick={stopRecording} size="icon" variant="secondary" className="rounded-full w-14 h-14">
                            <Square className="h-6 w-6" />
                        </Button>
                     </>
                  )}
                   <span className="text-lg font-mono w-20 text-center">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSendFeedback} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
