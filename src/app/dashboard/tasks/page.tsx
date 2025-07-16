// src/app/dashboard/tasks/page.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TasksPage() {
  return (
    <main className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Painel de Tarefas</h1>
        <p className="text-muted-foreground">
          Gerencie o fluxo de trabalho da sua equipe.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna A Fazer */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>A Fazer</CardTitle>
            <CardDescription>Tarefas aguardando início.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 p-4 bg-muted/50 rounded-b-lg">
            {/* As tarefas serão renderizadas aqui */}
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma tarefa nesta coluna.
            </div>
          </CardContent>
        </Card>

        {/* Coluna Fazendo */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Fazendo</CardTitle>
            <CardDescription>Tarefas em andamento.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 p-4 bg-muted/50 rounded-b-lg">
            {/* As tarefas serão renderizadas aqui */}
             <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma tarefa nesta coluna.
            </div>
          </CardContent>
        </Card>

        {/* Coluna Feito */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Feito</CardTitle>
            <CardDescription>Tarefas concluídas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 p-4 bg-muted/50 rounded-b-lg">
            {/* As tarefas serão renderizadas aqui */}
             <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma tarefa nesta coluna.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
