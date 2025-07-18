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
import type { CalendarEvent } from '@/types/calendarEvent';
import { EventModal } from '@/components/modals/EventModal';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);

  useEffect(() => {
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
          backgroundColor: data.color || '#3788d8',
          borderColor: data.color || '#3788d8',
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
    setSelectedEvent({ startDateTime, endDateTime });
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const eventData = arg.event.extendedProps as CalendarEvent;
    setSelectedEvent(eventData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }
  
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
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
      />
    </main>
  );
}
