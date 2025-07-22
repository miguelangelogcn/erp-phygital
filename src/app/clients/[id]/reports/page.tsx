// src/app/clients/[id]/reports/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import type { MetaCampaign } from '@/types/metaCampaign';
import { getMetaCampaigns } from '@/lib/firebase/services/metaReports';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function ClientReportsPage() {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const clientId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!clientId) return;

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const campaignsData = await getMetaCampaigns(clientId);
        setCampaigns(campaignsData);
      } catch (err: any) {
        setError('Falha ao buscar dados das campanhas.');
        toast({
            variant: 'destructive',
            title: 'Erro ao buscar relatórios',
            description: err.message,
        })
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [clientId, toast]);

  const chartData = campaigns.map(c => ({
      name: c.name.substring(0, 15) + (c.name.length > 15 ? '...' : ''), // Shorten name for chart
      spend: c.spend,
  }));
  
  const chartConfig = {
    spend: {
      label: 'Gasto (R$)',
      color: 'hsl(var(--chart-1))',
    },
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-destructive py-10 flex flex-col items-center gap-2">
          <AlertCircle />
          <p>{error}</p>
        </div>
      );
    }
    
    if (campaigns.length === 0) {
        return (
             <div className="text-center text-muted-foreground py-10">
                <p>Nenhuma campanha sincronizada encontrada para este cliente.</p>
                <p className="text-sm mt-2">Aguarde a próxima sincronização automática ou verifique a integração.</p>
            </div>
        )
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral do Gasto</CardTitle>
            <CardDescription>Gasto total por campanha no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                    cursor={false}
                    content={<ChartTooltipContent 
                        formatter={(value) => formatCurrency(value as number)}
                        hideLabel 
                    />} 
                />
                <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes das Campanhas</CardTitle>
            <CardDescription>
              Uma lista detalhada de todas as campanhas sincronizadas da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell><Badge variant={campaign.status === 'ACTIVE' ? 'secondary' : 'outline'}>{campaign.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                      <TableCell className="text-right">{campaign.impressions.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{campaign.clicks.toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };


  return (
    <main className="p-4 md:p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Relatórios da Meta</h1>
        <Button variant="outline" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Cliente
          </Link>
        </Button>
      </div>
      {renderContent()}
    </main>
  );
}
