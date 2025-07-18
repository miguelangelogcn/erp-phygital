// src/components/tasks/CentralTasks.tsx
"use client";

import React, { useState, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Task } from "@/types/task";
import type { RecurringTask } from "@/types/recurringTask";
import type { CalendarEvent } from "@/types/calendarEvent";
import type { AgendaItem } from "./AgendaItemCard";
import { AgendaItemCard } from "./AgendaItemCard";
import { getClients } from "@/lib/firebase/services/clients";
import type { Client } from "@/types/client";

export default function CentralTasks() {
  const [date, setDate] = useState<Date>(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    getClients().then(setClients).catch(() => setError("Falha ao buscar clientes."));
  }, []);

  useEffect(() => {
    if (!userData || !date) return;

    const fetchAgenda = async () => {
      setLoading(true);
      setError(null);
      const { id: uid } = userData;
      const startOfSelectedDay = startOfDay(date);
      const endOfSelectedDay = endOfDay(date);
      
      try {
        // --- 1. Fetch Pontual Tasks ---
        const tasksRef = collection(db, "tasks");
        const responsibleTasksQuery = query(tasksRef, 
            where("dueDate", ">=", Timestamp.fromDate(startOfSelectedDay)),
            where("dueDate", "<=", Timestamp.fromDate(endOfSelectedDay)),
            where("responsibleId", "==", uid)
        );
        const assistantTasksQuery = query(tasksRef,
            where("dueDate", ">=", Timestamp.fromDate(startOfSelectedDay)),
            where("dueDate", "<=", Timestamp.fromDate(endOfSelectedDay)),
            where("assistantIds", "array-contains", uid)
        );

        // --- 2. Fetch Recurring Tasks ---
        const recurringTasksRef = collection(db, "recurringTasks");
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Sunday: 0 -> 7
        const responsibleRecurringQuery = query(recurringTasksRef, 
            where("dayOfWeek", "==", dayOfWeek),
            where("responsibleId", "==", uid)
        );
        const assistantRecurringQuery = query(recurringTasksRef,
            where("dayOfWeek", "==", dayOfWeek),
            where("assistantIds", "array-contains", uid)
        );

        // --- 3. Fetch Calendar Events ---
        const eventsRef = collection(db, "calendarEvents");
        const responsibleEventsQuery = query(eventsRef,
            where("startDateTime", ">=", Timestamp.fromDate(startOfSelectedDay)),
            where("startDateTime", "<=", Timestamp.fromDate(endOfSelectedDay)),
            where("responsibleId", "==", uid)
        );
        
        // Execute all queries in parallel
        const [
            responsibleTasksSnap, assistantTasksSnap,
            responsibleRecurringSnap, assistantRecurringSnap,
            responsibleEventsSnap
        ] = await Promise.all([
            getDocs(responsibleTasksQuery), getDocs(assistantTasksQuery),
            getDocs(responsibleRecurringQuery), getDocs(assistantRecurringQuery),
            getDocs(responsibleEventsQuery)
        ]);
        
        const combinedItems: Record<string, AgendaItem> = {};

        const statusMap: Record<string, string> = {
            todo: 'A Fazer',
            doing: 'Fazendo',
            done: 'Concluído'
        };

        const getClientName = (clientId?: string) => clients.find(c => c.id === clientId)?.name;

        // Process Pontual Tasks
        [...responsibleTasksSnap.docs, ...assistantTasksSnap.docs].forEach(doc => {
            const task = { id: doc.id, ...doc.data() } as Task;
            if (!combinedItems[task.id]) {
                combinedItems[task.id] = {
                    id: task.id,
                    title: task.title,
                    type: 'task',
                    status: statusMap[task.status] || task.status,
                    clientName: getClientName(task.clientId),
                };
            }
        });

        // Process Recurring Tasks
        [...responsibleRecurringSnap.docs, ...assistantRecurringSnap.docs].forEach(doc => {
            const task = { id: doc.id, ...doc.data() } as RecurringTask;
            if (!combinedItems[task.id]) {
                 combinedItems[task.id] = {
                    id: task.id,
                    title: task.title,
                    type: 'recurring',
                    status: task.isCompleted ? 'Concluído' : 'Pendente',
                    clientName: getClientName(task.clientId),
                };
            }
        });

        // Process Calendar Events
        responsibleEventsSnap.docs.forEach(doc => {
            const event = { id: doc.id, ...doc.data() } as CalendarEvent;
             if (!combinedItems[event.id]) {
                combinedItems[event.id] = {
                    id: event.id,
                    title: event.title,
                    type: 'event',
                    startTime: event.startDateTime ? format(event.startDateTime.toDate(), 'HH:mm') : null,
                    endTime: event.endDateTime ? format(event.endDateTime.toDate(), 'HH:mm') : null,
                    clientName: getClientName(event.clientId),
                };
            }
        });
        
        const sortedItems = Object.values(combinedItems).sort((a, b) => {
          // Sort by start time if available, otherwise by title
          if (a.startTime && b.startTime) {
            return a.startTime.localeCompare(b.startTime);
          }
          if (a.startTime) return -1; // a comes first
          if (b.startTime) return 1;  // b comes first
          return a.title.localeCompare(b.title); // fallback to title sort
        });

        setAgendaItems(sortedItems);

      } catch (e) {
        console.error("Error fetching agenda:", e);
        setError("Não foi possível carregar a agenda. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, [date, userData, clients]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center text-destructive py-8 flex flex-col items-center gap-2">
            <AlertCircle />
            <p>{error}</p>
        </div>
      );
    }
    if (agendaItems.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Nenhuma tarefa para este dia.
        </div>
      );
    }
    return (
        <div className="space-y-4">
            {agendaItems.map(item => (
                <AgendaItemCard key={`${item.type}-${item.id}`} item={item} />
            ))}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecione uma Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, "PPP", { locale: ptBR })
                ) : (
                  <span>Escolha uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => setDate(newDate || new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>
                Agenda para {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
