// Ficheiro: src/components/tasks/TaskCard.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, Clock, FileText } from "lucide-react";
import type { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void; 
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  // O clique no cartão agora sempre abre o modal de edição/detalhes.
  // A lógica de exibir o feedback está dentro do próprio modal.
  const handleCardClick = () => {
    onEdit(task);
  };

  return (
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
  );
}
