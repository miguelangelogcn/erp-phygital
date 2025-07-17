// Ficheiro: o seu componente para a aba de Tarefas Recorrentes

"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Definição de tipos para este exemplo
interface RecurringTask {
  id: string;
  title: string;
  description: string;
  dayOfWeek: number; // GARANTIR QUE É NÚMERO
}

interface DayColumn {
  id: number;
  title: string;
  tasks: RecurringTask[];
}

// Estrutura de dados inicial e estática para as colunas
const initialDays: DayColumn[] = [
  { id: 1, title: 'Segunda-feira', tasks: [] },
  { id: 2, title: 'Terça-feira', tasks: [] },
  { id: 3, title: 'Quarta-feira', tasks: [] },
  { id: 4, title: 'Quinta-feira', tasks: [] },
  { id: 5, title: 'Sexta-feira', tasks: [] },
  { id: 6, title: 'Sábado', tasks: [] },
  { id: 7, title: 'Domingo', tasks: [] },
];

export default function RecurringTasks() {
  const [dayColumns, setDayColumns] = useState<DayColumn[]>(initialDays);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'recurringTasks'), (snapshot) => {
      // Cria uma cópia limpa da estrutura inicial a cada atualização
      const newDayColumns: DayColumn[] = JSON.parse(JSON.stringify(initialDays));

      snapshot.docs.forEach((doc) => {
        const task = { id: doc.id, ...doc.data() } as RecurringTask;
        
        // Encontra a coluna correta pelo ID numérico
        const targetColumn = newDayColumns.find(col => col.id === task.dayOfWeek);
        
        if (targetColumn) {
          targetColumn.tasks.push(task);
        }
      });

      setDayColumns(newDayColumns);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-48">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tarefas para a Semana</h2>
        {/* Adicione aqui a lógica para abrir o modal de criação */}
        <Button>Criar Tarefa Recorrente</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {dayColumns.map((column) => (
          <Card key={column.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{column.title} ({column.tasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              {column.tasks.length > 0 ? (
                <div className="space-y-2">
                  {column.tasks.map((task) => (
                    <Card key={task.id} className="p-3">
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}