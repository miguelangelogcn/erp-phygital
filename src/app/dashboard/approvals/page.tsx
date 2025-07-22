
// src/app/dashboard/approvals/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTeams } from "@/lib/firebase/services/teams";
import { getTasksForApproval } from "@/lib/firebase/services/tasks";
import { getUsers } from "@/lib/firebase/services/users";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/config";
import { AttachmentViewer } from "@/components/modals/AttachmentViewer";


import type { Team } from "@/types/team";
import type { User } from "@/types/user";
import type { ApprovalTask } from "@/types/task";

export default function ApprovalsPage() {
  const { user: authUser } = useAuth();
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [taskForFeedback, setTaskForFeedback] = useState<ApprovalTask | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string } | null>(null);
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
  
  const handleApprove = async (taskId: string, taskType: "tasks" | "recurringTasks") => {
    if (!authUser) return;
    setIsSubmitting(taskId);

    try {
      const result: any = await reviewTaskCallable({
        taskId,
        taskType,
        decision: "approved",
      });

      toast({
        title: "Sucesso!",
        description: result.data.message,
      });

      // Update state locally instead of refetching
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar",
        description: error.message || "Ocorreu um erro ao processar a aprovação.",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleRejectClick = (task: ApprovalTask) => {
    setTaskForFeedback(task);
    setIsFeedbackModalOpen(true);
  };

  const handleFileClick = (file: { url: string; name: string }) => {
    setSelectedFile(file);
    setIsViewerOpen(true);
  };
  
  const handleFeedbackSuccess = (taskId: string) => {
    setIsFeedbackModalOpen(false);
    // Update state locally instead of refetching
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
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
                            <Button variant="outline" size="sm" disabled={!task.proofs || task.proofs.length === 0}>
                              <FileText className="mr-2 h-4 w-4" />
                              Ver Ficheiros
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <div className="space-y-2">
                                <h4 className="font-medium">Ficheiros de Prova</h4>
                                {task.proofs && task.proofs.length > 0 ? (
                                    <ul className="text-sm list-disc list-inside space-y-1">
                                        {task.proofs.map((proof, index) => (
                                            <li key={index}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFileClick(proof)}
                                                    className="underline flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                                                >
                                                    {proof.name}
                                                </button>
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
                          onClick={() => handleApprove(task.id, task.type)}
                          disabled={isSubmitting === task.id}
                        >
                          {isSubmitting === task.id ? <Loader2 className="animate-spin h-4 w-4"/> : <Check className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRejectClick(task)}
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

      {taskForFeedback && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSubmitSuccess={() => handleFeedbackSuccess(taskForFeedback.id)}
          isSubmitting={!!isSubmitting}
          setIsSubmitting={(submitting) => setIsSubmitting(submitting ? taskForFeedback.id : null)}
          task={taskForFeedback}
        />
      )}

      <AttachmentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        fileUrl={selectedFile?.url || null}
        fileName={selectedFile?.name || null}
      />
    </main>
  );
}
