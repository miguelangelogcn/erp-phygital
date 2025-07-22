
// src/components/tasks/CentralTasks.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, AlertCircle, X } from "lucide-react";
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
import { getUsers } from "@/lib/firebase/services/users";
import type { Client } from "@/types/client";
import type { User } from "@/types/user";
import { MultiSelect } from "../ui/multi-select";

const priorityOrder: { [key: string]: number } = {
  alta: 1,
  media: 2,
  baixa: 3,
};

export default function CentralTasks() {
  const [date, setDate] = useState<Date>(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
        getClients(),
        getUsers()
    ]).then(([clientsData, usersData]) => {
        setClients(clientsData);
        setUsers(usersData);
    }).catch(() => setError("Falha ao buscar dados iniciais."));
  }, []);

  const userOptionsForFilter = useMemo(() => {
      if (userData?.isLeader && userData.teamMemberIds) {
          return users
              .filter(u => userData.teamMemberIds!.includes(u.id))
              .map(u => ({ value: u.id, label: u.name }));
      }
      return [];
  }, [users, userData]);
  
  const fetchAgenda = useCallback(async () => {
    if (!userData || !date) return;

    setLoading(true);
    setError(null);
    
    const startOfSelectedDay = startOfDay(date);
    const endOfSelectedDay = endOfDay(date);

    let uidsToQuery: string[] = [];

    if (userData.isLeader) {
        // If leader has selected employees, use them. Otherwise, use all team members.
        uidsToQuery = selectedEmployees.length > 0 ? selectedEmployees : (userData.teamMemberIds || []);
    } else {
        uidsToQuery = [userData.id];
    }
    
    if (uidsToQuery.length === 0) {
        setAgendaItems([]);
        setLoading(false);
        return;
    }
      
    try {
      // --- 1. Fetch Pontual Tasks ---
      const tasksRef = collection(db, "tasks");
      const pontualTasksQuery = query(tasksRef, 
          where("dueDate", ">=", Timestamp.fromDate(startOfSelectedDay)),
          where("dueDate", "<=", Timestamp.fromDate(endOfSelectedDay)),
          where("responsibleId", "in", uidsToQuery)
      );

      // --- 2. Fetch Recurring Tasks ---
      const recurringTasksRef = collection(db, "recurringTasks");
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Sunday: 0 -> 7
      const recurringTasksQuery = query(recurringTasksRef, 
          where("dayOfWeek", "==", dayOfWeek),
          where("responsibleId", "in", uidsToQuery)
      );

      // --- 3. Fetch Calendar Events ---
      const eventsRef = collection(db, "calendarEvents");
      const eventsQuery = query(eventsRef,
          where("startDateTime", ">=", Timestamp.fromDate(startOfSelectedDay)),
          where("startDateTime", "<=", Timestamp.fromDate(endOfSelectedDay)),
          where("responsibleId", "in", uidsToQuery)
      );
      
      const [
          pontualTasksSnap,
          recurringTasksSnap,
          eventsSnap
      ] = await Promise.all([
          getDocs(pontualTasksQuery),
          getDocs(recurringTasksQuery),
          getDocs(eventsQuery)
      ]);
      
      const combinedItems: Record<string, AgendaItem> = {};

      const statusMap: Record<string, string> = {
          todo: 'A Fazer',
          doing: 'Fazendo',
          done: 'Concluído'
      };

      const getClientName = (clientId?: string) => clients.find(c => c.id === clientId)?.name;

      // Process Pontual Tasks
      pontualTasksSnap.docs.forEach(doc => {
          const task = { id: doc.id, ...doc.data() } as Task;
          if (!combinedItems[task.id]) {
              combinedItems[task.id] = {
                  id: task.id,
                  title: task.title,
                  type: 'task',
                  status: statusMap[task.status] || task.status,
                  clientName: getClientName(task.clientId),
                  priority: task.priority,
              };
          }
      });

      // Process Recurring Tasks
      recurringTasksSnap.docs.forEach(doc => {
          const task = { id: doc.id, ...doc.data() } as RecurringTask;
          if (!combinedItems[task.id]) {
               combinedItems[task.id] = {
                  id: task.id,
                  title: task.title,
                  type: 'recurring',
                  status: task.isCompleted ? 'Concluído' : 'Pendente',
                  clientName: getClientName(task.clientId),
                  priority: task.priority,
              };
          }
      });

      // Process Calendar Events
      eventsSnap.docs.forEach(doc => {
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
        const priorityA = priorityOrder[a.priority || 'baixa'] || 3;
        const priorityB = priorityOrder[b.priority || 'baixa'] || 3;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        
        return a.title.localeCompare(b.title);
      });

      setAgendaItems(sortedItems);

    } catch (e) {
      console.error("Error fetching agenda:", e);
      setError("Não foi possível carregar a agenda. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [date, userData, clients, selectedEmployees]);

  useEffect(() => {
      fetchAgenda();
  }, [fetchAgenda]);

  const clearFilters = () => {
    setSelectedEmployees([]);
  };

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
          Nenhuma tarefa para esta seleção.
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

      {userData?.isLeader && (
        <Card>
            <CardHeader>
                <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <MultiSelect
                        options={userOptionsForFilter}
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
