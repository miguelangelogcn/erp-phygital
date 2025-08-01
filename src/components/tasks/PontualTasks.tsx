// src/components/tasks/PontualTasks.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, PlusCircle, Calendar as CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { useAuth } from "@/context/AuthContext";
import { onTasksUpdate, updateTask, deleteTask as deleteTaskService, updateTaskStatusAndOrder } from "@/lib/firebase/services/tasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getClients } from "@/lib/firebase/services/clients";
import type { Task, TaskStatus } from "@/types/task";
import type { SelectOption } from "@/types/common";
import type { User } from "@/types/user";


import TaskForm from "@/components/forms/TaskForm";
import TaskDetailsModal from "@/components/modals/TaskDetailsModal";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { SubmitForApprovalModal } from '@/components/modals/SubmitForApprovalModal';
import { TaskCard } from "@/components/tasks/TaskCard";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

type Columns = {
  [key in TaskStatus]: {
    id: TaskStatus;
    title: string;
    tasks: Task[];
  };
};

const initialColumns: Columns = {
    todo: { id: "todo", title: "A Fazer", tasks: [] },
    doing: { id: "doing", title: "Fazendo", tasks: [] },
    done: { id: "done", title: "Feito", tasks: [] },
}

const priorityOrder: { [key: string]: number } = {
  alta: 1,
  media: 2,
  baixa: 3,
};

export default function PontualTasks() {
  const { userData } = useAuth();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [taskForApproval, setTaskForApproval] = useState<Task | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [alertState, setAlertState] = useState<{
      isOpen: boolean;
      title: string;
      description: string;
      onConfirm: () => void;
  } | null>(null);

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
    const fetchAuxiliaryData = async () => {
        try {
            const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
            setUsers(usersData);
            setClients(clientsData.map(c => ({ value: c.id, label: c.name })));
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao carregar dados", description: "Não foi possível buscar usuários ou clientes." });
        }
    };
    fetchAuxiliaryData();
  }, [toast]);

  useEffect(() => {
      const viewConfig = userData ? { 
        uid: userData.id, 
        isLeader: !!userData.isLeader, 
        memberIds: userData.teamMemberIds 
      } : null;

      const unsubscribe = onTasksUpdate(
        viewConfig,
        (tasks) => {
          setAllTasks(tasks);
          setLoading(false);
        },
        (error) => {
          setLoading(false);
          toast({ variant: "destructive", title: "Erro ao carregar tarefas", description: "Não foi possível buscar as tarefas." });
        }
      );

      return () => unsubscribe();
  }, [toast, userData]);


  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
        // Leader-specific filters
        if (userData?.isLeader) {
          const employeeMatch = selectedEmployees.length === 0 || 
              selectedEmployees.includes(task.responsibleId || "") || 
              task.assistantIds?.some(id => selectedEmployees.includes(id));

          const dateMatch = !dateRange || !dateRange.from || !task.dueDate || (
              task.dueDate.toDate() >= dateRange.from &&
              task.dueDate.toDate() <= (dateRange.to || dateRange.from)
          );
          return employeeMatch && dateMatch;
        }
        // If not a leader, all fetched tasks are relevant, so no client-side filtering needed
        return true;
    });
  }, [allTasks, selectedEmployees, dateRange, userData?.isLeader]);

  useEffect(() => {
    const newColumns: Columns = {
      todo: { id: "todo", title: "A Fazer", tasks: [] },
      doing: { id: "doing", title: "Fazendo", tasks: [] },
      done: { id: "done", title: "Feito", tasks: [] },
    };

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        const priorityA = priorityOrder[a.priority || 'baixa'] || 3;
        const priorityB = priorityOrder[b.priority || 'baixa'] || 3;
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        return (a.order || 0) - (b.order || 0);
    });
    
    sortedTasks.forEach((task) => {
      if (newColumns[task.status]) {
        newColumns[task.status].tasks.push(task)
      }
    });
    
    setColumns(newColumns);
  }, [filteredTasks]);

  const clearFilters = () => {
    setSelectedEmployees([]);
    setDateRange(undefined);
  };

  const handleCardClick = (task: Task) => {
    setViewingTask(task);
  };

  const handleEditClick = (task: Task) => {
    setViewingTask(null);
    setEditingTask(task);
    setIsEditModalOpen(true);
  }
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceColumnId = source.droppableId as TaskStatus;
    const destColumnId = destination.droppableId as TaskStatus;
    
    const task = columns[sourceColumnId]?.tasks.find(t => t.id === draggableId);
    if (!task) return;

    if (destColumnId === 'done' && task.approvalStatus !== 'approved') {
        if (task.checklist && !task.checklist.every(item => item.isCompleted)) {
            toast({
                variant: "destructive",
                title: "Não é possível submeter",
                description: "Todos os itens do checklist devem ser concluídos antes de submeter para aprovação."
            });
            return;
        }
        setTaskForApproval(task);
        setIsApprovalModalOpen(true);
        return;
    }


    const startColumn = columns[sourceColumnId];
    const endColumn = columns[destColumnId];

    const startTasks = Array.from(startColumn.tasks);
    const [movedTask] = startTasks.splice(source.index, 1);
    
    let endTasks: Task[];
    if (startColumn.id === endColumn.id) {
        endTasks = startTasks;
        endTasks.splice(destination.index, 0, movedTask);
    } else {
        endTasks = Array.from(endColumn.tasks);
        endTasks.splice(destination.index, 0, movedTask);
    }

    const newColumnsState: Columns = {
      ...columns,
      [startColumn.id]: { ...startColumn, tasks: startTasks },
      [endColumn.id]: { ...endColumn, tasks: endTasks },
    };

    const confirmAction = () => {
        setColumns(newColumnsState);
        updateTaskStatusAndOrder(
            draggableId, 
            destColumnId, 
            startTasks, 
            endTasks, 
            sourceColumnId, 
            destColumnId
        ).catch(error => {
            toast({ variant: "destructive", title: "Erro ao mover tarefa", description: "Não foi possível atualizar o status." });
            setColumns(columns);
        });
    }

    if (destColumnId === 'doing' && sourceColumnId !== 'doing') {
        setAlertState({ isOpen: true, title: 'Iniciar Tarefa', description: 'Deseja iniciar esta tarefa?', onConfirm: confirmAction });
    } else {
        confirmAction();
    }
  };

  const handleUpdateTask = async (data: Partial<Task>) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    
    const updateData = { ...data };
    
    if (editingTask.approvalStatus === 'rejected') {
      updateData.approvalStatus = 'pending';
    }

    try {
        await updateTask(editingTask.id, updateData);
        toast({ title: "Sucesso", description: "Tarefa atualizada." });
        setIsEditModalOpen(false);
        setEditingTask(null);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar a tarefa." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setAlertState({
        isOpen: true,
        title: "Excluir Tarefa",
        description: "Tem a certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.",
        onConfirm: async () => {
            setIsSubmitting(true);
            try {
                if (typeof taskId !== 'string' || taskId.trim() === '') {
                    throw new Error("ID da tarefa inválido.");
                }
                const result: any = await deleteTaskService(taskId);
                toast({ title: "Sucesso", description: result.data.message });
                setIsEditModalOpen(false);
                setEditingTask(null);
            } catch (error: any) {
                 toast({ variant: "destructive", title: "Erro ao excluir", description: error.message || "Não foi possível excluir a tarefa." });
            } finally {
                setIsSubmitting(false);
            }
        }
    })
  }

  if (loading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-12 w-12 animate-spin" /></div>;

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Tarefas a Realizar</h2>
            <CreateTaskModal onTaskCreated={() => { /* Optional: can refetch or rely on snapshot */ }}>
                <Button variant="gradient">
                    <PlusCircle className="mr-2" /> Criar Nova Tarefa
                </Button>
            </CreateTaskModal>
        </div>

       {userData?.isLeader && (
        <Card className="mb-6">
            <CardHeader>
            <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <MultiSelect
                        options={userOptionsForResponsible}
                        selected={selectedEmployees}
                        onChange={setSelectedEmployees as any}
                        placeholder="Filtrar por funcionários..."
                        className="w-full"
                    />
                </div>
                <div className="flex-1">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                                {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y", { locale: ptBR })
                            )
                            ) : (
                            <span>Selecione um intervalo de datas</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            locale={ptBR}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                </Button>
            </CardContent>
        </Card>
       )}


      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns && Object.values(columns).map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <Card ref={provided.innerRef} {...provided.droppableProps} className={`flex flex-col transition-colors ${snapshot.isDraggingOver ? "bg-accent" : ""}`}>
                  <CardHeader><CardTitle>{column.title} ({column.tasks.length})</CardTitle></CardHeader>
                  <CardContent className="flex-grow space-y-4 p-4 min-h-[200px]">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskCard task={task} onCardClick={handleCardClick} />
                            </div>
                          )}
                        </Draggable>
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">Nenhuma tarefa aqui.</div>
                    )}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
       
      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setEditingTask(null); setIsEditModalOpen(false); }}}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da tarefa abaixo.
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              task={editingTask}
              responsibleOptions={userOptionsForResponsible}
              allUserOptions={allUserOptions}
              clients={clients}
              onSave={handleUpdateTask}
              onCancel={() => { setIsEditModalOpen(false); setEditingTask(null); }}
              onDelete={handleDeleteTask}
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
            taskType="tasks"
        />
      )}

      {viewingTask && (
        <TaskDetailsModal
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          task={viewingTask}
          users={allUserOptions}
          clients={clients}
          onEdit={() => handleEditClick(viewingTask)}
        />
      )}

       {alertState && (
         <AlertDialog open={alertState.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertState(null)}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
               <AlertDialogDescription>{alertState.description}</AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setAlertState(null)}>Cancelar</AlertDialogCancel>
               <AlertDialogAction onClick={() => { alertState.onConfirm(); setAlertState(null); }}>Confirmar</AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
       )}
    </div>
  );
}
