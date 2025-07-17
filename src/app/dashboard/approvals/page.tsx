// src/app/dashboard/approvals/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTeams } from "@/lib/firebase/services/teams";
import { getTasksForApproval } from "@/lib/firebase/services/tasks";
import { getUsers } from "@/lib/firebase/services/users";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/config";

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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { ApprovalTask } from "@/types/task";

export default function ApprovalsPage() {
  const { user: authUser, userData } = useAuth();
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const { toast } = useToast();

  const functions = getFunctions(auth.app, "southamerica-east1");
  const reviewTaskCallable = httpsCallable(functions, "reviewTask");

  const fetchData = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    
    try {
      const allTeams = await getTeams();
      const myTeam = allTeams.find((team) => team.leaderId === authUser.uid);

      if (myTeam) {
        setIsLeader(true);
        // Ensure the leader's own submissions are included.
        const [pendingTasks, allUsers] = await Promise.all([
          getTasksForApproval(myTeam.memberIds, authUser.uid),
          getUsers()
        ]);
        setTasks(pendingTasks);
        setUsers(allUsers);
      } else {
        setIsLeader(false);
      }
    } catch (error) {
      console.error("Error fetching approval data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar dados",
        description: "Não foi possível carregar as aprovações pendentes.",
      });
    } finally {
      setLoading(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser) {
      fetchData();
    }
  }, [authUser, fetchData]);

  const handleReview = async (
    taskId: string,
    taskType: "tasks" | "recurringTasks",
    decision: "approved" | "rejected"
  ) => {
    if (!authUser) return;
    setIsSubmitting(taskId);

    try {
      const result: any = await reviewTaskCallable({
        taskId,
        taskType,
        decision,
      });

      toast({
        title: "Sucesso!",
        description: result.data.message,
      });

      // Optimistically remove the task from the list
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao processar",
        description:
          error.message || "Ocorreu um erro ao processar a sua decisão.",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name || "Desconhecido";
    
  if (loading) {
    return (
      <main className="p-4 md:p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </main>
    );
  }

  if (!isLeader) {
    return (
      <main className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você não é líder de nenhuma equipe.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Aprovações Pendentes</CardTitle>
          <CardDescription>
            Reveja as tarefas submetidas pelos membros da sua equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Submetido por</TableHead>
                  <TableHead>Provas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{getUserName(task.responsibleId)}</TableCell>
                       <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Ver Ficheiros ({task.proofs?.length || 0})
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <div className="space-y-2">
                                <h4 className="font-medium">Ficheiros de Prova</h4>
                                {task.proofs && task.proofs.length > 0 ? (
                                    <ul className="text-sm list-disc list-inside">
                                        {task.proofs.map((proof, index) => (
                                            <li key={index}>
                                                <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                    {proof.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Nenhum ficheiro.</p>
                                )}
                                 {task.approvalNotes && (
                                    <div className="pt-2 border-t mt-2">
                                        <h4 className="font-medium">Notas</h4>
                                        <p className="text-sm text-muted-foreground">{task.approvalNotes}</p>
                                    </div>
                                )}
                            </div>
                          </PopoverContent>
                        </Popover>
                       </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReview(task.id, task.type, "approved")}
                          disabled={isSubmitting === task.id}
                        >
                          {isSubmitting === task.id ? <Loader2 className="animate-spin h-4 w-4"/> : <Check className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReview(task.id, task.type, "rejected")}
                          disabled={isSubmitting === task.id}
                        >
                          {isSubmitting === task.id ? <Loader2 className="animate-spin h-4 w-4"/> : <X className="h-4 w-4 text-red-600" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Nenhuma tarefa pendente de aprovação.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
