// src/components/modals/EventModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClients } from '@/lib/firebase/services/clients';
import { getUsers } from '@/lib/firebase/services/users';
import { addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/firebase/services/calendarEvents';
import type { CalendarEvent, NewCalendarEvent } from '@/types/calendarEvent';
import type { Client } from '@/types/client';
import type { User } from '@/types/user';
import { Timestamp } from 'firebase/firestore';
import { MultiSelect } from '../ui/multi-select';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Partial<CalendarEvent> | null;
  onEventChange?: () => void;
}

// Helper to format Date to 'yyyy-MM-ddThh:mm'
const toDateTimeLocal = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function EventModal({ isOpen, onClose, event, onEventChange }: EventModalProps) {
  const [formData, setFormData] = useState<Partial<NewCalendarEvent>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  const userOptions = users.map(u => ({ value: u.id, label: u.name }));

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([getClients(), getUsers()])
        .then(([clientsData, usersData]) => {
          setClients(clientsData);
          setUsers(usersData);
          
          if (event) {
            setFormData({
              title: event.title || '',
              startDateTime: event.startDateTime,
              endDateTime: event.endDateTime,
              clientId: event.clientId || '',
              responsibleId: event.responsibleId || '',
              assistantIds: event.assistantIds || [],
              scripts: event.scripts || '',
              color: event.color || '#3788d8',
            });
          } else {
             setFormData({ color: '#3788d8', assistantIds: [] });
          }
        })
        .catch(() => toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados necessários.' }))
        .finally(() => setLoading(false));
    } else {
        // Reset form when modal closes
        setFormData({});
    }
  }, [isOpen, event, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (value) {
          const date = new Date(value);
          setFormData(prev => ({...prev, [name]: Timestamp.fromDate(date)}));
      }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!formData.title || !formData.startDateTime || !formData.endDateTime) {
          throw new Error("Título, início e fim são obrigatórios.");
      }

      const eventPayload: NewCalendarEvent = {
        title: formData.title,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        clientId: formData.clientId,
        responsibleId: formData.responsibleId,
        assistantIds: formData.assistantIds || [],
        scripts: formData.scripts,
        color: formData.color,
      };

      if (event?.id) {
        await updateCalendarEvent(event.id, eventPayload);
        toast({ title: 'Sucesso', description: 'Evento atualizado.' });
      } else {
        await addCalendarEvent(eventPayload);
        toast({ title: 'Sucesso', description: 'Evento criado.' });
      }
      onEventChange?.();
      onClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
      if (!event?.id) return;
      setIsSubmitting(true);
      try {
          await deleteCalendarEvent(event.id);
          toast({ title: 'Sucesso', description: 'Evento excluído.' });
          onEventChange?.();
          onClose();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
      } finally {
          setIsSubmitting(false);
          setIsAlertOpen(false);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do evento no calendário.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título</Label>
              <Input id="title" name="title" value={formData.title || ''} onChange={handleChange} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDateTime" className="text-right">Início</Label>
                <Input
                    id="startDateTime"
                    name="startDateTime"
                    type="datetime-local"
                    value={formData.startDateTime ? toDateTimeLocal(formData.startDateTime.toDate()) : ''}
                    onChange={handleDateChange}
                    className="col-span-3"
                    required
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDateTime" className="text-right">Fim</Label>
                <Input
                    id="endDateTime"
                    name="endDateTime"
                    type="datetime-local"
                    value={formData.endDateTime ? toDateTimeLocal(formData.endDateTime.toDate()) : ''}
                    onChange={handleDateChange}
                    className="col-span-3"
                    required
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientId" className="text-right">Cliente</Label>
               <Select name="clientId" value={formData.clientId} onValueChange={(value) => handleSelectChange('clientId', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="responsibleId" className="text-right">Responsável</Label>
                <Select name="responsibleId" value={formData.responsibleId} onValueChange={(value) => handleSelectChange('responsibleId', value)}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                  <SelectContent>
                     {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assistantIds" className="text-right">Auxiliares</Label>
                <div className="col-span-3">
                   <MultiSelect
                        options={userOptions}
                        selected={formData.assistantIds || []}
                        onChange={(selected) => handleSelectChange('assistantIds', selected)}
                        placeholder="Selecione auxiliares"
                    />
                </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">Cor</Label>
                <Input id="color" name="color" type="color" value={formData.color || '#3788d8'} onChange={handleChange} className="col-span-3 h-10 p-1" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="scripts" className="text-right pt-2">Roteiros</Label>
              <Textarea id="scripts" name="scripts" value={formData.scripts || ''} onChange={handleChange} className="col-span-3" placeholder="Cole aqui os roteiros ou notas..." />
            </div>
          </div>
        )}
        <DialogFooter>
            {event?.id && (
                <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isSubmitting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </Button>
            )}
           <div className="flex-grow"></div>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || loading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>

         <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita. Isto irá excluir o evento permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Confirmar Exclusão</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

      </DialogContent>
    </Dialog>
  );
}

  