// src/app/dashboard/teams/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getTeams, addTeam, updateTeam, deleteTeam } from "@/lib/firebase/services/teams";
import { getUsers } from "@/lib/firebase/services/users";
import type { Team, NewTeam } from "@/types/team";
import type { User } from "@/types/user";
import type { SelectOption } from "@/types/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Loader2, Pencil, Trash2, PlusCircle } from "lucide-react";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const { toast } = useToast();

  const userOptions: SelectOption[] = users.map(u => ({ value: u.id, label: u.name }));

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsData, usersData] = await Promise.all([getTeams(), getUsers()]);
      setTeams(teamsData);
      setUsers(usersData);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar dados",
        description: "Ocorreu um erro ao carregar equipes ou funcionários.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (team: Team | null = null) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // RHF would be better here, but for simplicity we use FormData
    const formData = new FormData(e.currentTarget);
    const memberIds = JSON.parse(formData.get("memberIds") as string || "[]");

    const teamData: NewTeam = {
      name: formData.get("name") as string,
      leaderId: formData.get("leaderId") as string,
      memberIds: memberIds,
    };

    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, teamData);
        toast({ title: "Sucesso!", description: "Equipe atualizada." });
      } else {
        await addTeam(teamData);
        toast({ title: "Sucesso!", description: "Nova equipe criada." });
      }
      setIsModalOpen(false);
      setEditingTeam(null);
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: `Erro ao ${editingTeam ? "atualizar" : "salvar"} equipe`,
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    setIsSubmitting(true);
    try {
      await deleteTeam(deletingTeam.id);
      toast({ title: "Sucesso!", description: "Equipe excluída." });
      await fetchData();
    } catch (err: any) {
        toast({ variant: "destructive", title: "Erro ao excluir", description: err.message });
    } finally {
        setIsSubmitting(false);
        setDeletingTeam(null);
    }
  };

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Desconhecido';

  return (
    <main className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Equipes</CardTitle>
            <CardDescription>Crie e organize as equipes de trabalho.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2" />
            Adicionar Equipe
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Equipe</TableHead>
                    <TableHead>Líder</TableHead>
                    <TableHead>Membros</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length > 0 ? (
                    teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{getUserName(team.leaderId)}</TableCell>
                        <TableCell>{team.memberIds.map(getUserName).join(', ')}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(team)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingTeam(team)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Nenhuma equipe encontrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Editar Equipe" : "Adicionar Nova Equipe"}</DialogTitle>
          </DialogHeader>
          <TeamForm
            key={editingTeam?.id || 'new'}
            team={editingTeam}
            userOptions={userOptions}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsModalOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingTeam} onOpenChange={() => setDeletingTeam(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita. Isto irá excluir a equipe permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingTeam(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTeam} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Exclusão
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// Sub-componente de formulário para evitar re-renderizações complexas
function TeamForm({ team, userOptions, onSubmit, onCancel, isSubmitting }: {
    team: Team | null;
    userOptions: SelectOption[];
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}) {
    const [selectedMembers, setSelectedMembers] = useState(team?.memberIds || []);

    return (
        <form onSubmit={onSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Nome da Equipe</Label>
                <Input id="name" name="name" defaultValue={team?.name} required />
              </div>
              <div>
                <Label>Líder da Equipe</Label>
                <Select name="leaderId" defaultValue={team?.leaderId} required>
                    <SelectTrigger><SelectValue placeholder="Selecione um líder" /></SelectTrigger>
                    <SelectContent>
                        {userOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Membros da Equipe</Label>
                <MultiSelect
                    options={userOptions}
                    selected={selectedMembers}
                    onChange={setSelectedMembers as any}
                    placeholder="Selecione os membros"
                />
                {/* Hidden input to pass memberIds to FormData */}
                <input type="hidden" name="memberIds" value={JSON.stringify(selectedMembers)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
    )
}
