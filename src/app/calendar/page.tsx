// Ficheiro: src/app/dashboard/calendar/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { EventInput, EventClickArg, DateClickArg } from '@fullcalendar/core';
import { Loader2 } from 'lucide-react';
import type { CalendarEvent, EventChecklistItem } from '@/types/calendarEvent';
import { EventModal } from '@/components/modals/EventModal';
import { EventDetailsModal } from '@/components/modals/EventDetailsModal';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUsers } from '@/lib/firebase/services/users';
import { getClients } from '@/lib/firebase/services/clients';
import { updateEventChecklist } from '@/lib/firebase/services/calendarEvents';
import type { SelectOption } from '@/types/common';
import type { User } from '@/types/user';
import { useToast } from '@/hooks/use-toast';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // States for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  
  // State for auxiliary data
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);


  useEffect(() => {
    const fetchAuxData = async () => {
        try {
            const usersData = await getUsers();
            const clientsData = await getClients();
            setUsers(usersData.map((u: User) => ({ value: u.id, label: u.name })));
            setClients(clientsData.map(c => ({ value: c.id, label: c.name })));
        } catch (error) {
            console.error("Failed to fetch users or clients", error);
        }
    }
    fetchAuxData();
    
    const unsubscribe = onSnapshot(collection(db, 'calendarEvents'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<CalendarEvent, 'id'>;
        
        if (!data.startDateTime || !data.endDateTime) return null;

        return {
          id: doc.id,
          title: data.title,
          start: data.startDateTime.toDate(),
          end: data.endDateTime.toDate(),
          allDay: false,
          backgroundColor: data.color || '#374151',
          borderColor: data.color || '#4B5563',
          extendedProps: { ...data, id: doc.id }
        };
      }).filter(event => event !== null) as EventInput[];
      
      setEvents(fetchedEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDateClick = (arg: DateClickArg) => {
    const startDateTime = Timestamp.fromDate(arg.date);
    const endDateTime = Timestamp.fromDate(new Date(arg.date.getTime() + 60 * 60 * 1000)); // Add 1 hour
    setEditingEvent({ startDateTime, endDateTime });
    setIsEditModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const eventData = arg.event.extendedProps as CalendarEvent;
    setViewingEvent(eventData);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
  }

  const handleEditFromDetails = () => {
      if (viewingEvent) {
          setEditingEvent(viewingEvent);
          setViewingEvent(null);
          setIsEditModalOpen(true);
      }
  }

  const handleEventChecklistItemChange = async (eventId: string, checklist: EventChecklistItem[]) => {
      if (!viewingEvent) return;

      const originalEvents = [...events];
      const updatedEvents = events.map(e => {
        if (e.id === eventId) {
          return { ...e, extendedProps: { ...e.extendedProps, checklist }};
        }
        return e;
      });
      setEvents(updatedEvents);

      // Update viewingEvent state as well for instant UI feedback
      setViewingEvent(prev => prev ? { ...prev, checklist } : null);

      try {
          await updateEventChecklist(eventId, checklist);
      } catch (error) {
          setEvents(originalEvents);
          const originalEvent = originalEvents.find(e => e.id === eventId)?.extendedProps as CalendarEvent;
          setViewingEvent(originalEvent || null);
          toast({ variant: "destructive", title: "Erro ao atualizar checklist" });
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
    <main className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Gravações</CardTitle>
        </CardHeader>
        <CardContent>
           <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            weekends={true}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            locale="pt-br"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek,dayGridDay'
            }}
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
            }}
            height="auto"
          />
        </CardContent>
      </Card>
     
      <EventModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        event={editingEvent}
      />

      <EventDetailsModal
        isOpen={!!viewingEvent}
        onClose={() => setViewingEvent(null)}
        event={viewingEvent}
        onEdit={handleEditFromDetails}
        users={users}
        clients={clients}
        onChecklistItemChange={handleEventChecklistItemChange}
      />
    </main>
  );
}
