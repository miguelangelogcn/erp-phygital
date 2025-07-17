// src/components/tasks/RecurringTasks.tsx
"use client";

import React, { useState, useEffect } from "react";
import { onRecurringTasksUpdate, updateRecurringTask, deleteRecurringTask, updateRecurringTaskChecklist, updateRecurringTaskCompletion } from "@/lib/firebase/services/recurringTasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getClients } from "@/lib/firebase/services/clients";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { CreateRecurringTaskModal } from "@/components/modals/CreateRecurringTaskModal";
import RecurringTaskForm from "@/components/forms/RecurringTaskForm";

import type { RecurringTask, RecurringChecklistItem } from "@/types/recurringTask";
import type { SelectOption } from "@/types/common";
import { cn } from "@/lib/utils";

interface DayColumn {
  id: number;
  title: string;
  tasks: RecurringTask[];
}

const initialDays: DayColumn[] = [
  { id: 1, title: 'Segunda-feira', tasks: [] },
  { id: 2, title: 'Terça-feira', tasks: [] },
  { id: 3, title: 'Quarta-feira', tasks: [] },
  { id: 4, title: 'Quinta-feira', tasks: [] },
  { id: 5, title: 'Sexta-feira', tasks: [] },
  { id: 6, title: 'Sábado', tasks: [] },
  { id: 7, title: 'Domingo', tasks: [] },
];

export default function RecurringTasks() {
  const [dayColumns, setDayColumns] = useState<DayColumn[]>(initialDays);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
            setUsers(usersData.map(u => ({ value: u.id, label: u.name })));
            setClients(clientsData.map(c => ({ value: c.id, label: c.name })));
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao carregar dados", description: "Não foi possível buscar usuários ou clientes." });
        }
    };
    fetchData();

    const unsubscribe = onRecurringTasksUpdate(
      (tasks) => {
        const newDayColumns: DayColumn[] = JSON.parse(JSON.stringify(initialDays));
        tasks.forEach((task) => {
          const targetColumn = newDayColumns.find(col => col.id === task.dayOfWeek);
          if (targetColumn) {
            targetColumn.tasks.push(task);
          }
        });
        setDayColumns(newDayColumns);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as tarefas recorrentes." });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const handleCardClick = (task: RecurringTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const handleSaveTask = async (data: Partial<RecurringTask>) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    try {
        await updateRecurringTask(editingTask.id, data);
        toast({ title: "Sucesso!", description: "Tarefa recorrente atualizada." });
        handleCloseModal();
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar a tarefa." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setDeletingTaskId(taskId);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;
    setIsSubmitting(true);
    try {
        await deleteRecurringTask(deletingTaskId);
        toast({ title: "Sucesso!", description: "Tarefa recorrente excluída." });
        handleCloseModal();
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir a tarefa." });
    } finally {
        setIsSubmitting(false);
        setIsAlertOpen(false);
        setDeletingTaskId(null);
    }
  };

  const handleChecklistItemChange = async (taskId: string, checklist: RecurringChecklistItem[]) => {
      try {
          await updateRecurringTaskChecklist(taskId, checklist);
      } catch (error) {
           toast({ variant: "destructive", title: "Erro no Checklist", description: "Não foi possível atualizar o item." });
      }
  }

  const handleToggleCompletion = async (task: RecurringTask) => {
    try {
        await updateRecurringTaskCompletion(task.id, !task.isCompleted);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar", description: "Não foi possível marcar a tarefa." });
    }
  };


  if (loading) {
    return (
        <div className="flex justify-center items-center h-48">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tarefas para a Semana</h2>
        <CreateRecurringTaskModal>
          <Button>Criar Tarefa Recorrente</Button>
        </CreateRecurringTaskModal>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-start">
        {dayColumns.map((column) => (
          <Card key={column.id} className="flex flex-col min-h-[150px]">
            <CardHeader>
              <CardTitle>{column.title} ({column.tasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              {column.tasks.length > 0 ? (
                <div className="space-y-2">
                  {column.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                          "p-3 transition-shadow",
                          task.isCompleted && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                         <Checkbox
                            id={`task-complete-${task.id}`}
                            checked={task.isCompleted}
                            onCheckedChange={() => handleToggleCompletion(task)}
                            className="mt-1"
                          />
                        <div className="flex-1 cursor-pointer" onClick={() => handleCardClick(task)}>
                            <p className={cn(
                                "font-semibold",
                                task.isCompleted && "line-through text-muted-foreground"
                            )}>{task.title}</p>
                            {task.description && <p className="text-sm text-muted-foreground truncate">{task.description}</p>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-4">Nenhuma tarefa.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Tarefa Recorrente</DialogTitle>
            <DialogDescription>
              Modifique os detalhes da tarefa ou atualize o checklist.
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
             <RecurringTaskForm
                task={editingTask}
                users={users}
                clients={clients}
                onSave={handleSaveTask}
                onCancel={handleCloseModal}
                onDelete={() => handleDeleteClick(editingTask.id)}
                onChecklistItemChange={handleChecklistItemChange}
                isSubmitting={isSubmitting}
             />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isto irá excluir permanentemente a tarefa recorrente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
