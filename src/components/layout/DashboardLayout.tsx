// src/components/layout/DashboardLayout.tsx
"use client";

import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Briefcase, Users, ListTodo, Shield, UserSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayoutComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData } = useAuth();
  const canManageEmployees = userData?.permissions?.includes("manage_employees");
  const canManageRoles = userData?.permissions?.includes("manage_roles");
  const canManageTeams = userData?.permissions?.includes("manage_teams");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <SidebarTrigger />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarGroup>
                <SidebarGroupLabel>GESTÃO</SidebarGroupLabel>
                {canManageEmployees && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/employees">
                      <SidebarMenuButton>
                        <Users />
                        Gerenciar Funcionários
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )}
                {canManageRoles && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/roles">
                      <SidebarMenuButton>
                        <Shield />
                        Gerenciar Cargos
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )}
                 {canManageTeams && (
                  <SidebarMenuItem>
                    <Link href="/dashboard/teams">
                      <SidebarMenuButton>
                        <UserSquare />
                        Gerenciar Equipas
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
                        <Briefcase />
                        Gerenciar Clientes
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/dashboard/tasks">
                      <SidebarMenuButton>
                        <ListTodo />
                        Painel de Tarefas
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
              </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
