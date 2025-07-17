// src/components/modals/SubmitForApprovalModal.tsx
"use client";

import { useState, useRef } from "react";
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
import { Loader2, UploadCloud, File as FileIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase/config";
import type { Task } from "@/types/task";
import type { RecurringTask } from "@/types/recurringTask";

interface SubmitForApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | RecurringTask;
  taskType: 'tasks' | 'recurringTasks';
}

type ProofFile = {
  file: File;
  name: string;
};

export function SubmitForApprovalModal({
  isOpen,
  onClose,
  task,
  taskType,
}: SubmitForApprovalModalProps) {
  const [files, setFiles] = useState<ProofFile[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const functions = getFunctions(auth.app, "southamerica-east1");
  const submitTaskForApproval = httpsCallable(functions, "submitTaskForApproval");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({ file, name: file.name }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndSubmit = async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum ficheiro selecionado",
        description: "Por favor, adicione pelo menos um ficheiro de prova.",
      });
      return;
    }
    setIsSubmitting(true);
    const storage = getStorage();
    
    try {
      const uploadedProofs = await Promise.all(
        files.map(async ({ file, name }) => {
          const storageRef = ref(storage, `task_proofs/${task.id}/${name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          return { url, name };
        })
      );

      await submitTaskForApproval({
        taskId: task.id,
        taskType: taskType,
        proofs: uploadedProofs,
        notes: notes,
      });

      toast({
        title: "Submetido com Sucesso!",
        description: "A sua tarefa foi enviada para aprovação.",
      });
      onClose();
    } catch (error: any) {
      console.error("Error submitting for approval:", error);
      toast({
        variant: "destructive",
        title: "Erro na Submissão",
        description: error.message || "Não foi possível submeter a tarefa para aprovação.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submeter Tarefa para Aprovação</DialogTitle>
          <DialogDescription>
            Anexe os ficheiros de prova e adicione notas para a tarefa "{task.title}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Ficheiros de Prova</Label>
            <div
              className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Clique para carregar ou arraste e solte os ficheiros
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm">Ficheiros Selecionados:</h4>
                <ul className="divide-y divide-border rounded-md border">
                  {files.map((f, index) => (
                    <li key={index} className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{f.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione quaisquer notas relevantes para a aprovação..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleUploadAndSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submeter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
