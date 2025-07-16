// src/app/dashboard/clients/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getClients } from "@/lib/firebase/services/clients";
import type { Client } from "@/types/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const clientsData = await getClients();
        setClients(clientsData);
        setError(null);
      } catch (err) {
        setError("Falha ao buscar clientes. Tente novamente mais tarde.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <main className="p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Gerenciar Clientes</CardTitle>
                <CardDescription>
                Visualize, adicione, edite e exclua os clientes.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2" />
                Cadastrar Novo Cliente
            </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <Card key={client.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Mais detalhes do cliente aqui...</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p>Nenhum cliente encontrado.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}