// src/components/tasks/AgendaItemCard.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Repeat, Video, Clock } from 'lucide-react';

export type AgendaItem = {
    id: string;
    title: string;
    type: 'task' | 'recurring' | 'event';
    startTime?: string | null;
    endTime?: string | null;
    status?: string;
    clientName?: string;
};

interface AgendaItemCardProps {
  item: AgendaItem;
  onClick?: () => void;
}

const typeDetails = {
  task: { icon: ListTodo, label: 'Tarefa Pontual', color: 'bg-blue-500' },
  recurring: { icon: Repeat, label: 'Tarefa Recorrente', color: 'bg-purple-500' },
  event: { icon: Video, label: 'Gravação', color: 'bg-green-500' },
};

export function AgendaItemCard({ item, onClick }: AgendaItemCardProps) {
  const details = typeDetails[item.type];
  const Icon = details.icon;

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '';
    try {
        const [hours, minutes] = time.split(':');
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } catch {
        return '';
    }
  }

  const timeDisplay = item.startTime ? `${formatTime(item.startTime)}${item.endTime ? ` - ${formatTime(item.endTime)}` : ''}` : null;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${details.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.clientName || details.label}</p>
                </div>
            </div>
            {timeDisplay && (
                <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {timeDisplay}
                </Badge>
            )}
        </div>
      </CardHeader>
      {item.status && (
        <CardContent className="p-4 pt-2">
            <Badge variant="secondary">{item.status}</Badge>
        </CardContent>
      )}
    </Card>
  );
}
