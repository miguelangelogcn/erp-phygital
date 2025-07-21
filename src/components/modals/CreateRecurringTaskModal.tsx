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
import { useAuth } from '@/context/AuthContext';
import { getUsers } from '@/lib/firebase/services/users';
import { getClients } from '@/lib/firebase/services/clients';
import { addRecurringTask } from '@/lib/firebase/services/recurringTasks';
import type { SelectOption } from '@/types/common';
import type { NewRecurringTask } from '@/types/recurringTask';
import RecurringTaskForm from '../forms/RecurringTaskForm';
import type { User } from '@/types/user';

interface CreateRecurringTaskModalProps {
  children: ReactNode;
  onTaskCreated?: () => void;
}

export function CreateRecurringTaskModal({ children, onTaskCreated }: CreateRecurringTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responsibleOptions, setResponsibleOptions] = useState<SelectOption[]>([]);
  const [allUserOptions, setAllUserOptions] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userData) {
      setIsLoadingData(true);
      const fetchData = async () => {
        try {
          const [usersData, clientsData] = await Promise.all([
            getUsers(),
            getClients(),
          ]);

          const allUsersAsOptions = usersData.map((u: User) => ({ value: u.id, label: u.name }));
          setAllUserOptions(allUsersAsOptions);

          let filteredResponsibles: User[];
          if (userData.isLeader && userData.teamMemberIds) {
            // Se for líder, a lista de responsáveis inclui todos os membros da equipe.
            filteredResponsibles = usersData.filter((u: User) => userData.teamMemberIds!.includes(u.id));
          } else {
            // Se não for líder, a lista contém apenas o próprio usuário.
            filteredResponsibles = usersData.filter((u: User) => u.id === userData.id);
          }

          setResponsibleOptions(filteredResponsibles.map((u: User) => ({ value: u.id, label: u.name })));
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
  }, [isOpen, toast, userData]);

  const handleSaveTask = async (data: NewRecurringTask) => {
    setIsSubmitting(true);
    try {
      const newTaskData: NewRecurringTask = {
        ...data,
        responsibleId: data.responsibleId || userData?.id || "",
        isCompleted: false, // Default value on creation
      };
      await addRecurringTask(newTaskData);
      toast({ title: 'Sucesso', description: 'Nova tarefa recorrente criada.' });
      setIsOpen(false);
      onTaskCreated?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a tarefa recorrente.',
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
            responsibleOptions={responsibleOptions}
            allUserOptions={allUserOptions}
            clients={clients}
            onSave={handleSaveTask}
            onCancel={() => setIsOpen(false)}
            isSubmitting={isSubmitting}
            currentUserIsLeader={userData?.isLeader || false}
            currentUserId={userData?.id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
