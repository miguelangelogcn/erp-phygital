// Ficheiro: src/components/tasks/TaskCard.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { XCircle, Clock, FileText } from "lucide-react";
import type { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void; 
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Log para depuração.
  // console.log("Dados recebidos pelo TaskCard:", task);

  const handleCardClick = () => {
    if (task.approvalStatus === 'rejected') {
      setIsFeedbackModalOpen(true);
    } else {
      // Chame a função de edição normal
      onEdit(task);
    }
  };

  return (
    <>
      <Card onClick={handleCardClick} className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium pr-2">{task.title}</CardTitle>
          {task.approvalStatus === 'rejected' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Rejeitado
            </Badge>
          )}
          {task.approvalStatus === 'pending' && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-orange-400/20 text-orange-400 border-orange-400/30">
              <Clock className="h-3 w-3" /> Pendente
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground truncate">{task.description || "Sem descrição"}</p>
        </CardContent>
      </Card>

      {/* Modal para exibir o feedback de rejeição */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback da Tarefa: {task.title}</DialogTitle>
            <DialogDescription>
              A sua tarefa foi rejeitada. Por favor, reveja as observações abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            {task.feedback?.notes && (
              <div>
                <h4 className="font-semibold mb-2">Observações:</h4>
                <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-md">
                  {task.feedback.notes}
                </p>
              </div>
            )}
            
            {task.feedback?.audioUrl && (
              <div>
                <h4 className="font-semibold mb-2">Feedback em Áudio:</h4>
                <audio controls src={task.feedback.audioUrl} className="w-full">
                  O seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            )}

            {task.feedback?.files && task.feedback.files.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Anexos:</h4>
                <ul className="space-y-2">
                  {task.feedback.files.map((file, index) => (
                    <li key={index}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}