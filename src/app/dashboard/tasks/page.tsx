// src/app/dashboard/tasks/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Loader2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { onTasksUpdate, updateTaskStatus, addTask, updateTask, deleteTask } from "@/lib/firebase/services/tasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getClients } from "@/lib/firebase/services/clients";
import type { Task, TaskStatus, NewTask, ChecklistItem } from "@/types/task";
import type { SelectOption } from "@/types/common";

import TaskForm from "@/components/forms/TaskForm";
import TaskDetailsModal from "@/components/modals/TaskDetailsModal";


type Columns = {
  [key in TaskStatus]: {
    id: TaskStatus;
    title: string;
    tasks: Task[];
  };
};

export default function TasksPage() {
  const [columns, setColumns] = useState<Columns | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
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

    const unsubscribe = onTasksUpdate(
      (tasks) => {
        const newColumns: Columns = {
          todo: { id: "todo", title: "A Fazer", tasks: [] },
          doing: { id: "doing", title: "Fazendo", tasks: [] },
          done: { id: "done", title: "Feito", tasks: [] },
        };
        tasks.forEach((task) => {
          if (newColumns[task.status]) newColumns[task.status].tasks.push(task);
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
        setIsModalOpen(true);
    }
  };
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceColumnId = source.droppableId as TaskStatus;
    const destColumnId = destination.droppableId as TaskStatus;
    if (sourceColumnId === destColumnId && source.index === destination.index) return;
    
    const task = columns?.[sourceColumnId]?.tasks.find(t => t.id === draggableId);
    if (!task) return;

    if (destColumnId === 'done' && task.checklist && !task.checklist.every(item => item.isCompleted)) {
        toast({
            variant: "destructive",
            title: "Não é possível finalizar",
            description: "Todos os itens do checklist devem ser concluídos antes de mover a tarefa para 'Feito'."
        });
        return;
    }
    
    const confirmAction = () => {
        // Optimistic UI update
        if (columns) {
            const sourceColumn = columns[sourceColumnId];
            const destColumn = columns[destColumnId];
            const sourceTasks = [...sourceColumn.tasks];
            const [movedTask] = sourceTasks.splice(source.index, 1);
            movedTask.status = destColumnId;

            const newColumns = {...columns};
            const destTasks = sourceColumnId === destColumnId ? sourceTasks : [...destColumn.tasks];
            destTasks.splice(destination.index, 0, movedTask);
            newColumns[sourceColumnId] = { ...sourceColumn, tasks: sourceTasks };
            newColumns[destColumnId] = { ...destColumn, tasks: destTasks };
            setColumns(newColumns);
        }

        updateTaskStatus(draggableId, destColumnId).catch(error => {
            toast({ variant: "destructive", title: "Erro ao mover tarefa", description: "Não foi possível atualizar o status." });
            // Here you might want to revert the optimistic update
        });
    }

    if (destColumnId === 'doing' && sourceColumnId !== 'doing') {
        setAlertState({ isOpen: true, title: 'Iniciar Tarefa', description: 'Deseja iniciar esta tarefa?', onConfirm: confirmAction });
    } else if (destColumnId === 'done' && sourceColumnId !== 'done') {
        setAlertState({ isOpen: true, title: 'Finalizar Tarefa', description: 'Deseja finalizar esta tarefa?', onConfirm: confirmAction });
    } else {
        confirmAction();
    }
  };

  const handleSaveTask = async (data: NewTask | Partial<Task>) => {
    setIsSubmitting(true);
    try {
        if (editingTask) {
            await updateTask(editingTask.id, data);
            toast({ title: "Sucesso", description: "Tarefa atualizada." });
        } else {
            const newTaskData: NewTask = { status: 'todo', ...data };
            await addTask(newTaskData);
            toast({ title: "Sucesso", description: "Nova tarefa criada." });
        }
        setIsModalOpen(false);
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
                setIsModalOpen(false);
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
        <Button onClick={() => { setEditingTask(null); setIsModalOpen(true); }}>
            <PlusCircle className="mr-2" /> Criar Nova Tarefa
        </Button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns && Object.values(columns).map((column) => (
            <Droppable key={column.id} droppableId={column.id} isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
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
       
       <Dialog open={isModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsModalOpen(false); setEditingTask(null); } else { setIsModalOpen(true); } }}>
         <DialogContent className="sm:max-w-3xl">
           <DialogHeader>
             <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
             <DialogDescription>Preencha os detalhes da tarefa abaixo.</DialogDescription>
           </DialogHeader>
           <TaskForm
                task={editingTask}
                users={users}
                clients={clients}
                onSave={handleSaveTask}
                onCancel={() => { setIsModalOpen(false); setEditingTask(null); }}
                onDelete={editingTask ? handleDeleteTask : undefined}
                isSubmitting={isSubmitting}
           />
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
