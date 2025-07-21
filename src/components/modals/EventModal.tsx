// src/components/modals/EventModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Loader2, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClients } from '@/lib/firebase/services/clients';
import { getUsers } from '@/lib/firebase/services/users';
import { addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/firebase/services/calendarEvents';
import type { CalendarEvent, NewCalendarEvent, Script } from '@/types/calendarEvent';
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
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  const userOptions = users.map(u => ({ value: u.id, label: u.name }));

  const { register, control, handleSubmit, reset } = useForm<NewCalendarEvent>({
    defaultValues: {
      title: '',
      clientId: '',
      responsibleId: '',
      assistantIds: [],
      scripts: [],
      color: '#3788d8',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'scripts',
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([getClients(), getUsers()])
        .then(([clientsData, usersData]) => {
          setClients(clientsData);
          setUsers(usersData);
          
          if (event) {
            reset({
              ...event,
              scripts: event.scripts || [],
            });
          } else {
             reset({
                title: '',
                startDateTime: new Timestamp(new Date().getTime() / 1000, 0),
                endDateTime: new Timestamp(new Date().getTime() / 1000 + 3600, 0),
                clientId: '',
                responsibleId: '',
                assistantIds: [],
                scripts: [],
                color: '#3788d8',
            });
          }
        })
        .catch(() => toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados necessários.' }))
        .finally(() => setLoading(false));
    }
  }, [isOpen, event, reset, toast]);
  

  const onSubmit = async (data: NewCalendarEvent) => {
    setIsSubmitting(true);
    try {
      if (!data.title || !data.startDateTime || !data.endDateTime) {
          throw new Error("Título, início e fim são obrigatórios.");
      }
      
      const eventPayload = {
          ...data,
          scripts: data.scripts?.map(script => ({ ...script, id: script.id || crypto.randomUUID() })) || [],
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{event?.id ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do evento no calendário.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="md:col-span-1 space-y-4">
                 <div>
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" {...register("title")} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDateTime">Início</Label>
                         <Controller
                            name="startDateTime"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="startDateTime"
                                    type="datetime-local"
                                    value={field.value ? toDateTimeLocal(field.value.toDate()) : ''}
                                    onChange={(e) => field.onChange(Timestamp.fromDate(new Date(e.target.value)))}
                                    required
                                />
                            )}
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDateTime">Fim</Label>
                         <Controller
                            name="endDateTime"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="endDateTime"
                                    type="datetime-local"
                                    value={field.value ? toDateTimeLocal(field.value.toDate()) : ''}
                                    onChange={(e) => field.onChange(Timestamp.fromDate(new Date(e.target.value)))}
                                    required
                                />
                            )}
                        />
                    </div>
                </div>
                 <div>
                  <Label htmlFor="clientId">Cliente</Label>
                   <Controller
                      name="clientId"
                      control={control}
                      render={({ field }) => (
                         <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                            <SelectContent>
                                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                      )}
                    />
                </div>
                <div>
                  <Label htmlFor="responsibleId">Responsável</Label>
                    <Controller
                      name="responsibleId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                          <SelectContent>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                </div>
                <div>
                    <Label htmlFor="assistantIds">Auxiliares</Label>
                    <Controller
                        name="assistantIds"
                        control={control}
                        render={({ field }) => (
                            <MultiSelect
                                options={userOptions}
                                selected={field.value || []}
                                onChange={field.onChange as any}
                                placeholder="Selecione auxiliares"
                            />
                        )}
                    />
                </div>
                <div>
                    <Label htmlFor="color">Cor do Evento</Label>
                    <Input id="color" type="color" {...register("color")} className="h-10 p-1" />
                </div>
              </div>

              <div className="md:col-span-1 space-y-4">
                <div className="flex justify-between items-center">
                    <Label>Roteiros</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ id: crypto.randomUUID(), title: '', targetAudience: '', hook: '', development: '', cta: '' })}>
                        <PlusCircle className="mr-2" /> Adicionar Roteiro
                    </Button>
                </div>
                 <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-3 relative">
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div>
                        <Label htmlFor={`scripts.${index}.title`}>Título do Roteiro</Label>
                        <Input id={`scripts.${index}.title`} {...register(`scripts.${index}.title`)} />
                      </div>
                      <div>
                        <Label htmlFor={`scripts.${index}.targetAudience`}>Público-alvo</Label>
                        <Input id={`scripts.${index}.targetAudience`} {...register(`scripts.${index}.targetAudience`)} />
                      </div>
                      <div>
                        <Label htmlFor={`scripts.${index}.hook`}>Gancho (Hook)</Label>
                        <Textarea id={`scripts.${index}.hook`} {...register(`scripts.${index}.hook`)} rows={2} />
                      </div>
                      <div>
                        <Label htmlFor={`scripts.${index}.development`}>Desenvolvimento</Label>
                        <Textarea id={`scripts.${index}.development`} {...register(`scripts.${index}.development`)} rows={4}/>
                      </div>
                      <div>
                        <Label htmlFor={`scripts.${index}.cta`}>CTA (Call to Action)</Label>
                        <Input id={`scripts.${index}.cta`} {...register(`scripts.${index}.cta`)} />
                      </div>
                    </div>
                  ))}
                 </div>
              </div>
            </div>

             <DialogFooter className="pt-4 border-t">
                {event?.id && (
                    <Button type="button" variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isSubmitting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </Button>
                )}
               <div className="flex-grow"></div>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        )}
       
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
