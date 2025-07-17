// Ficheiro: src/app/dashboard/calendar/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { EventInput } from '@fullcalendar/core';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'calendarEvents'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        // Adiciona validação para garantir que os timestamps existem antes de converter
        const start = data.startDateTime ? data.startDateTime.toDate() : null;
        const end = data.endDateTime ? data.endDateTime.toDate() : null;

        if (start && end) {
            return {
              id: doc.id,
              title: data.title,
              start: start,
              end: end,
              allDay: false, // Assumindo que os eventos têm hora
              backgroundColor: data.color || '#3788d8', // Cor padrão
              borderColor: data.color || '#3788d8',
            };
        }
        return null;
      }).filter(event => event !== null) as EventInput[];
      setEvents(fetchedEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDateClick = (arg: any) => {
    // Lógica para abrir um modal de criação de novo evento
    alert('Criar novo evento no dia: ' + arg.dateStr);
  };

  const handleEventClick = (arg: any) => {
    // Lógica para abrir um modal de edição do evento clicado
    alert('Editar evento: ' + arg.event.title);
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
      <h1 className="text-2xl font-bold mb-6">Calendário de Gravações</h1>
      <div className="bg-card p-4 rounded-lg shadow text-foreground">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          weekends={true}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          locale="pt-br" // Adiciona localização para português do Brasil
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
          height="auto" // Ajusta a altura automaticamente
        />
      </div>
    </main>
  );
}
