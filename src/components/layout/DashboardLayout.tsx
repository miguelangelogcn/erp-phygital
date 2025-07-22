// src/components/layout/DashboardLayout.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Briefcase, Users, ListTodo, Shield, UserSquare, CheckSquare, Calendar, LogOut, BrainCircuit } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NotificationsBell } from "../notifications/NotificationsBell";

export default function DashboardLayoutComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const canManageEmployees = userData?.permissions?.includes("manage_employees");
  const canManageRoles = userData?.permissions?.includes("manage_roles");
  const canManageTeams = userData?.permissions?.includes("manage_teams");
  const canManageCalendar = userData?.permissions?.includes("manage_calendar");
  const canManageMentors = userData?.permissions?.includes("manage_mentors");
  const isLeader = userData?.isLeader || false;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message || "Não foi possível completar o logout.",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-between">
            <SidebarTrigger />
             <div className="pr-2">
                <NotificationsBell />
             </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarGroup>
                <SidebarGroupLabel>GESTÃO</SidebarGroupLabel>
                {canManageEmployees && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/employees">
                      <SidebarMenuButton>
                        <Users className="text-primary" />
                        Gerenciar Funcionários
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )}
                {canManageRoles && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/roles">
                      <SidebarMenuButton>
                        <Shield className="text-primary" />
                        Gerenciar Cargos
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )}
                 {canManageTeams && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/teams">
                      <SidebarMenuButton>
                        <UserSquare className="text-primary" />
                        Gerenciar Equipes
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )}
                {isLeader && (
                   <SidebarMenuItem>
                    <Link href="/dashboard/approvals">
                      <SidebarMenuButton>
                        <CheckSquare className="text-primary" />
                        Aprovações Pendentes
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )}
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>OPERAÇÕES</SidebarGroupLabel>
                 <SidebarMenuItem>
                    <Link href="/dashboard/clients">
                      <SidebarMenuButton>
                        <Briefcase className="text-primary" />
                        Gerenciar Clientes
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/dashboard/tasks">
                      <SidebarMenuButton>
                        <ListTodo className="text-primary" />
                        Painel de Tarefas
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                   {canManageCalendar && (
                     <SidebarMenuItem>
                        <Link href="/dashboard/calendar">
                          <SidebarMenuButton>
                            <Calendar className="text-primary" />
                            Calendário de Gravações
                          </SidebarMenuButton>
                        </Link>
                     </SidebarMenuItem>
                   )}
                   {canManageMentors && (
                     <SidebarMenuItem>
                        <Link href="/dashboard/mentors">
                          <SidebarMenuButton>
                            <BrainCircuit className="text-primary" />
                            Mentores de IA
                          </SidebarMenuButton>
                        </Link>
                     </SidebarMenuItem>
                   )}
              </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="hover:bg-destructive/20 text-red-500"
              >
                <LogOut />
                Sair
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
