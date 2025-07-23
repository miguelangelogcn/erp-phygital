// src/app/reports/page.tsx
"use client";

import Link from "next/link";
import { LineChart, LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReportPage = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const availableReports: ReportPage[] = [
  {
    title: "Relatórios de Tráfego",
    description: "Analise o desempenho das campanhas de anúncios da Meta para os seus clientes.",
    href: "/reports/traffic",
    icon: LineChart,
  },
];

export default function ReportsPage() {
  return (
    <main className="p-4 md:p-6">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Central de Relatórios</h1>
            <p className="text-muted-foreground">
                Selecione um relatório para visualizar os dados.
            </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableReports.map((page) => (
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