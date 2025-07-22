// src/app/inicio/page.tsx
"use client";

import Link from "next/link";
import {
  Briefcase,
  Users,
  ListTodo,
  Shield,
  UserSquare,
  CheckSquare,
  Calendar,
  BrainCircuit,
  LayoutDashboard,
  LucideIcon
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

type QuickAccessPage = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  requiredPermission: string | null;
  requiresLeader?: boolean;
};

const quickAccessPages: QuickAccessPage[] = [
  {
    title: "Central de Tarefas",
    description: "Sua visão diária de tarefas e eventos.",
    href: "/central",
    icon: LayoutDashboard,
    requiredPermission: null,
  },
  {
    title: "Painel de Tarefas",
    description: "Gerencie o fluxo de trabalho da sua equipe.",
    href: "/tasks",
    icon: ListTodo,
    requiredPermission: "manage_tasks",
  },
  {
    title: "Gerenciar Clientes",
    description: "Visualize, adicione e edite os clientes.",
    href: "/clients",
    icon: Briefcase,
    requiredPermission: "manage_clients",
  },
  {
    title: "Calendário de Gravações",
    description: "Visualize e agende as gravações e eventos.",
    href: "/calendar",
    icon: Calendar,
    requiredPermission: "manage_calendar",
  },
  {
    title: "Mentores de IA",
    description: "Converse e aprenda com especialistas virtuais.",
    href: "/mentors",
    icon: BrainCircuit,
    requiredPermission: "manage_mentors",
  },
  {
    title: "Aprovações Pendentes",
    description: "Reveja as tarefas submetidas pela sua equipe.",
    href: "/approvals",
    icon: CheckSquare,
    requiredPermission: null,
    requiresLeader: true,
  },
  {
    title: "Gerenciar Funcionários",
    description: "Adicione, edite e remova funcionários.",
    href: "/employees",
    icon: Users,
    requiredPermission: "manage_employees",
  },
  {
    title: "Gerenciar Cargos",
    description: "Defina os cargos e suas permissões no sistema.",
    href: "/roles",
    icon: Shield,
    requiredPermission: "manage_roles",
  },
  {
    title: "Gerenciar Equipes",
    description: "Crie e organize as equipes de trabalho.",
    href: "/teams",
    icon: UserSquare,
    requiredPermission: "manage_teams",
  },
];


export default function InicioPage() {
  const { userData } = useAuth();
  
  const availablePages = quickAccessPages.filter(page => {
    if (page.requiresLeader) {
        return userData?.isLeader;
    }
    if (!page.requiredPermission) {
      return true; // Visible to all
    }
    return userData?.permissions?.includes(page.requiredPermission);
  });

  return (
    <main className="p-4 md:p-6">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Acesso Rápido</h1>
            <p className="text-muted-foreground">
                Navegue para as principais áreas da plataforma.
            </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availablePages.map((page) => (
                <Link href={page.href} key={page.href} className="block">
                    <Card className="h-full hover:bg-accent hover:text-accent-foreground transition-colors">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <page.icon className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle>{page.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>{page.description}</CardDescription>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </main>
  );
}