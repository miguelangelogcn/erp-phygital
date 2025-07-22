// src/components/layout/DashboardLayout.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { Briefcase, Users, ListTodo, Shield, UserSquare, CheckSquare, Calendar, LogOut, BrainCircuit, LayoutDashboard, Home } from "lucide-react";
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
  const pathname = usePathname();
  const { toast } = useToast();

  const canManageEmployees = userData?.permissions?.includes("manage_employees");
  const canManageRoles = userData?.permissions?.includes("manage_roles");
  const canManageTeams = userData?.permissions?.includes("manage_teams");
  const canManageCalendar = userData?.permissions?.includes("manage_calendar");
  const canManageClients = userData?.permissions?.includes("manage_clients");
  const canManageTasks = userData?.permissions?.includes("manage_tasks");
  const canManageMentors = userData?.permissions?.includes("manage_mentors");
  const isLeader = userData?.isLeader || false;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message || "Não foi possível completar o logout.",
      });
    }
  };

  const menuItems = [
      { href: "/inicio", icon: Home, label: "Início", show: true },
      { href: "/central", icon: LayoutDashboard, label: "Central de Tarefas", show: true },
      { href: "/tasks", icon: ListTodo, label: "Painel de Tarefas", show: canManageTasks },
      { href: "/clients", icon: Briefcase, label: "Gerenciar Clientes", show: canManageClients },
      { href: "/calendar", icon: Calendar, label: "Calendário de Gravações", show: canManageCalendar },
      { href: "/mentors", icon: BrainCircuit, label: "Mentores de IA", show: canManageMentors },
      { href: "/approvals", icon: CheckSquare, label: "Aprovações Pendentes", show: isLeader },
  ];

  const adminMenuItems = [
      { href: "/employees", icon: Users, label: "Gerenciar Funcionários", show: canManageEmployees },
      { href: "/roles", icon: Shield, label: "Gerenciar Cargos", show: canManageRoles },
      { href: "/teams", icon: UserSquare, label: "Gerenciar Equipes", show: canManageTeams },
  ];

  // Don't render the layout on the login page
  if (pathname === '/login') {
    return <>{children}</>;
  }


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
                <SidebarGroupLabel>OPERAÇÕES</SidebarGroupLabel>
                 {menuItems.map(item => item.show && (
                    <SidebarMenuItem key={item.href}>
                        <Link href={item.href}>
                            <SidebarMenuButton isActive={pathname.startsWith(item.href)}
>
                                <item.icon className="text-primary" />
                                {item.label}
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                 ))}
              </SidebarGroup>

              {(canManageEmployees || canManageRoles || canManageTeams) && (
                 <SidebarGroup>
                    <SidebarGroupLabel>GESTÃO</SidebarGroupLabel>
                    {adminMenuItems.map(item => item.show && (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href}>
                                <SidebarMenuButton isActive={pathname.startsWith(item.href)}
>
                                    <item.icon className="text-primary" />
                                    {item.label}
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                 </SidebarGroup>
              )}
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
