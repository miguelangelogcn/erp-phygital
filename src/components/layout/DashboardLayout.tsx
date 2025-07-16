
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
import { Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayoutComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData } = useAuth();
  // const canManageEmployees = userData?.permissions?.includes("manage_employees");

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
                {/* {canManageEmployees && ( */}
                  <SidebarMenuItem>
                    <Link href="/dashboard/employees">
                      <SidebarMenuButton>
                        <Users />
                        Gerenciar Funcionários
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                {/* )} */}
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>OPERAÇÕES</SidebarGroupLabel>
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
