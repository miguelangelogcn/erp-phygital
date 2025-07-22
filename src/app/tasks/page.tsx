// src/app/dashboard/tasks/page.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PontualTasks from "@/components/tasks/PontualTasks";
import RecurringTasks from "@/components/tasks/RecurringTasks";
import CentralTasks from "@/components/tasks/CentralTasks";

export default function TasksPage() {
  return (
    <main className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Painel de Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie o fluxo de trabalho da sua equipe.
          </p>
        </div>
      </div>

      <Tabs defaultValue="central">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="central">Central</TabsTrigger>
          <TabsTrigger value="pontual">Tarefas Pontuais</TabsTrigger>
          <TabsTrigger value="recorrente">Tarefas Recorrentes</TabsTrigger>
        </TabsList>
        <TabsContent value="central" className="mt-6">
            <CentralTasks />
        </TabsContent>
        <TabsContent value="pontual" className="mt-6">
          <PontualTasks />
        </TabsContent>
        <TabsContent value="recorrente" className="mt-6">
          <RecurringTasks />
        </TabsContent>
      </Tabs>
    </main>
  );
}
