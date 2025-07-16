// src/app/dashboard/clients/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getClientById } from "@/lib/firebase/services/clients";
import type { Client } from "@/types/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Briefcase, DollarSign, Edit, KeyRound, Megaphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClientDetailPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!id) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
        } else {
          setError("Cliente não encontrado.");
        }
      } catch (err) {
        setError("Falha ao buscar dados do cliente.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-10">{error}</div>;
  }

  if (!client) {
    return <div className="text-center py-10">Nenhum cliente para exibir.</div>;
  }

  return (
    <main className="p-4 md:p-6">
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Clientes
          </Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  {client.logoUrl && (
                      <img src={client.logoUrl} alt={`${client.name} logo`} className="h-16 w-16 rounded-full object-cover border" />
                  )}
                  <div>
                      <CardTitle className="text-3xl">{client.name}</CardTitle>
                      <CardDescription>ID: {client.id}</CardDescription>
                  </div>
              </div>
              {/* Add edit button later */}
          </div>
        </CardHeader>
        <CardContent>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><Briefcase className="mr-2"/> Detalhes do Contrato</h3>
                    <div className="flex items-center">
                        <DollarSign className="mr-2 text-muted-foreground" />
                        <span className="font-medium">Orçamento:</span>
                        <span className="ml-2 text-muted-foreground">R$ {client.budget.toFixed(2)}</span>
                    </div>
                    <div>
                        <p className="font-medium mb-2">Serviços Contratados:</p>
                        <div className="flex flex-wrap gap-2">
                            {client.services.length > 0 ? (
                                client.services.map((service) => (
                                    <Badge key={service} variant="secondary">{service}</Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum serviço listado.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><Edit className="mr-2"/> Estratégia e Acessos</h3>
                     <div>
                        <p className="font-medium">Linha Editorial:</p>
                        <p className="text-sm text-muted-foreground">{client.editorialLine || "Não definida."}</p>
                    </div>
                    <div>
                        <p className="font-medium flex items-center"><Megaphone className="mr-2"/> ID da Conta de Anúncios Meta:</p>
                        <p className="text-sm text-muted-foreground">{client.metaAdsAccountId || "Não informado."}</p>
                    </div>
                     <div>
                        <p className="font-medium flex items-center"><KeyRound className="mr-2"/> Credenciais:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.credentials || "Não informadas."}</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}