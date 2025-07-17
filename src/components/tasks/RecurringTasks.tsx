// src/components/tasks/RecurringTasks.tsx
"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MoreHorizontal, Trash2, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  onRecurringTasksUpdate,
  updateRecurringTask,
  deleteRecurringTask,
  updateRecurringTaskOrderAndDay,
} from "@/lib/firebase/services/recurringTasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getClients } from "@/lib/firebase/services/clients";
import type { RecurringTask, DayOfWeek, RecurringChecklistItem } from "@/types/recurringTask";
import type { SelectOption } from "@/types/common";
import { CreateRecurringTaskModal } from "../modals/CreateRecurringTaskModal";
import RecurringTaskForm from "../forms/RecurringTaskForm";

type Columns = {
  [key in DayOfWeek]: {
    id: DayOfWeek;
    title: string;
    tasks: RecurringTask[];
  };
};

const dayNames: { [key in DayOfWeek]: string } = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

const initialColumns: Columns = {
  monday: { id: "monday", title: dayNames.monday, tasks: [] },
  tuesday: { id: "tuesday", title: dayNames.tuesday, tasks: [] },
  wednesday: { id: "wednesday", title: dayNames.wednesday, tasks: [] },
  thursday: { id: "thursday", title: dayNames.thursday, tasks: [] },
  friday: { id: "friday", title: dayNames.friday, tasks: [] },
  saturday: { id: "saturday", title: dayNames.saturday, tasks: [] },
  sunday: { id: "sunday", title: dayNames.sunday, tasks: [] },
};

export default function RecurringTasks() {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
        setUsers(usersData.map((u) => ({ value: u.id, label: u.name })));
        setClients(clientsData.map((c) => ({ value: c.id, label: c.name })));
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao carregar dados" });
      }
    };
    fetchData();

    const unsubscribe = onRecurringTasksUpdate(
      (tasks) => {
        const newColumns: Columns = JSON.parse(JSON.stringify(initialColumns));
        tasks.forEach((task) => {
          if (newColumns[task.dayOfWeek]) {
            newColumns[task.dayOfWeek].tasks.push(task);
          }
        });
        Object.values(newColumns).forEach(col => col.tasks.sort((a, b) => (a.order || 0) - (b.order || 0)));
        setColumns(newColumns);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toast({ variant: "destructive", title: "Erro ao carregar tarefas recorrentes" });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceDay = source.droppableId as DayOfWeek;
    const destDay = destination.droppableId as DayOfWeek;

    const startColumn = columns[sourceDay];
    const endColumn = columns[destDay];

    const startTasks = Array.from(startColumn.tasks);
    const [movedTask] = startTasks.splice(source.index, 1);
    
    let endTasks: RecurringTask[];
    if (startColumn.id === endColumn.id) {
      endTasks = startTasks;
      endTasks.splice(destination.index, 0, movedTask);
    } else {
      endTasks = Array.from(endColumn.tasks);
      endTasks.splice(destination.index, 0, movedTask);
    }

    const newColumnsState = {
      ...columns,
      [startColumn.id]: { ...startColumn, tasks: startTasks },
      [endColumn.id]: { ...endColumn, tasks: endTasks },
    };

    setColumns(newColumnsState);
    
    updateRecurringTaskOrderAndDay(draggableId, destDay, startTasks, endTasks, sourceDay, destDay)
      .catch(() => {
        toast({ variant: "destructive", title: "Erro ao mover tarefa" });
        setColumns(columns); // Revert on error
      });
  };

  const handleUpdateTask = async (data: Partial<RecurringTask>) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    try {
      await updateRecurringTask(editingTask.id, data);
      toast({ title: "Sucesso", description: "Tarefa recorrente atualizada." });
      setIsEditModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTaskId) return;
    setIsSubmitting(true);
    try {
      await deleteRecurringTask(deletingTaskId);
      toast({ title: "Sucesso", description: "Tarefa recorrente excluída." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    } finally {
      setIsSubmitting(false);
      setDeletingTaskId(null);
    }
  };

  const handleToggleChecklistItem = async (task: RecurringTask, item: RecurringChecklistItem) => {
    const newChecklist = task.checklist?.map(i => i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i);
    await updateRecurringTask(task.id, { checklist: newChecklist });
  };


  if (loading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-12 w-12 animate-spin" /></div>;

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Tarefas para a Semana</h2>
            <CreateRecurringTaskModal>
                <Button>
                <PlusCircle className="mr-2" /> Criar Tarefa Recorrente
                </Button>
            </CreateRecurringTaskModal>
        </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-start">
          {Object.values(columns).map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <Card ref={provided.innerRef} {...provided.droppableProps} className={`flex flex-col transition-colors ${snapshot.isDraggingOver ? "bg-accent" : ""}`}>
                  <CardHeader><CardTitle>{column.title} ({column.tasks.length})</CardTitle></CardHeader>
                  <CardContent className="flex-grow space-y-4 p-4 min-h-[200px]">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <Card className="hover:shadow-md group relative">
                                <CardHeader className="p-4">
                                  <CardTitle className="text-base">{task.title}</CardTitle>
                                </CardHeader>
                                {task.checklist && task.checklist.length > 0 && (
                                   <CardContent className="p-4 pt-0 space-y-2">
                                        {task.checklist.map(item => (
                                            <div key={item.id} className="flex items-center gap-2 text-sm">
                                                <button onClick={() => handleToggleChecklistItem(task, item)}>
                                                    {item.isCompleted ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4"/>}
                                                </button>
                                                <span className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>{item.text}</span>
                                            </div>
                                        ))}
                                   </CardContent>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={() => { setEditingTask(task); setIsEditModalOpen(true); }}>Editar</DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => setDeletingTaskId(task.id)} className="text-destructive">Excluir</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">Nenhuma tarefa.</div>
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
            <DialogTitle>Editar Tarefa Recorrente</DialogTitle>
            <DialogDescription>Atualize os detalhes da tarefa.</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <RecurringTaskForm
              task={editingTask}
              users={users}
              clients={clients}
              onSave={handleUpdateTask}
              onCancel={() => { setIsEditModalOpen(false); setEditingTask(null); }}
              onDelete={() => setDeletingTaskId(editingTask.id)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingTaskId} onOpenChange={(isOpen) => !isOpen && setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Isto irá excluir a tarefa recorrente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTaskId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
