// src/app/dashboard/roles/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getRoles, addRole, updateRole, deleteRole } from "@/lib/firebase/services/roles";
import type { Role, NewRole } from "@/types/role";
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
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Pencil, Trash2, PlusCircle } from "lucide-react";

const ALL_PERMISSIONS = [
  { id: "manage_employees", label: "Gerenciar Funcionários" },
  { id: "manage_clients", label: "Gerenciar Clientes" },
  { id: "manage_tasks", label: "Gerenciar Tarefas" },
  { id: "view_reports", label: "Ver Relatórios" },
  { id: "manage_roles", label: "Gerenciar Cargos" },
  { id: "manage_teams", label: "Gerenciar Equipes" },
  { id: "manage_calendar", label: "Gerenciar Calendário" },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const { toast } = useToast();

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await getRoles();
      setRoles(rolesData);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar cargos",
        description: "Ocorreu um erro ao carregar a lista de cargos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenModal = (role: Role | null = null) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const permissions = ALL_PERMISSIONS.map((p) => p.id).filter((id) => formData.has(id));
    
    const roleData: NewRole = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      permissions: permissions,
    };

    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleData);
        toast({ title: "Sucesso!", description: "Cargo atualizado." });
      } else {
        await addRole(roleData);
        toast({ title: "Sucesso!", description: "Novo cargo criado." });
      }
      setIsModalOpen(false);
      setEditingRole(null);
      await fetchRoles();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: `Erro ao ${editingRole ? "atualizar" : "salvar"} cargo`,
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    setIsSubmitting(true);
    try {
      await deleteRole(deletingRole.id);
      toast({ title: "Sucesso!", description: "Cargo excluído." });
      await fetchRoles();
    } catch (err: any) {
        toast({ variant: "destructive", title: "Erro ao excluir", description: err.message, });
    } finally {
        setIsSubmitting(false);
        setDeletingRole(null);
    }
  };

  return (
    <main className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Cargos</CardTitle>
            <CardDescription>Crie, edite e defina permissões para os cargos da sua empresa.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} variant="gradient">
            <PlusCircle className="mr-2" />
            Adicionar Cargo
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(role)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingRole(role)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">Nenhum cargo encontrado.</TableCell>
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
            <DialogTitle>{editingRole ? "Editar Cargo" : "Adicionar Novo Cargo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Nome do Cargo</Label>
                <Input id="name" name="name" defaultValue={editingRole?.name} required />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" defaultValue={editingRole?.description} />
              </div>
              <div>
                <Label>Permissões Base</Label>
                <div className="grid grid-cols-2 gap-2 p-2 border rounded-md mt-2">
                  {ALL_PERMISSIONS.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        name={permission.id}
                        defaultChecked={editingRole?.permissions.includes(permission.id)}
                      />
                      <Label htmlFor={permission.id} className="font-normal">{permission.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita. Isto irá excluir o cargo permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingRole(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRole} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Exclusão
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
