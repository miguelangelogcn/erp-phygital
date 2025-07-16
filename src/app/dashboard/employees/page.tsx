
"use client";

import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getUsers } from "@/lib/firebase/services/users";
import type { User } from "@/types/user";
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
];

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getUsers();
      setUsers(usersData);
      setError(null);
    } catch (err) {
      setError("Falha ao buscar funcionários. Tente novamente mais tarde.");
      toast({
        variant: "destructive",
        title: "Erro ao buscar funcionários",
        description: "Ocorreu um erro ao carregar a lista de funcionários.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

    // Collect permissions from checkboxes
    const permissions = ALL_PERMISSIONS.map(p => p.id).filter(id => formData.has(id));
    data.permissions = permissions;


    try {
      if (editingUser) {
        // Update existing user
        const result: any = await updateUserCallable({
          uid: editingUser.id,
          name: data.name,
          role: data.role,
          permissions: data.permissions
        });
        toast({
          title: "Sucesso!",
          description: result.data.message,
        });
      } else {
        // Create new user, including permissions
        const result: any = await createUserCallable({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          permissions: data.permissions
        });
        toast({
          title: "Sucesso!",
          description: result.data.message,
        });
      }

      setIsModalOpen(false);
      setEditingUser(null);
      await fetchUsers(); // Re-fetch users to update the table
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
      await fetchUsers(); // Refresh the user list
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

  return (
    <main className="p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Funcionários</CardTitle>
            <CardDescription>
              Visualize, adicione, edite e exclua os funcionários da sua empresa.
            </CardDescription>
          </div>
          <Button onClick={handleOpenModalForCreate}>
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
                        <TableCell>{user.role}</TableCell>
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
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nome Completo"
                  className="col-span-3"
                  defaultValue={editingUser?.name || ""}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@empresa.com"
                  className="col-span-3"
                  defaultValue={editingUser?.email || ""}
                  disabled={!!editingUser} // Desabilita edição de email
                  required
                />
              </div>
              {!editingUser && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Senha Provisória"
                    className="col-span-3"
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Cargo
                </Label>
                <Select name="role" defaultValue={editingUser?.role} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Permissões</Label>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
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
