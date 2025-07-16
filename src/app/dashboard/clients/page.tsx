// src/app/dashboard/clients/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClients, addClient } from "@/lib/firebase/services/clients";
import type { Client, NewClient } from "@/types/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsData = await getClients();
      setClients(clientsData);
      setError(null);
    } catch (err) {
      setError("Falha ao buscar clientes. Tente novamente mais tarde.");
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao buscar clientes",
        description: "Ocorreu um erro ao carregar a lista de clientes.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    // Convert services from textarea to string array
    const servicesString = formData.get('services') as string;

    const newClientData: NewClient = {
      name: formData.get('name') as string,
      logoUrl: formData.get('logoUrl') as string,
      editorialLine: formData.get('editorialLine') as string,
      budget: parseFloat(formData.get('budget') as string) || 0,
      services: servicesString.split(',').map(s => s.trim()).filter(s => s),
      credentials: formData.get('credentials') as string,
      metaAdsAccountId: formData.get('metaAdsAccountId') as string,
    };

    try {
      await addClient(newClientData);
      toast({
        title: "Sucesso!",
        description: "Novo cliente cadastrado com sucesso.",
      });
      setIsModalOpen(false);
      await fetchClients();
    } catch (err) {
      console.error("Erro ao adicionar cliente:", err);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: "Ocorreu um erro ao tentar salvar o novo cliente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2" />
                        Cadastrar Novo Cliente
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para adicionar um novo cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} id="add-client-form">
                        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nome</Label>
                                <Input id="name" name="name" placeholder="Nome do Cliente" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="logoUrl" className="text-right">URL do Logo</Label>
                                <Input id="logoUrl" name="logoUrl" placeholder="https://example.com/logo.png" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="editorialLine" className="text-right">Linha Editorial</Label>
                                <Textarea id="editorialLine" name="editorialLine" placeholder="Tom de voz, temas, etc." className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="budget" className="text-right">Orçamento</Label>
                                <Input id="budget" name="budget" type="number" step="0.01" placeholder="0.00" className="col-span-3" required/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="services" className="text-right">Serviços</Label>
                                <Textarea id="services" name="services" placeholder="Serviço 1, Serviço 2, ..." className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="credentials" className="text-right">Credenciais</Label>
                                <Textarea id="credentials" name="credentials" placeholder="Acessos e senhas importantes" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="metaAdsAccountId" className="text-right">ID Anúncios Meta</Label>
                                <Input id="metaAdsAccountId" name="metaAdsAccountId" placeholder="ID da conta de anúncios" className="col-span-3" />
                            </div>
                        </div>
                    </form>
                     <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="add-client-form" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                  <Link href={`/dashboard/clients/${client.id}`} key={client.id} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Orçamento: R$ {client.budget.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground truncate">Serviços: {client.services.join(', ')}</p>
                      </CardContent>
                    </Card>
                  </Link>
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