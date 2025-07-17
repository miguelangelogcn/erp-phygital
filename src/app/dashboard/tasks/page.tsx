// src/app/dashboard/tasks/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';


import { onTasksUpdate, updateTask, deleteTask, updateTaskStatus } from "@/lib/firebase/services/tasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getClients } from "@/lib/firebase/services/clients";
import type { Task, TaskStatus } from "@/types/task";
import type { SelectOption } from "@/types/common";

import TaskForm from "@/components/forms/TaskForm";
import TaskDetailsModal from "@/components/modals/TaskDetailsModal";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";

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

export default function TasksPage() {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertState, setAlertState] = useState<{
      isOpen: boolean;
      title: string;
      description: string;
      onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const fetchDataForModals = async () => {
        try {
            const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
            setUsers(usersData.map(u => ({ value: u.id, label: u.name })));
            setClients(clientsData.map(c => ({ value: c.id, label: c.name })));
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao carregar dados", description: "Não foi possível buscar usuários ou clientes." });
        }
    };
    fetchDataForModals();

    const unsubscribe = onTasksUpdate(
      (tasks) => {
        const newColumns: Columns = {
          todo: { id: "todo", title: "A Fazer", tasks: [] },
          doing: { id: "doing", title: "Fazendo", tasks: [] },
          done: { id: "done", title: "Feito", tasks: [] },
        };
        tasks.forEach((task) => {
          if (newColumns[task.status]) {
            newColumns[task.status].tasks.push(task)
          }
        });
        Object.values(newColumns).forEach(col => col.tasks.sort((a, b) => (a.order || 0) - (b.order || 0)));
        setColumns(newColumns);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toast({ variant: "destructive", title: "Erro ao carregar tarefas", description: "Não foi possível buscar as tarefas." });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const handleCardClick = (task: Task) => {
    if (task.status === 'todo') {
        setViewingTask(task);
    } else if (task.status === 'doing') {
        setEditingTask(task);
        setIsEditModalOpen(true);
    }
  };
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceColumnId = source.droppableId as TaskStatus;
    const destColumnId = destination.droppableId as TaskStatus;
    
    // Find the task being moved
    const task = columns[sourceColumnId]?.tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Prevent moving to "Done" if checklist is incomplete
    if (destColumnId === 'done' && task.checklist && !task.checklist.every(item => item.isCompleted)) {
        toast({
            variant: "destructive",
            title: "Não é possível finalizar",
            description: "Todos os itens do checklist devem ser concluídos antes de mover a tarefa para 'Feito'."
        });
        return;
    }

    const startColumn = columns[sourceColumnId];
    const endColumn = columns[destColumnId];

    // Optimistic UI update logic
    const startTasks = Array.from(startColumn.tasks);
    const [movedTask] = startTasks.splice(source.index, 1);
    
    let newColumnsState = { ...columns };

    if (startColumn.id === endColumn.id) {
        // Moving within the same column
        startTasks.splice(destination.index, 0, movedTask);
        newColumnsState = {
            ...columns,
            [startColumn.id]: {
                ...startColumn,
                tasks: startTasks
            }
        };
    } else {
        // Moving to a different column
        const endTasks = Array.from(endColumn.tasks);
        endTasks.splice(destination.index, 0, movedTask);
        newColumnsState = {
            ...columns,
            [startColumn.id]: {
                ...startColumn,
                tasks: startTasks
            },
            [endColumn.id]: {
                ...endColumn,
                tasks: endTasks
            }
        };
    }

    // This is the action that will be confirmed
    const confirmAction = () => {
        setColumns(newColumnsState);
        updateTaskStatus(draggableId, destColumnId).catch(error => {
            toast({ variant: "destructive", title: "Erro ao mover tarefa", description: "Não foi possível atualizar o status." });
            setColumns(columns); // Revert optimistic update on error
        });
    }

    // Show confirmation dialogs if needed
    if (destColumnId === 'doing' && sourceColumnId !== 'doing') {
        setAlertState({ isOpen: true, title: 'Iniciar Tarefa', description: 'Deseja iniciar esta tarefa?', onConfirm: confirmAction });
    } else if (destColumnId === 'done' && sourceColumnId !== 'done') {
        setAlertState({ isOpen: true, title: 'Finalizar Tarefa', description: 'Deseja finalizar esta tarefa?', onConfirm: confirmAction });
    } else {
        confirmAction();
    }
  };

  const handleUpdateTask = async (data: Partial<Task>) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    try {
        await updateTask(editingTask.id, data);
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
        description: "Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.",
        onConfirm: async () => {
            setIsSubmitting(true);
            try {
                await deleteTask(taskId);
                toast({ title: "Sucesso", description: "Tarefa excluída." });
                setIsEditModalOpen(false);
                setEditingTask(null);
            } catch (error) {
                 toast({ variant: "destructive", title: "Erro ao excluir", description: "Não foi possível excluir a tarefa." });
            } finally {
                setIsSubmitting(false);
            }
        }
    })
  }

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;

  return (
    <main className="p-4 md:p-6">
       <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">Painel de Tarefas</h1>
            <p className="text-muted-foreground">Gerencie o fluxo de trabalho da sua equipe.</p>
        </div>
        <CreateTaskModal>
            <Button>
                <PlusCircle className="mr-2" /> Criar Nova Tarefa
            </Button>
        </CreateTaskModal>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns && Object.values(columns).map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <Card ref={provided.innerRef} {...provided.droppableProps} className={`flex flex-col transition-colors ${snapshot.isDraggingOver ? "bg-accent" : ""}`}>
                  <CardHeader><CardTitle>{column.title}</CardTitle></CardHeader>
                  <CardContent className="flex-grow space-y-4 p-4 min-h-[200px]">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleCardClick(task)}
                            >
                              <Card className={`hover:shadow-md cursor-pointer ${snapshot.isDragging ? "shadow-lg" : ""}`}>
                                <CardHeader className="p-4"><CardTitle className="text-base">{task.title}</CardTitle></CardHeader>
                                {task.description && <CardContent className="p-4 pt-0"><p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p></CardContent>}
                              </Card>
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
              users={users}
              clients={clients}
              onSave={handleUpdateTask}
              onCancel={() => { setIsEditModalOpen(false); setEditingTask(null); }}
              onDelete={handleDeleteTask}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>


       <TaskDetailsModal
            task={viewingTask}
            isOpen={!!viewingTask}
            onClose={() => setViewingTask(null)}
            users={users}
            clients={clients}
       />

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
    </main>
  );
}
