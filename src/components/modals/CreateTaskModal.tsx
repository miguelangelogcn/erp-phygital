// src/components/modals/CreateTaskModal.tsx
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
import { addTask } from '@/lib/firebase/services/tasks';
import type { SelectOption } from '@/types/common';
import type { NewTask } from '@/types/task';
import TaskForm from '../forms/TaskForm';

interface CreateTaskModalProps {
  children: ReactNode; // The trigger button
}

export function CreateTaskModal({ children }: CreateTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);
  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Fetch data only when the modal is about to open
    if (isOpen && userData) {
      setIsLoadingData(true);
      const fetchData = async () => {
        try {
          const [usersData, clientsData] = await Promise.all([
            getUsers(),
            getClients(),
          ]);

          let filteredUsers = usersData;
          if (userData.isLeader && userData.teamMemberIds) {
            // Leader can assign to team members
            filteredUsers = usersData.filter(u => userData.teamMemberIds!.includes(u.id));
          } else {
            // Employee can only assign to themselves
            filteredUsers = usersData.filter(u => u.id === userData.id);
          }
          
          setUserOptions(filteredUsers.map((u) => ({ value: u.id, label: u.name })));
          setClients(clientsData.map((c) => ({ value: c.id, label: c.name })));

        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar dados',
            description: 'Não foi possível buscar usuários ou clientes.',
          });
          setIsOpen(false); // Close modal on data fetch error
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, toast, userData]);

  const handleSaveTask = async (data: NewTask) => {
    setIsSubmitting(true);
    try {
      const newTaskData: NewTask = { 
        status: 'todo', 
        ...data,
        responsibleId: data.responsibleId || userData?.id || "",
      };
      await addTask(newTaskData);
      toast({ title: 'Sucesso', description: 'Nova tarefa criada.' });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a tarefa.',
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
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da tarefa abaixo.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <TaskForm
            users={userOptions}
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
