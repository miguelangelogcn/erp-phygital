"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Bem-vindo ao seu painel!</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Selecione uma opção no menu para começar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
