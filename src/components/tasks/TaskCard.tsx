// src/components/tasks/TaskCard.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";
import type { Task } from "@/types/task";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void; 
}

export function TaskCard({ task, onEdit }: TaskCardProps) {

  const handleCardClick = () => {
    // Sempre abre o modal de edição, que agora contém a lógica de feedback.
    onEdit(task);
  };
  
  const getApprovalBadge = (status?: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
        case 'pending':
            return <Badge variant="secondary" className="flex items-center gap-1 bg-orange-400/20 text-orange-400 border-orange-400/30"><Clock className="h-3 w-3" /> Pendente</Badge>;
        case 'rejected':
            return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Rejeitado</Badge>;
        default:
            return null;
    }
  }


  return (
    <Card onClick={handleCardClick} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium pr-2">{task.title}</CardTitle>
        {getApprovalBadge(task.approvalStatus)}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground truncate">{task.description || "Sem descrição"}</p>
      </CardContent>
    </Card>
  );
}