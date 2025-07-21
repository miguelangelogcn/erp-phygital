// src/components/tasks/RecurringTasks.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { onRecurringTasksUpdate, updateRecurringTask, deleteRecurringTask as deleteRecurringTaskService, updateRecurringTaskChecklist, startRecurringTask } from "@/lib/firebase/services/recurringTasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getClients } from "@/lib/firebase/services/clients";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlusCircle, X, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { CreateRecurringTaskModal } from "@/components/modals/CreateRecurringTaskModal";
import RecurringTaskForm from "@/components/forms/RecurringTaskForm";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";

import type { RecurringTask, RecurringChecklistItem } from "@/types/recurringTask";
import type { SelectOption } from "@/types/common";
import type { User } from "@/types/user";
import { cn } from "@/lib/utils";
import { SubmitForApprovalModal } from "../modals/SubmitForApprovalModal";

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
  const { userData } = useAuth();
  const [allTasks, setAllTasks] = useState<RecurringTask[]>([]);
  const [dayColumns, setDayColumns] = useState<DayColumn[]>(initialDays);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [taskForApproval, setTaskForApproval] = useState<RecurringTask | null>(null);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  const userOptionsForResponsible = useMemo(() => {
    if (userData?.isLeader && userData.teamMemberIds) {
      return users
        .filter(u => userData.teamMemberIds?.includes(u.id))
        .map(u => ({ value: u.id, label: u.name }));
    }
     if (userData) {
      return users
        .filter(u => u.id === userData.id)
        .map(u => ({ value: u.id, label: u.name }));
    }
    return [];
  }, [users, userData]);
  
  const allUserOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
            setUsers(usersData);
            setClients(clientsData.map(c => ({ value: c.id, label: c.name })));
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao carregar dados", description: "Não foi possível buscar usuários ou clientes." });
        }
    };
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    const viewConfig = userData ? { 
      uid: userData.id, 
      isLeader: !!userData.isLeader, 
      memberIds: userData.teamMemberIds 
    } : null;

    const unsubscribe = onRecurringTasksUpdate(
      viewConfig,
      (tasks) => {
        setAllTasks(tasks);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as tarefas recorrentes." });
      }
    );

    return () => unsubscribe();
  }, [toast, userData]);

  const filteredTasks = useMemo(() => {
     if (userData?.isLeader) {
        return allTasks.filter(task => {
            const employeeMatch = selectedEmployees.length === 0 || 
                selectedEmployees.includes(task.responsibleId || "") || 
                task.assistantIds?.some(id => selectedEmployees.includes(id));
            
            return employeeMatch;
        });
     }
     return allTasks;
  }, [allTasks, selectedEmployees, userData?.isLeader]);

  useEffect(() => {
      const newDayColumns: DayColumn[] = JSON.parse(JSON.stringify(initialDays));
      filteredTasks.forEach((task) => {
          const targetColumn = newDayColumns.find(col => col.id === task.dayOfWeek);
          if (targetColumn) {
            targetColumn.tasks.push(task);
          }
      });
      setDayColumns(newDayColumns);
  }, [filteredTasks]);

  const clearFilters = () => {
    setSelectedEmployees([]);
  };

  const getApprovalBadge = (status?: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
        case 'pending':
            return <Badge variant="secondary" className="flex items-center gap-1 bg-orange-400/20 text-orange-400 border-orange-400/30"><Clock className="h-3 w-3" /> Pendente</Badge>;
        case 'rejected':
            return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Rejeitado</Badge>;
        case 'approved':
             return <Badge variant="secondary" className="flex items-center gap-1 bg-green-400/20 text-green-400 border-green-400/30"><CheckCircle className="h-3 w-3" /> Aprovado</Badge>;
        default:
            return null;
    }
  }


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
    
    const updateData = { ...data };
    
    if (editingTask.approvalStatus === 'rejected') {
      updateData.approvalStatus = 'pending';
    }

    try {
        await updateRecurringTask(editingTask.id, updateData);
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
        if (typeof deletingTaskId !== 'string' || deletingTaskId.trim() === '') {
            throw new Error("ID da tarefa inválido.");
        }
        const result: any = await deleteRecurringTaskService(deletingTaskId);
        toast({ title: "Sucesso!", description: result.data.message });
        handleCloseModal();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível excluir a tarefa." });
    } finally {
        setIsSubmitting(false);
        setIsAlertOpen(false);
        setDeletingTaskId(null);
    }
  };

  const handleChecklistItemChange = async (taskId: string, checklist: RecurringChecklistItem[]) => {
      try {
          await updateRecurringTaskChecklist(taskId, checklist);
      } catch (error)
 {
           toast({ variant: "destructive", title: "Erro no Checklist", description: "Não foi possível atualizar o item." });
      }
  }

  const handleToggleCompletion = async (task: RecurringTask) => {
      // Logic changed: always open approval modal
      if (task.checklist && !task.checklist.every(item => item.isCompleted)) {
          toast({
              variant: "destructive",
              title: "Não é possível submeter",
              description: "Todos os itens do checklist devem ser concluídos."
          });
          return;
      }
      setTaskForApproval(task);
      setIsApprovalModalOpen(true);
  };
  
  const handleStartTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
        await startRecurringTask(taskId);
        toast({
            title: "Tarefa Iniciada!",
            description: "A tarefa foi marcada como iniciada.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível iniciar a tarefa.",
        });
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
          <Button variant="gradient">
            <PlusCircle className="mr-2" />
            Criar Tarefa Recorrente
          </Button>
        </CreateRecurringTaskModal>
      </div>

       {userData?.isLeader && (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <MultiSelect
                        options={userOptionsForResponsible}
                        selected={selectedEmployees}
                        onChange={setSelectedEmployees as any}
                        placeholder="Filtrar por funcionários..."
                        className="w-full"
                    />
                </div>
                <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                </Button>
            </CardContent>
        </Card>
       )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-start">
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
                          "p-3 transition-shadow hover:shadow-md cursor-pointer",
                          task.isCompleted && "bg-muted/50"
                      )}
                      onClick={() => handleCardClick(task)}
                    >
                      <div className="flex items-start gap-3">
                         <div className="mt-1">
                            {!task.startedAt ? (
                                <Button size="sm" className="h-auto px-2 py-1 text-xs" onClick={(e) => handleStartTask(e, task.id)}>
                                    Iniciar
                                </Button>
                            ) : (
                                <Checkbox
                                    id={`task-complete-${task.id}`}
                                    checked={task.isCompleted || task.approvalStatus === 'approved'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleCompletion(task);
                                    }}
                                />
                            )}
                         </div>
                        <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className={cn(
                                    "font-semibold pr-2",
                                    (task.isCompleted || task.approvalStatus === 'approved') && "line-through text-muted-foreground"
                                )}>{task.title}</p>
                                {getApprovalBadge(task.approvalStatus)}
                            </div>
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
                responsibleOptions={userOptionsForResponsible}
                allUserOptions={allUserOptions}
                clients={clients}
                onSave={handleSaveTask}
                onCancel={handleCloseModal}
                onDelete={() => handleDeleteClick(editingTask.id)}
                onChecklistItemChange={handleChecklistItemChange}
                isSubmitting={isSubmitting}
                currentUserIsLeader={!!userData?.isLeader}
                currentUserId={userData?.id}
             />
          )}
        </DialogContent>
      </Dialog>

       {taskForApproval && (
        <SubmitForApprovalModal
            isOpen={isApprovalModalOpen}
            onClose={() => {
                setIsApprovalModalOpen(false);
                setTaskForApproval(null);
            }}
            task={taskForApproval}
            taskType="recurringTasks"
        />
      )}
      
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
