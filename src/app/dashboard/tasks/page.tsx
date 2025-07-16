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
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { onTasksUpdate, updateTaskStatus } from "@/lib/firebase/services/tasks";
import type { Task, TaskStatus } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

type Columns = {
  [key in TaskStatus]: {
    id: TaskStatus;
    title: string;
    tasks: Task[];
  };
};

const columnTitles: { [key in TaskStatus]: string } = {
  todo: "A Fazer",
  doing: "Fazendo",
  done: "Feito",
};

export default function TasksPage() {
  const [columns, setColumns] = useState<Columns | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onTasksUpdate(
      (tasks) => {
        const newColumns: Columns = {
          todo: { id: "todo", title: "A Fazer", tasks: [] },
          doing: { id: "doing", title: "Fazendo", tasks: [] },
          done: { id: "done", title: "Feito", tasks: [] },
        };

        tasks.forEach((task) => {
          if (newColumns[task.status]) {
            newColumns[task.status].tasks.push(task);
          }
        });

        // Sort tasks within each column if needed (e.g., by a timestamp)
        Object.values(newColumns).forEach(col => {
            col.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        setColumns(newColumns);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Erro ao carregar tarefas",
          description: "Não foi possível buscar as tarefas.",
        });
      }
    );

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [toast]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Do nothing if item is dropped outside of a droppable area
    if (!destination) return;

    const sourceColumnId = source.droppableId as TaskStatus;
    const destColumnId = destination.droppableId as TaskStatus;

    // Do nothing if the item is dropped in the same place
    if (sourceColumnId === destColumnId && source.index === destination.index) {
        return;
    }
    
    // Optimistic UI Update
    if (columns) {
        const sourceColumn = columns[sourceColumnId];
        const destColumn = columns[destColumnId];
        const sourceTasks = [...sourceColumn.tasks];
        const [movedTask] = sourceTasks.splice(source.index, 1);

        const newColumns = {...columns};

        // Moving within the same column
        if (sourceColumnId === destColumnId) {
            sourceTasks.splice(destination.index, 0, movedTask);
            newColumns[sourceColumnId] = {
                ...sourceColumn,
                tasks: sourceTasks,
            };
        } else {
            // Moving to a different column
            const destTasks = [...destColumn.tasks];
            destTasks.splice(destination.index, 0, movedTask);
             newColumns[sourceColumnId] = {
                ...sourceColumn,
                tasks: sourceTasks,
            };
            newColumns[destColumnId] = {
                ...destColumn,
                tasks: destTasks,
            };
        }
        
        setColumns(newColumns);
    }
    
    // Update Firestore
    try {
        await updateTaskStatus(draggableId, destColumnId);
        // No toast on success for a cleaner experience, the optimistic update is enough.
    } catch (error) {
        console.error("Failed to update task status:", error);
        toast({
            variant: "destructive",
            title: "Erro ao mover tarefa",
            description: "Não foi possível atualizar o status da tarefa."
        });
        // TODO: Revert optimistic update if Firestore update fails
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <main className="p-4 md:p-6">
       <div className="mb-6">
        <h1 className="text-3xl font-bold">Painel de Tarefas</h1>
        <p className="text-muted-foreground">
          Gerencie o fluxo de trabalho da sua equipe.
        </p>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns && Object.values(columns).map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col transition-colors ${
                    snapshot.isDraggingOver ? "bg-accent" : ""
                  }`}
                >
                  <CardHeader>
                    <CardTitle>{column.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4 p-4 min-h-[200px]">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card className={`hover:shadow-md ${snapshot.isDragging ? "shadow-lg" : ""}`}>
                                <CardHeader className="p-4">
                                  <CardTitle className="text-base">{task.title}</CardTitle>
                                </CardHeader>
                                {task.description && (
                                     <CardContent className="p-4 pt-0">
                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                    </CardContent>
                                )}
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        Nenhuma tarefa aqui.
                      </div>
                    )}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </main>
  );
}
