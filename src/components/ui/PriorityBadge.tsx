// src/components/ui/PriorityBadge.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';

type Priority = 'alta' | 'media' | 'baixa' | undefined;

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (!priority) {
    return null;
  }

  const priorityConfig = {
    alta: { variant: 'destructive' as const, label: 'Alta' },
    media: { variant: 'secondary' as const, label: 'Média' },
    baixa: { variant: 'outline' as const, label: 'Baixa' },
  };

  const config = priorityConfig[priority];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
