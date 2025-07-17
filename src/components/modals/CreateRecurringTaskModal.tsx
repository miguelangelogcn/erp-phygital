// src/components/modals/CreateRecurringTaskModal.tsx
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/lib/firebase/services/users';
import { getClients } from '@/lib/firebase/services/clients';
import { addRecurringTask } from '@/lib/firebase/services/recurringTasks';
import type { SelectOption } from '@/types/common';
import type { NewRecurringTask } from '@/types/recurringTask';
import RecurringTaskForm from '../forms/RecurringTaskForm';

interface CreateRecurringTaskModalProps {
  children: ReactNode;
}

export function CreateRecurringTaskModal({ children }: CreateRecurringTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoadingData(true);
      const fetchData = async () => {
        try {
          const [usersData, clientsData] = await Promise.all([
            getUsers(),
            getClients(),
          ]);
          setUsers(usersData.map((u) => ({ value: u.id, label: u.name })));
          setClients(clientsData.map((c) => ({ value: c.id, label: c.name })));
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar dados',
          });
          setIsOpen(false);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, toast]);

  const handleSaveTask = async (data: NewRecurringTask) => {
    setIsSubmitting(true);
    try {
      await addRecurringTask(data);
      toast({ title: 'Sucesso', description: 'Nova tarefa recorrente criada.' });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Tarefa Recorrente</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da tarefa que se repetirá semanalmente.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <RecurringTaskForm
            users={users}
            clients={clients}
            onSave={handleSaveTask}
            onCancel={() => setIsOpen(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
