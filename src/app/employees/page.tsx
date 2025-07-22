
"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getUsers } from "@/lib/firebase/services/users";
import { getRoles } from "@/lib/firebase/services/roles";
import { getTeams } from "@/lib/firebase/services/teams";

import type { User } from "@/types/user";
import type { Role } from "@/types/role";
import type { Team } from "@/types/team";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase/config";

const ALL_PERMISSIONS = [
  { id: "manage_employees", label: "Gerenciar Funcionários" },
  { id: "manage_clients", label: "Gerenciar Clientes" },
  { id: "manage_tasks", label: "Gerenciar Tarefas" },
  { id: "view_reports", label: "Ver Relatórios" },
  { id: "manage_roles", label: "Gerenciar Cargos" },
  { id: "manage_teams", label: "Gerenciar Equipes" },
  { id: "manage_calendar", label: "Gerenciar Calendário" },
  { id: "manage_mentors", label: "Gerenciar Mentores de IA" },
];

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const functions = getFunctions(auth.app, "southamerica-east1");
  const createUserCallable = httpsCallable(functions, "createUser");
  const updateUserCallable = httpsCallable(functions, "updateUser");
  const deleteUserCallable = httpsCallable(functions, "deleteUser");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData, teamsData] = await Promise.all([
          getUsers(),
          getRoles(),
          getTeams()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setTeams(teamsData);
      setError(null);
    } catch (err) {
      setError("Falha ao buscar dados. Tente novamente mais tarde.");
      toast({
        variant: "destructive",
        title: "Erro ao buscar dados",
        description: "Ocorreu um erro ao carregar os dados necessários.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModalForCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleOpenAlertForDelete = (user: User) => {
    setDeletingUser(user);
    setIsAlertOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());

    const permissions = ALL_PERMISSIONS.map(p => p.id).filter(id => formData.has(id));
    
    try {
      if (editingUser) {
        // Lógica de Atualização
        const updatePayload: any = {
            uid: editingUser.id,
            name: data.name,
            roleId: data.roleId,
            teamId: data.teamId,
            permissions: permissions
        };
        if (updatePayload.teamId === 'none') {
            updatePayload.teamId = null;
        }

        const result: any = await updateUserCallable(updatePayload);
        toast({
          title: "Sucesso!",
          description: result.data.message,
        });
      } else {
        // Lógica de Criação
        const createPayload: any = {
            name: data.name,
            email: data.email,
            password: data.password,
            roleId: data.roleId,
            teamId: data.teamId,
            permissions: permissions
        };
        if (createPayload.teamId === 'none') {
            createPayload.teamId = null;
        }

        const result: any = await createUserCallable(createPayload);
        toast({
          title: "Sucesso!",
          description: result.data.message,
        });
      }

      setIsModalOpen(false);
      setEditingUser(null);
      await fetchData(); 
    } catch (err: any) {
      console.error("Erro ao chamar a função:", err);
      toast({
        variant: "destructive",
        title: `Erro ao ${editingUser ? 'atualizar' : 'adicionar'} funcionário`,
        description: err.message || "Ocorreu um erro desconhecido.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);

    try {
      const result: any = await deleteUserCallable({ uid: deletingUser.id });
       toast({
        title: "Sucesso!",
        description: result.data.message,
      });
      await fetchData();
    } catch (err: any) {
      console.error("Erro ao excluir o funcionário:", err);
      toast({
        variant: "destructive",
        title: "Erro ao excluir funcionário",
        description: err.message || "Ocorreu um erro desconhecido.",
      });
    } finally {
      setIsSubmitting(false);
      setIsAlertOpen(false);
      setDeletingUser(null);
    }
  };

  const getRoleName = (roleId?: string) => roles.find(r => r.id === roleId)?.name || 'N/A';

  return (
    <main className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Funcionários</CardTitle>
            <CardDescription>
              Visualize, adicione, edite e exclua os funcionários da sua empresa.
            </CardDescription>
          </div>
          <Button onClick={handleOpenModalForCreate} variant="gradient">
            Adicionar Funcionário
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">{error}</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleName(user.roleId)}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModalForEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAlertForDelete(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nenhum funcionário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Funcionário" : "Adicionar Novo Funcionário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize os dados e permissões do funcionário."
                : "Preencha os dados abaixo para cadastrar um novo funcionário."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nome</Label>
                <Input id="name" name="name" placeholder="Nome Completo" className="col-span-3" defaultValue={editingUser?.name || ""} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" name="email" type="email" placeholder="email@empresa.com" className="col-span-3" defaultValue={editingUser?.email || ""} disabled={!!editingUser} required />
              </div>
              {!editingUser && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="Senha Provisória" className="col-span-3" required />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roleId" className="text-right">Cargo</Label>
                <Select name="roleId" defaultValue={editingUser?.roleId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teamId" className="text-right">Equipe</Label>
                <Select name="teamId" defaultValue={editingUser?.teamId || 'none'}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="none">Nenhuma</SelectItem>
                     {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Permissões Individuais</Label>
                  <div className="col-span-3 grid gap-2">
                    {ALL_PERMISSIONS.map((permission) => (
                       <div key={permission.id} className="flex items-center space-x-2">
                         <Checkbox
                            id={permission.id}
                            name={permission.id}
                            defaultChecked={editingUser?.permissions?.includes(permission.id)}
                         />
                         <Label htmlFor={permission.id} className="font-normal">{permission.label}</Label>
                       </div>
                    ))}
                  </div>
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá excluir
              permanentemente o funcionário e todos os seus dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
