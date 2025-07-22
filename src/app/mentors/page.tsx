// src/app/dashboard/mentors/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMentors, addMentor, deleteMentor } from "@/lib/firebase/services/aiMentors";
import type { AiMentor, NewAiMentor } from "@/types/aiMentor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, BrainCircuit, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';

export default function MentorsPage() {
  const [mentors, setMentors] = useState<AiMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingMentor, setDeletingMentor] = useState<AiMentor | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();
  const { userData } = useAuth();
  
  const canManageMentors = userData?.permissions?.includes("manage_mentors");

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const mentorsData = await getMentors();
      setMentors(mentorsData);
      setError(null);
    } catch (err) {
      setError("Falha ao buscar mentores. Tente novamente mais tarde.");
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao buscar mentores",
        description: "Ocorreu um erro ao carregar a lista de mentores de IA.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newMentorData: NewAiMentor = {
      name: formData.get('name') as string,
      specialty: formData.get('specialty') as string,
      avatarUrl: formData.get('avatarUrl') as string,
      convaiCharacterId: formData.get('convaiCharacterId') as string,
    };

    try {
      await addMentor(newMentorData);
      toast({
        title: "Sucesso!",
        description: "Novo mentor de IA cadastrado com sucesso.",
      });
      setIsModalOpen(false);
      await fetchMentors();
    } catch (err) {
      console.error("Erro ao adicionar mentor:", err);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar mentor",
        description: "Ocorreu um erro ao tentar salvar o novo mentor.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, mentor: AiMentor) => {
    e.stopPropagation();
    e.preventDefault();
    setDeletingMentor(mentor);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMentor) return;
    setIsSubmitting(true);
    try {
      await deleteMentor(deletingMentor.id);
      toast({ title: "Sucesso!", description: "Mentor excluído." });
      await fetchMentors();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: err.message });
    } finally {
      setIsSubmitting(false);
      setIsAlertOpen(false);
      setDeletingMentor(null);
    }
  };


  return (
    <>
    <main className="p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Galeria de Mentores de IA</CardTitle>
                <CardDescription>
                  Converse, aprenda e tire dúvidas com nossos especialistas virtuais.
                </CardDescription>
            </div>
            {canManageMentors && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="gradient">
                            <PlusCircle className="mr-2" />
                            Adicionar Mentor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Mentor de IA</DialogTitle>
                            <DialogDescription>
                                Preencha os dados abaixo para adicionar um novo mentor.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} id="add-mentor-form">
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Nome</Label>
                                    <Input id="name" name="name" placeholder="Nome do Mentor" className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="specialty" className="text-right">Especialidade</Label>
                                    <Input id="specialty" name="specialty" placeholder="Ex: Especialista em Marketing" className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="avatarUrl" className="text-right">URL do Avatar</Label>
                                    <Input id="avatarUrl" name="avatarUrl" placeholder="https://example.com/avatar.png" className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="convaiCharacterId" className="text-right">ID do Convai</Label>
                                    <Input id="convaiCharacterId" name="convaiCharacterId" placeholder="ID do personagem no Convai" className="col-span-3" required />
                                </div>
                            </div>
                        </form>
                         <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" form="add-mentor-form" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mentors.length > 0 ? (
                mentors.map((mentor) => (
                    <Card asChild key={mentor.id} className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
                        <Link href={`/mentors/${mentor.id}`}>
                            <CardHeader>
                                <CardTitle className="text-lg">{mentor.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col items-center text-center">
                                <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-2 border-primary">
                                <Image src={mentor.avatarUrl} alt={mentor.name} fill style={{ objectFit: 'cover' }} />
                                </div>
                                <p className="text-sm text-muted-foreground">{mentor.specialty}</p>
                            </CardContent>
                             {canManageMentors && (
                                <CardFooter className="p-2 border-t justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); e.preventDefault(); /* Lógica de Edição aqui */}}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, mentor)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Excluir</span>
                                    </Button>
                                </CardFooter>
                             )}
                        </Link>
                    </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p>Nenhum mentor de IA encontrado.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isto irá excluir o mentor
                permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting} onClick={() => setDeletingMentor(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
