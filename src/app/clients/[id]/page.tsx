// src/app/dashboard/clients/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClientById, deleteClient } from "@/lib/firebase/services/clients";
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
import { Loader2, ArrowLeft, Briefcase, DollarSign, Edit, KeyRound, Megaphone, Trash2, Facebook, LineChart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


export default function ClientDetailPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
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
  
  const handleDeleteClick = () => {
    setIsAlertOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
        await deleteClient(id);
        toast({
            title: "Sucesso!",
            description: "O cliente foi excluído com sucesso."
        });
        router.push("/clients");
    } catch (err: any) {
        toast({
            variant: "destructive",
            title: "Erro ao excluir",
            description: err.message || "Não foi possível excluir o cliente."
        });
    } finally {
        setIsDeleting(false);
        setIsAlertOpen(false);
    }
  }

  const handleLinkFacebookAccount = () => {
    if (!id) return;
    const functionUrl = `https://southamerica-east1-phygital-login.cloudfunctions.net/startMetaAuth?clientId=${id}`;
    window.open(functionUrl, 'metaAuthPopup', 'width=600,height=700');
  };


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
    <>
    <main className="p-4 md:p-6">
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Clientes
          </Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                  {client.logoUrl && (
                      <img src={client.logoUrl} alt={`${client.name} logo`} className="h-16 w-16 rounded-full object-cover border" />
                  )}
                  <div>
                      <CardTitle className="text-3xl">{client.name}</CardTitle>
                      <CardDescription>ID: {client.id}</CardDescription>
                  </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                    <Link href={`/clients/${id}/reports`}>
                        <LineChart className="h-4 w-4" />
                        <span className="sr-only">Ver Relatórios</span>
                    </Link>
                </Button>
                <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar Cliente</span>
                </Button>
                 <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
                    <Trash2 className="h-4 w-4" />
                     <span className="sr-only">Excluir Cliente</span>
                </Button>
              </div>
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
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center"><Edit className="mr-2"/> Estratégia e Acessos</h3>
                       <Button 
                         variant="outline"
                         onClick={handleLinkFacebookAccount}
                       >
                         <Facebook className="mr-2 h-4 w-4" />
                         Vincular Conta do Facebook
                       </Button>
                    </div>
                     <div>
                        <p className="font-medium">Linha Editorial:</p>
                        <p className="text-sm text-muted-foreground">{client.editorialLine || "Não definida."}</p>
                    </div>
                    <div>
                        <p className="font-medium flex items-center"><Megaphone className="mr-2"/> ID da Conta de Anúncios Meta:</p>
                        <p className="text-sm text-muted-foreground">{client.metaIntegration?.adAccountId || client.metaAdsAccountId || "Não informado."}</p>
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

     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá excluir o cliente
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
